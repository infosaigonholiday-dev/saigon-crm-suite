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
import { Loader2, Send, RefreshCw, Bell, CheckCircle2, Circle, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

const PAGE_SIZE = 50;

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

type FilterPreset =
  | "all"
  | "unread"
  | "read"
  | "urgent_unread"
  | "need_action"
  | "overdue"
  | "read_unhandled";

const FILTER_LABELS: Record<FilterPreset, string> = {
  all: "Tất cả",
  unread: "Chưa đọc",
  read: "Đã đọc",
  urgent_unread: "🔴 Khẩn chưa đọc",
  need_action: "⏳ Cần xử lý",
  overdue: "⚠️ Quá hạn xử lý",
  read_unhandled: "👁️ Đã đọc nhưng chưa xử lý",
};

const PRIORITY_LABELS: Record<string, { label: string; cls: string }> = {
  low: { label: "Thấp", cls: "bg-gray-50 text-gray-600 border-gray-300" },
  medium: { label: "TB", cls: "bg-slate-50 text-slate-700 border-slate-300" },
  high: { label: "Cao", cls: "bg-orange-50 text-orange-700 border-orange-300" },
  critical: { label: "Khẩn", cls: "bg-red-50 text-red-700 border-red-300" },
};

const ACTION_STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Chờ xử lý", cls: "bg-amber-50 text-amber-700 border-amber-300" },
  in_progress: { label: "Đang xử lý", cls: "bg-blue-50 text-blue-700 border-blue-300" },
  completed: { label: "Đã xử lý", cls: "bg-green-50 text-green-700 border-green-300" },
  dismissed: { label: "Bỏ qua", cls: "bg-gray-50 text-gray-600 border-gray-300" },
  overdue: { label: "Quá hạn", cls: "bg-red-50 text-red-700 border-red-300" },
};

export function SettingsNotificationHistoryTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [preset, setPreset] = useState<FilterPreset>("all");
  const [page, setPage] = useState(0);
  const [sending, setSending] = useState(false);

  const { data: result, isLoading, refetch } = useQuery({
    queryKey: ["notification-history", typeFilter, preset, search, page],
    queryFn: async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let q = supabase
        .from("notifications")
        .select(
          "id, type, title, message, user_id, is_read, created_at, read_at, priority, entity_type, related_entity_type, related_entity_id, action_required, action_status, action_due_at, action_completed_at, profiles!notifications_user_id_fkey(full_name, email)",
          { count: "exact" }
        )
        .order("created_at", { ascending: false })
        .range(from, to);

      if (typeFilter !== "all") q = q.eq("type", typeFilter);

      switch (preset) {
        case "unread":
          q = q.eq("is_read", false);
          break;
        case "read":
          q = q.eq("is_read", true);
          break;
        case "urgent_unread":
          q = q.eq("is_read", false).in("priority", ["high", "critical"]);
          break;
        case "need_action":
          q = q.eq("action_required", true).in("action_status", ["pending", "in_progress"]);
          break;
        case "overdue":
          q = q.eq("action_status", "overdue");
          break;
        case "read_unhandled":
          q = q
            .eq("is_read", true)
            .eq("action_required", true)
            .in("action_status", ["pending", "in_progress", "overdue"]);
          break;
      }

      if (search.trim()) q = q.or(`title.ilike.%${search}%,message.ilike.%${search}%`);
      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: data || [], total: count ?? 0 };
    },
  });

  const rows = result?.rows ?? [];
  const total = result?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

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
              <Badge variant="secondary" className="text-xs">
                {total} kết quả
              </Badge>
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
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="max-w-xs h-8 text-sm"
            />
            <Select value={preset} onValueChange={(v) => { setPreset(v as FilterPreset); setPage(0); }}>
              <SelectTrigger className="w-56 h-8 text-sm">
                <SelectValue placeholder="Bộ lọc nhanh" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(FILTER_LABELS) as FilterPreset[]).map((k) => (
                  <SelectItem key={k} value={k}>{FILTER_LABELS[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(0); }}>
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

          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">Loại</TableHead>
                  <TableHead className="min-w-[260px]">Tiêu đề / Nội dung</TableHead>
                  <TableHead className="w-[160px]">Người nhận</TableHead>
                  <TableHead className="w-[180px]">Email</TableHead>
                  <TableHead className="w-[140px]">Gửi lúc</TableHead>
                  <TableHead className="w-[160px]">Đọc lúc</TableHead>
                  <TableHead className="w-[160px]">Chưa đọc bao lâu</TableHead>
                  <TableHead className="w-[90px]">Mức độ</TableHead>
                  <TableHead className="w-[180px]">Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-sm text-muted-foreground">
                      Không có thông báo nào khớp tiêu chí
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((r: any) => {
                  const typeLabel = TYPE_LABELS[r.type] || r.type;
                  const recipientName = r.profiles?.full_name || "—";
                  const recipientEmail = r.profiles?.email || "—";
                  const isHigh = r.priority === "high" || r.priority === "critical";
                  const urgentUnread = !r.is_read && isHigh;
                  const readUnhandled =
                    r.is_read &&
                    r.action_required &&
                    ["pending", "in_progress"].includes(r.action_status);
                  const overdueAction = r.action_status === "overdue";
                  const completed = r.action_status === "completed";

                  return (
                    <TableRow key={r.id} className={urgentUnread || overdueAction ? "bg-destructive/5" : ""}>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] whitespace-nowrap">
                          {typeLabel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5 max-w-md">
                          <p className="text-sm font-medium truncate">{r.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{r.message}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{recipientName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-[180px]">
                        {recipientEmail}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {format(new Date(r.created_at), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {r.read_at ? (
                          <span className="text-blue-700">
                            {format(new Date(r.read_at), "dd/MM/yyyy HH:mm")}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {!r.is_read ? (
                          <span className="inline-flex items-center gap-1 text-amber-700">
                            <Clock className="h-3 w-3" />
                            Chưa đọc {formatDistanceToNow(new Date(r.created_at), { locale: vi })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${PRIORITY_LABELS[r.priority]?.cls ?? ""}`}
                        >
                          {PRIORITY_LABELS[r.priority]?.label ?? r.priority ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 items-start">
                          {/* Read state badge */}
                          {urgentUnread ? (
                            <Badge variant="destructive" className="text-[10px]">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Khẩn chưa đọc
                            </Badge>
                          ) : !r.is_read ? (
                            <Badge variant="secondary" className="text-[10px]">
                              <Circle className="h-3 w-3 mr-1" />
                              Chưa đọc
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-blue-50 text-blue-700 border-blue-300"
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Đã đọc
                            </Badge>
                          )}

                          {/* Action state badge */}
                          {!r.action_required ? (
                            <span className="text-[10px] text-muted-foreground">Không cần xử lý</span>
                          ) : overdueAction ? (
                            <Badge variant="destructive" className="text-[10px]">
                              Quá hạn xử lý
                            </Badge>
                          ) : completed ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-green-50 text-green-700 border-green-300"
                            >
                              Đã xử lý
                            </Badge>
                          ) : readUnhandled ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-amber-50 text-amber-700 border-amber-300"
                            >
                              Đã đọc, chưa xử lý
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${ACTION_STATUS_LABELS[r.action_status]?.cls ?? ""}`}
                            >
                              {ACTION_STATUS_LABELS[r.action_status]?.label ?? r.action_status ?? "—"}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Trang {page + 1}/{totalPages} · {total} tổng
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Trước
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Sau
              </Button>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Chỉ <strong>Quản trị viên / Quản trị tối cao / GĐKD / Manager / HR Manager</strong> xem trang này.
            Sale/HR thường chỉ thấy thông báo của chính mình theo RLS.
            <br />
            <strong>Nguyên tắc:</strong> "Đã gửi" ≠ "Đã đọc" ≠ "Đã xử lý".
            Click vào thông báo chỉ đánh dấu đã đọc — KHÔNG tự động hoàn thành công việc.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
