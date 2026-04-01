import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Eye, Trash2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

const TABLE_LABELS: Record<string, string> = {
  bookings: "Đặt tour",
  customers: "Khách hàng",
  leads: "Tiềm năng",
  employees: "Nhân sự",
  transactions: "Giao dịch",
  tour_services: "Dịch vụ tour",
  office_expenses: "CP Văn phòng",
  marketing_expenses: "CP Marketing",
  other_expenses: "CP Khác",
  booking_itineraries: "Lịch trình",
  vendors: "Nhà cung cấp",
};

export function SettingsAuditLogTab() {
  const [tableFilter, setTableFilter] = useState("all");
  const [detailLog, setDetailLog] = useState<any>(null);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-logs", tableFilter],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("*, profiles:user_id(full_name, email)")
        .eq("action", "DELETE")
        .order("created_at", { ascending: false })
        .limit(200);

      if (tableFilter !== "all") {
        query = query.eq("table_name", tableFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  function getRecordSummary(log: any): string {
    const d = log.old_data;
    if (!d) return "—";
    if (d.full_name) return d.full_name;
    if (d.code) return d.code;
    if (d.description) return d.description.substring(0, 50);
    if (d.name) return d.name;
    return log.record_id?.substring(0, 8) || "—";
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Nhật ký xóa dữ liệu
        </h2>
        <p className="text-sm text-muted-foreground">
          Theo dõi mọi thao tác xóa trên hệ thống. Chỉ ADMIN/CEO xem được.
        </p>
      </div>

      <div className="flex gap-2">
        <Select value={tableFilter} onValueChange={setTableFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả bảng</SelectItem>
            {Object.entries(TABLE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-destructive" />
            Lịch sử xóa ({logs.length} bản ghi)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : logs.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Chưa có bản ghi xóa nào</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Người xóa</TableHead>
                  <TableHead>Bảng</TableHead>
                  <TableHead>Dữ liệu đã xóa</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {log.created_at ? format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: vi }) : "—"}
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium text-sm">{(log.profiles as any)?.full_name || "—"}</span>
                        <p className="text-xs text-muted-foreground">{(log.profiles as any)?.email || ""}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                        {TABLE_LABELS[log.table_name] || log.table_name}
                      </Badge>
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
                ))}
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
              <Trash2 className="h-4 w-4 text-destructive" />
              Chi tiết bản ghi đã xóa
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
                  <span className="text-muted-foreground">Thời gian:</span>
                  <p className="font-medium">
                    {detailLog.created_at ? format(new Date(detailLog.created_at), "dd/MM/yyyy HH:mm:ss", { locale: vi }) : "—"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Người xóa:</span>
                  <p className="font-medium">{(detailLog.profiles as any)?.full_name || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">ID bản ghi:</span>
                  <p className="font-mono text-xs">{detailLog.record_id}</p>
                </div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Dữ liệu đã xóa (JSON):</span>
                <ScrollArea className="max-h-[40vh] mt-1">
                  <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(detailLog.old_data, null, 2)}
                  </pre>
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
