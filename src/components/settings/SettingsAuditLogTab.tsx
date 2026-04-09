import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Eye, History, Download } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

const TABLE_LABELS: Record<string, string> = {
  bookings: "Đặt tour", customers: "Khách hàng", leads: "Tiềm năng",
  employees: "Nhân sự", transactions: "Giao dịch", tour_services: "Dịch vụ tour",
  office_expenses: "CP Văn phòng", marketing_expenses: "CP Marketing",
  other_expenses: "CP Khác", booking_itineraries: "Lịch trình", vendors: "Nhà cung cấp",
};

const ACTION_BADGES: Record<string, { label: string; class: string }> = {
  CREATE: { label: "Tạo mới", class: "bg-green-100 text-green-800 border-green-300" },
  UPDATE: { label: "Cập nhật", class: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  DELETE: { label: "Xóa", class: "bg-red-100 text-red-800 border-red-300" },
  STATUS_CHANGE: { label: "Đổi TT", class: "bg-purple-100 text-purple-800 border-purple-300" },
  REASSIGN: { label: "Chuyển NV", class: "bg-orange-100 text-orange-800 border-orange-300" },
  RESTORE: { label: "Khôi phục", class: "bg-blue-100 text-blue-800 border-blue-300" },
};

export function SettingsAuditLogTab() {
  const [tableFilter, setTableFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [detailLog, setDetailLog] = useState<any>(null);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-logs-full", tableFilter, actionFilter],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("*, profiles:user_id(full_name, email)")
        .order("created_at", { ascending: false })
        .limit(500);

      if (tableFilter !== "all") query = query.eq("table_name", tableFilter);
      if (actionFilter !== "all") query = query.eq("action", actionFilter);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const filteredLogs = searchTerm
    ? logs.filter((l: any) => {
        const summary = (l.change_summary || "").toLowerCase();
        const name = ((l.profiles as any)?.full_name || "").toLowerCase();
        const oldName = (l.old_data?.full_name || "").toLowerCase();
        const newName = (l.new_data?.full_name || "").toLowerCase();
        const term = searchTerm.toLowerCase();
        return summary.includes(term) || name.includes(term) || oldName.includes(term) || newName.includes(term);
      })
    : logs;

  function exportCSV() {
    const headers = ["Thời gian", "Người thực hiện", "Bảng", "Hành động", "Tóm tắt"];
    const rows = filteredLogs.map((l: any) => [
      l.created_at ? format(new Date(l.created_at), "dd/MM/yyyy HH:mm") : "",
      (l.profiles as any)?.full_name || l.user_full_name || "",
      TABLE_LABELS[l.table_name] || l.table_name || "",
      ACTION_BADGES[l.action]?.label || l.action,
      l.change_summary || "",
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${format(new Date(), "yyyyMMdd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function getRecordSummary(log: any): string {
    if (log.change_summary) return log.change_summary;
    const d = log.old_data || log.new_data;
    if (!d) return "—";
    return d.full_name || d.code || d.name || (log.record_id?.substring(0, 8) ?? "—");
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Nhật ký thay đổi hệ thống
        </h2>
        <p className="text-sm text-muted-foreground">
          Theo dõi mọi thao tác tạo, sửa, xóa trên hệ thống.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={tableFilter} onValueChange={setTableFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả bảng</SelectItem>
            {Object.entries(TABLE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả hành động</SelectItem>
            {Object.entries(ACTION_BADGES).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="Tìm theo tên KH/Lead/NV..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-[220px]"
        />

        <Button variant="outline" size="sm" onClick={exportCSV} className="ml-auto">
          <Download className="h-4 w-4 mr-1" /> Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Lịch sử ({filteredLogs.length} bản ghi)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filteredLogs.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Chưa có bản ghi nào</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Người thực hiện</TableHead>
                  <TableHead>Bảng</TableHead>
                  <TableHead>Hành động</TableHead>
                  <TableHead>Tóm tắt</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log: any) => {
                  const actionInfo = ACTION_BADGES[log.action] || { label: log.action, class: "" };
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {log.created_at ? format(new Date(log.created_at), "dd/MM HH:mm", { locale: vi }) : "—"}
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium text-sm">{log.user_full_name || (log.profiles as any)?.full_name || "—"}</span>
                          {log.user_role && <p className="text-xs text-muted-foreground">{log.user_role}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{TABLE_LABELS[log.table_name] || log.table_name}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={actionInfo.class}>{actionInfo.label}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[250px] truncate text-sm">
                        {getRecordSummary(log)}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setDetailLog(log)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detailLog} onOpenChange={(o) => { if (!o) setDetailLog(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              Chi tiết thay đổi
            </DialogTitle>
          </DialogHeader>
          {detailLog && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Bảng:</span>
                  <p className="font-medium">{TABLE_LABELS[detailLog.table_name] || detailLog.table_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Hành động:</span>
                  <p><Badge variant="outline" className={ACTION_BADGES[detailLog.action]?.class || ""}>
                    {ACTION_BADGES[detailLog.action]?.label || detailLog.action}
                  </Badge></p>
                </div>
                <div>
                  <span className="text-muted-foreground">Người thực hiện:</span>
                  <p className="font-medium">{detailLog.user_full_name || (detailLog.profiles as any)?.full_name || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Thời gian:</span>
                  <p className="font-medium">
                    {detailLog.created_at ? format(new Date(detailLog.created_at), "dd/MM/yyyy HH:mm:ss", { locale: vi }) : "—"}
                  </p>
                </div>
              </div>

              {detailLog.change_summary && (
                <div>
                  <span className="text-sm text-muted-foreground">Tóm tắt:</span>
                  <p className="text-sm font-medium">{detailLog.change_summary}</p>
                </div>
              )}

              {detailLog.changed_fields && detailLog.changed_fields.length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground">Trường đã thay đổi:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {detailLog.changed_fields.map((f: string) => (
                      <Badge key={f} variant="outline" className="text-xs">{f}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {detailLog.old_data && (
                <div>
                  <span className="text-sm text-muted-foreground">Dữ liệu cũ:</span>
                  <ScrollArea className="max-h-[25vh] mt-1">
                    <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(detailLog.old_data, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              )}

              {detailLog.new_data && (
                <div>
                  <span className="text-sm text-muted-foreground">Dữ liệu mới:</span>
                  <ScrollArea className="max-h-[25vh] mt-1">
                    <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(detailLog.new_data, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
