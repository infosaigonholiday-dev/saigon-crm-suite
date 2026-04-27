import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useMyEmployeeId } from "@/hooks/useScopedQuery";
import { notifyUsersByRole } from "@/lib/notifyByRole";

const CHECKLIST_COLS = "id, item_name, is_required, is_completed";

export default function OnboardingChecklistModal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: myEmployeeId } = useMyEmployeeId(!!user);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const { data: items = [], isLoading, isError } = useQuery({
    queryKey: ["onboarding-checklist-me", myEmployeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("onboarding_checklist")
        .select(CHECKLIST_COLS)
        .eq("employee_id", myEmployeeId!)
        .eq("is_completed", false);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!myEmployeeId,
    staleTime: 60_000,
  });

  // Fallback timer: if loading takes > 10s, allow dismiss
  useEffect(() => {
    if (!isLoading) return;
    const t = setTimeout(() => setLoadFailed(true), 10_000);
    return () => clearTimeout(t);
  }, [isLoading]);

  if (!myEmployeeId || dismissed) return null;
  if (!isLoading && items.length === 0) return null;

  const requiredItems = items.filter((i: any) => i.is_required);
  const allRequiredChecked = requiredItems.every((i: any) => checked[i.id]);

  const submit = async () => {
    setSubmitting(true);
    const toUpdate = items.filter((i: any) => checked[i.id]);
    const now = new Date().toISOString();
    try {
      for (const item of toUpdate) {
        const { error } = await supabase
          .from("onboarding_checklist")
          .update({ is_completed: true, completed_at: now, completed_by: user!.id })
          .eq("id", item.id);
        if (error) throw error;
      }
      toast.success("Đã xác nhận hoàn thành onboarding");
      queryClient.invalidateQueries({ queryKey: ["onboarding-checklist-me"] });
    } catch (e: any) {
      toast.error("Lỗi", { description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => { /* không cho đóng tự ý */ }}>
      <DialogContent className="max-w-lg" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Hoàn tất onboarding</DialogTitle>
          <DialogDescription>
            Vui lòng xác nhận đã đọc và đồng ý các nội dung sau trước khi tiếp tục sử dụng hệ thống.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : isError ? (
          <p className="text-sm text-destructive">Không tải được danh sách. Vui lòng thử lại.</p>
        ) : (
          <div className="space-y-3 py-2">
            {items.map((item: any) => (
              <label key={item.id} className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={!!checked[item.id]}
                  onCheckedChange={(v) => setChecked((s) => ({ ...s, [item.id]: !!v }))}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.item_name}</p>
                  {item.is_required && <span className="text-xs text-destructive">Bắt buộc</span>}
                </div>
              </label>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          {(loadFailed || isError) && (
            <Button variant="ghost" size="sm" onClick={async () => {
              setDismissed(true);
              console.warn("[Onboarding] User dismissed after load failure");
              try {
                // Lookup employee name for the message
                const { data: emp } = await supabase
                  .from("employees")
                  .select("full_name")
                  .eq("id", myEmployeeId!)
                  .maybeSingle();
                await notifyUsersByRole(["HR_MANAGER", "HCNS"], {
                  type: "ONBOARDING_PENDING",
                  title: "⚠️ NV chưa hoàn thành onboarding",
                  message: `${emp?.full_name ?? "Một nhân viên"} đã bỏ qua checklist onboarding`,
                  entity_type: "employee",
                  entity_id: myEmployeeId!,
                  priority: "high",
                });
              } catch (e) {
                console.error("Notify onboarding skip failed:", e);
              }
            }}>
              Bỏ qua tạm
            </Button>
          )}
          <Button
            className="ml-auto"
            disabled={!allRequiredChecked || submitting || isLoading}
            onClick={submit}
          >
            {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Xác nhận đã đọc và đồng ý
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
