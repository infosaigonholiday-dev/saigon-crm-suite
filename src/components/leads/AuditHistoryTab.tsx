import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";
import { useState } from "react";

interface Props {
  tableName: "leads" | "customers";
  recordId: string;
}

const ACTION_BADGES: Record<string, { label: string; class: string }> = {
  CREATE: { label: "Tạo mới", class: "bg-green-100 text-green-800 border-green-300" },
  UPDATE: { label: "Cập nhật", class: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  DELETE: { label: "Xóa", class: "bg-red-100 text-red-800 border-red-300" },
  STATUS_CHANGE: { label: "Đổi trạng thái", class: "bg-purple-100 text-purple-800 border-purple-300" },
  REASSIGN: { label: "Chuyển NV", class: "bg-orange-100 text-orange-800 border-orange-300" },
  RESTORE: { label: "Khôi phục", class: "bg-blue-100 text-blue-800 border-blue-300" },
};

const FIELD_LABELS: Record<string, string> = {
  full_name: "Họ tên",
  phone: "Điện thoại",
  email: "Email",
  company_name: "Công ty",
  company_address: "Địa chỉ CT",
  status: "Trạng thái",
  assigned_to: "Người phụ trách",
  assigned_sale_id: "Sale phụ trách",
  call_notes: "Ghi chú",
  temperature: "Mức độ",
  planned_travel_date: "Ngày đi",
  pax_count: "Số khách",
  budget: "Ngân sách",
  destination: "Điểm đến",
  follow_up_date: "Follow-up",
  lost_reason: "Lý do thất bại",
  channel: "Kênh",
  interest_type: "Loại quan tâm",
  expected_value: "Giá trị kỳ vọng",
  contact_person: "Người liên hệ",
  contact_position: "Chức vụ",
  tax_code: "MST",
  segment: "Phân khúc",
  notes: "Ghi chú",
  address: "Địa chỉ",
  is_blacklisted: "Blacklist",
  type: "Loại KH",
  tier: "Phân hạng",
};

const SENSITIVE_FIELDS = new Set(["phone", "email", "assigned_to", "assigned_sale_id", "is_blacklisted"]);

function formatValue(v: any): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Có" : "Không";
  return String(v);
}

export default function AuditHistoryTab({ tableName, recordId }: Props) {
  const { userRole } = useAuth();
  const queryClient = useQueryClient();
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-history", tableName, recordId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, action, user_full_name, user_role, change_summary, changed_fields, old_data, new_data, created_at")
        .eq("table_name", tableName)
        .eq("record_id", recordId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  async function handleRestore(log: any) {
    if (!log.old_data) return;
    setRestoringId(log.id);
    try {
      const restoreData = { ...log.old_data };
      delete restoreData.id;
      delete restoreData.created_at;

      const { error } = await supabase
        .from(tableName)
        .update(restoreData)
        .eq("id", recordId);
      if (error) throw error;
      toast.success("Đã khôi phục dữ liệu");
      queryClient.invalidateQueries({ queryKey: ["audit-history", tableName, recordId] });
    } catch (err: any) {
      toast.error(err.message || "Lỗi khôi phục");
    } finally {
      setRestoringId(null);
    }
  }

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (logs.length === 0) {
    return <p className="text-center py-8 text-muted-foreground">Chưa có lịch sử sửa đổi</p>;
  }

  return (
    <ScrollArea className="max-h-[60vh]">
      <div className="relative pl-6 space-y-0">
        {/* Vertical line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />

        {logs.map((log: any) => {
          const actionInfo = ACTION_BADGES[log.action] || { label: log.action, class: "bg-muted text-muted-foreground" };
          const changedFields: string[] = log.changed_fields || [];
          const oldData = log.old_data || {};
          const newData = log.new_data || {};

          return (
            <div key={log.id} className="relative pb-4">
              {/* Dot */}
              <div className="absolute -left-[13px] top-1.5 w-3 h-3 rounded-full border-2 border-background bg-primary" />

              <div className="bg-card border rounded-lg p-3 space-y-2">
                {/* Header */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={actionInfo.class}>
                      {actionInfo.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {log.created_at ? format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: vi }) : ""}
                    </span>
                  </div>
                  {isAdmin && log.action !== "CREATE" && log.old_data && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={restoringId === log.id}
                      onClick={() => handleRestore(log)}
                    >
                      {restoringId === log.id ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <RotateCcw className="h-3 w-3 mr-1" />
                      )}
                      Khôi phục
                    </Button>
                  )}
                </div>

                {/* User info */}
                <p className="text-sm">
                  <span className="font-medium">{log.user_full_name || "Hệ thống"}</span>
                  {log.user_role && (
                    <span className="text-xs text-muted-foreground ml-1">({log.user_role})</span>
                  )}
                </p>

                {/* Summary */}
                {log.change_summary && (
                  <p className="text-sm text-muted-foreground">{log.change_summary}</p>
                )}

                {/* Changed fields detail */}
                {changedFields.length > 0 && (
                  <div className="space-y-1 pt-1 border-t">
                    {changedFields.map((field) => {
                      const isSensitive = SENSITIVE_FIELDS.has(field);
                      return (
                        <div
                          key={field}
                          className={`text-xs flex flex-wrap gap-1 ${isSensitive ? "text-destructive font-medium" : "text-muted-foreground"}`}
                        >
                          <span className="font-medium">{FIELD_LABELS[field] || field}:</span>
                          <span className="line-through">{formatValue(oldData[field])}</span>
                          <span>→</span>
                          <span className="font-semibold">{formatValue(newData[field])}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
