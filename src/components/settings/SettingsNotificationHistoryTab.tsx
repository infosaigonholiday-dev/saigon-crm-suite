import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, Send, RefreshCw, Bell, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const TYPE_LABELS: Record<string, string> = {
  TEST_PUSH: "🧪 Test Push",
  FOLLOW_UP: "📞 Follow-up",
  FOLLOW_UP_OVERDUE: "🔴 Quá hạn FU",
  LEAD_ASSIGNED: "📌 Giao Lead",
  LEAD_WON: "🎉 Chốt tour",
  LEAD_FORGOTTEN: "⚠️ Lead bỏ quên",
  LEAD_NO_SCHEDULE: "📅 Chưa lịch hẹn",
  PAYMENT_RECEIVED: "💰 Đã thu",
  PAYMENT_DUE: "💰 Đến hạn",
  BIRTHDAY: "🎂 Sinh nhật",
  COMPANY_ANNIVERSARY: "🏢 KN thành lập",
  TRAVEL_DATE_NEAR: "✈️ Sắp đi tour",
  BOOKING_DEPARTURE_NEAR: "✈️ Tour khởi hành",
  CONTRACT_APPROVAL_OVERDUE: "📄 HĐ chờ duyệt",
  DAILY_DIGEST: "📋 Việc hôm nay",
  KPI_ACHIEVEMENT: "🏆 Đạt KPI",
  BROADCAST: "📢 Broadcast",
  LEAVE_REQUEST_NEW: "📋 Đơn nghỉ mới",
  LEAVE_REQUEST_RESULT: "📋 KQ đơn nghỉ",
  TRANSACTION_APPROVAL: "💼 Chi phí cần duyệt",
  TRANSACTION_APPROVED: "✅ Chi phí duyệt",
  TRANSACTION_REJECTED: "❌ Chi phí từ chối",
  budget_settlement_pending: "📑 Quyết toán chờ",
  BUDGET_SETTLEMENT_CLOSED: "🔒 QT đã đóng",
  BUDGET_SETTLEMENT_REJECTED: "❌ QT từ chối",
  MENTION: "💬 Được nhắc tên",
};

export function SettingsNotificationHistoryTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sending, setSending] = useState(false);

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ["notification-history", typeFilter, search],
    queryFn: async () => {
      let q = supabase
        .from("notifications")
        .select(
          "id, type, title, message, user_id, is_read, created_at, read_at, priority, entity_type, profiles!notifications_user_id_fkey(full_name, email)"
        )
        .order("created_at", { ascending: false })
        .limit(50);
      if (typeFilter !== "all") q = q.eq("type", typeFilter);
      if (search.trim()) q = q.or(`title.ilike.%${search}%,message.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const distinctTypes = Array.from(new Set(rows.map((r: any) => r.type))).filter(Boolean) as string[];

  const handleTestPush = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.rpc("rpc_send_test_push");
      if (error) {
        toast.error(`Lỗi RPC: ${error.message}`);
        return;
      }
      const queued = data as any;
      if (!queued?.ok) {
        toast.error(`❌ Không gửi được: ${queued?.stage || queued?.error}`, {
          description: queued?.hint,
          duration: 10000,
        });
        return;
      }
      toast.success("✅ Đã gửi push test — kiểm tra thông báo trên thiết bị", {
        description: `Request ID: ${queued.request_id}. Bảng sẽ tự refresh sau 2s.`,
        duration: 8000,
      });
      setTimeout(() => qc.invalidateQueries({ queryKey: ["notification-history"] }), 2000);
    } catch (e: any) {
      toast.error(`Lỗi: ${e?.message || String(e)}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Lịch sử thông báo</CardTitle>
              <Badge variant="secondary" className="text-xs">50 gần nhất</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
                Tải lại
              </Button>
              <Button size="sm" onClick={handleTestPush} disabled={sending}>
                {sending ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                )}
                Gửi thông báo test
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Input
              placeholder="Tìm theo tiêu đề hoặc nội dung..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs h-8 text-sm"
            />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-56 h-8 text-sm">
                <SelectValue placeholder="Lọc theo loại" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả loại</SelectItem>
                {distinctTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TYPE_LABELS[t] || t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">Loại</TableHead>
                  <TableHead>Tiêu đề / Nội dung</TableHead>
                  <TableHead className="w-[180px]">Người nhận</TableHead>
                  <TableHead className="w-[140px]">Thời gian gửi</TableHead>
                  <TableHead className="w-[110px]">Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">
                      Chưa có thông báo nào
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((r: any) => {
                  const typeLabel = TYPE_LABELS[r.type] || r.type;
                  const recipient =
                    r.profiles?.full_name || r.profiles?.email || "—";
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-[10px] whitespace-nowrap">
                            {typeLabel}
                          </Badge>
                          {(r.priority === "high" || r.priority === "critical") && (
                            <Badge variant="destructive" className="text-[10px]">
                              {r.priority === "critical" ? "Khẩn" : "Cao"}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5 max-w-md">
                          <p className="text-sm font-medium truncate">{r.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{r.message}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{recipient}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {format(new Date(r.created_at), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        {r.is_read ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-blue-50 text-blue-700 border-blue-300"
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Đã đọc
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            <Circle className="h-3 w-3 mr-1" />
                            Chưa đọc
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Chỉ <strong>Quản trị viên</strong> và <strong>Quản trị tối cao</strong> có thể xem trang này.
            Dữ liệu được lọc tự động theo RLS — Sale/HR không nhìn thấy tab này.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
