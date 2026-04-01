import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import {
  PERMISSION_GROUPS, getDefaultPermissions, type PermissionKey,
} from "@/hooks/usePermissions";

interface Props {
  employee: { id: string; full_name: string; role: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type PermState = "default" | "granted" | "revoked";

const ACTION_LABELS: Record<string, string> = {
  view: "Xem", create: "Tạo", edit: "Sửa", delete: "Xóa", approve: "Duyệt",
};

export function PermissionEditDialog({ employee, open, onOpenChange }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [permStates, setPermStates] = useState<Record<PermissionKey, PermState>>({} as any);

  const defaults = new Set(getDefaultPermissions(employee.role));

  const { data: overrides, isLoading } = useQuery({
    queryKey: ["employee-permissions", employee.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("employee_permissions")
        .select("permission_key, granted")
        .eq("employee_id", employee.id);
      return data || [];
    },
    enabled: open,
  });

  useEffect(() => {
    if (!overrides) return;
    const states: Record<string, PermState> = {};
    for (const o of overrides) {
      states[o.permission_key] = o.granted ? "granted" : "revoked";
    }
    setPermStates(states as any);
  }, [overrides]);

  function getEffective(key: PermissionKey): boolean {
    const state = permStates[key];
    if (state === "granted") return true;
    if (state === "revoked") return false;
    return defaults.has(key);
  }

  function toggle(key: PermissionKey) {
    const isDefault = defaults.has(key);
    const current = permStates[key];

    setPermStates((prev) => {
      const next = { ...prev };
      if (!current) {
        // Currently at default → toggle to opposite
        next[key] = isDefault ? "revoked" : "granted";
      } else if (current === "granted" && !isDefault) {
        // Was custom-granted, remove override → back to default (off)
        delete next[key];
      } else if (current === "revoked" && isDefault) {
        // Was custom-revoked, remove override → back to default (on)
        delete next[key];
      } else {
        // Toggle the override
        next[key] = current === "granted" ? "revoked" : "granted";
      }
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      // Delete all existing overrides for this employee
      await supabase
        .from("employee_permissions")
        .delete()
        .eq("employee_id", employee.id);

      // Insert new overrides
      const inserts = Object.entries(permStates).map(([key, state]) => ({
        employee_id: employee.id,
        permission_key: key,
        granted: state === "granted",
        granted_by: user?.id,
      }));

      if (inserts.length > 0) {
        const { error } = await supabase
          .from("employee_permissions")
          .insert(inserts);
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ["employee-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["employee-permission-counts"] });
      toast.success("Đã lưu phân quyền");
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Lỗi: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Phân quyền: {employee.full_name}
            <Badge variant="outline">{employee.role}</Badge>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="max-h-[55vh] pr-4">
            <div className="space-y-6">
              {Object.entries(PERMISSION_GROUPS).map(([groupKey, group]) => (
                <div key={groupKey} className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">{group.label}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {group.keys.map((key) => {
                      const action = key.split(".")[1];
                      const isOn = getEffective(key);
                      const isOverride = !!permStates[key];
                      const isDefaultOn = defaults.has(key);
                      const isDelete = action === "delete";

                      return (
                        <label
                          key={key}
                          className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors ${
                            isDelete
                              ? isOn
                                ? "border-destructive/50 bg-destructive/10"
                                : "border-border"
                              : isOverride
                                ? isOn
                                  ? "border-emerald-500/40 bg-emerald-500/5"
                                  : "border-destructive/40 bg-destructive/5"
                                : "border-border"
                          }`}
                        >
                          <Checkbox
                            checked={isOn}
                            onCheckedChange={() => toggle(key)}
                          />
                          <span className={`text-sm ${isDelete ? "font-semibold text-destructive" : ""}`}>
                            {ACTION_LABELS[action] || action}
                          </span>
                          {isDelete && isOn && (
                            <Badge
                              variant="outline"
                              className="text-[10px] ml-auto bg-destructive/10 text-destructive border-destructive/30"
                            >
                              ⚠ Xóa
                            </Badge>
                          )}
                          {!isDelete && isOverride && (
                            <Badge
                              variant="outline"
                              className={`text-[10px] ml-auto ${
                                isOn ? "text-emerald-600" : "text-destructive"
                              }`}
                            >
                              {isOn ? "Thêm" : "Bỏ"}
                            </Badge>
                          )}
                          {!isOverride && !isDelete && isDefaultOn && (
                            <span className="text-[10px] text-muted-foreground ml-auto">mặc định</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
