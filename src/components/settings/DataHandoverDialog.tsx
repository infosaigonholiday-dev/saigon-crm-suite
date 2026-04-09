import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, Users, UserCheck } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: { id: string; full_name: string; department_id: string | null } | null;
  onComplete: () => void;
}

export function DataHandoverDialog({ open, onOpenChange, profile, onComplete }: Props) {
  const [newUserId, setNewUserId] = useState("");
  const [reason, setReason] = useState("Nghỉ việc");
  const [processing, setProcessing] = useState(false);

  // Count leads & customers assigned to this user
  const { data: counts } = useQuery({
    queryKey: ["handover-counts", profile?.id],
    queryFn: async () => {
      const [leadsRes, customersRes] = await Promise.all([
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("assigned_to", profile!.id),
        supabase.from("customers").select("id", { count: "exact", head: true }).eq("assigned_sale_id", profile!.id),
      ]);
      return {
        leads: leadsRes.count ?? 0,
        customers: customersRes.count ?? 0,
      };
    },
    enabled: !!profile?.id && open,
  });

  // Get eligible receivers (same department, active, not the person being deactivated)
  const { data: receivers = [] } = useQuery({
    queryKey: ["handover-receivers", profile?.department_id],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("is_active", true)
        .neq("id", profile!.id)
        .order("full_name");
      if (profile?.department_id) {
        query = query.eq("department_id", profile.department_id);
      }
      const { data } = await query;
      return data || [];
    },
    enabled: !!profile?.id && open,
  });

  useEffect(() => {
    if (!open) {
      setNewUserId("");
      setReason("Nghỉ việc");
    }
  }, [open]);

  async function handleHandover() {
    if (!profile || !newUserId) {
      toast.error("Vui lòng chọn người nhận bàn giao");
      return;
    }
    setProcessing(true);
    try {
      // 1. Reassign leads
      if (counts && counts.leads > 0) {
        const { error } = await supabase
          .from("leads")
          .update({ assigned_to: newUserId })
          .eq("assigned_to", profile.id);
        if (error) throw error;
      }

      // 2. Reassign customers
      if (counts && counts.customers > 0) {
        const { error } = await supabase
          .from("customers")
          .update({ assigned_sale_id: newUserId })
          .eq("assigned_sale_id", profile.id);
        if (error) throw error;
      }

      // 3. Deactivate via edge function
      const { data, error } = await supabase.functions.invoke("manage-employee-accounts", {
        body: { action: "deactivate", user_id: profile.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // 4. Set deactivation metadata
      await supabase
        .from("profiles")
        .update({
          deactivated_at: new Date().toISOString(),
          deactivated_reason: reason,
        } as any)
        .eq("id", profile.id);

      const receiver = receivers.find(r => r.id === newUserId);
      toast.success(
        `Đã bàn giao ${counts?.leads ?? 0} leads, ${counts?.customers ?? 0} KH cho ${receiver?.full_name ?? "NV mới"} và vô hiệu hóa tài khoản`
      );
      onOpenChange(false);
      onComplete();
    } catch (err: any) {
      toast.error(err.message || "Lỗi bàn giao");
    } finally {
      setProcessing(false);
    }
  }

  const totalData = (counts?.leads ?? 0) + (counts?.customers ?? 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Bàn giao & Vô hiệu hóa
          </DialogTitle>
          <DialogDescription>
            Chuyển toàn bộ data của <strong>{profile?.full_name}</strong> cho NV khác trước khi vô hiệu hóa tài khoản.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Data summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="border rounded-lg p-3 text-center">
              <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-2xl font-bold">{counts?.leads ?? "..."}</p>
              <p className="text-xs text-muted-foreground">Leads</p>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <UserCheck className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-2xl font-bold">{counts?.customers ?? "..."}</p>
              <p className="text-xs text-muted-foreground">Khách hàng</p>
            </div>
          </div>

          {totalData > 0 && (
            <>
              <div className="space-y-2">
                <Label>Người nhận bàn giao *</Label>
                <Select value={newUserId} onValueChange={setNewUserId}>
                  <SelectTrigger><SelectValue placeholder="Chọn NV nhận data" /></SelectTrigger>
                  <SelectContent>
                    {receivers.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.full_name} <span className="text-muted-foreground">({r.role})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Lý do</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Lý do vô hiệu hóa" />
          </div>

          {totalData === 0 && (
            <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
              NV này không có data leads/KH cần bàn giao. Chỉ vô hiệu hóa tài khoản.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button
            variant="destructive"
            onClick={handleHandover}
            disabled={processing || (totalData > 0 && !newUserId)}
          >
            {processing && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            {totalData > 0 ? "Bàn giao & Vô hiệu hóa" : "Vô hiệu hóa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
