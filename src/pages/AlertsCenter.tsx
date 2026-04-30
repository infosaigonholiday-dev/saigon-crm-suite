import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertTriangle, Bell, Wallet, Plane, FileSignature, CreditCard,
  ArrowRight, Loader2, ShieldAlert, Calendar, CheckCheck, Inbox,
} from "lucide-react";
import { format, addDays, differenceInDays } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";

// Phân loại type → nhóm
const TYPE_GROUPS: Record<string, string> = {
  LEAD_ASSIGNED: "lead", LEAD_WON: "lead", LEAD_FORGOTTEN: "lead",
  FOLLOW_UP: "lead", FOLLOW_UP_OVERDUE: "lead", NEW_ONLINE_LEAD: "lead",
  ESCALATION_LV1: "lead", ESCALATION_LV2: "lead",
  BOOKING_NEW: "booking", BOOKING_STATUS: "booking", TOUR_DEPARTURE: "booking",
  QUOTATION_SENT: "booking", CONTRACT_EXPIRY: "booking",
  PAYMENT_DUE: "finance", PAYMENT_OVERDUE: "finance", PAYMENT_RECEIVED: "finance",
  CASHFLOW_NEGATIVE: "finance", BUDGET_ESTIMATE_PENDING: "finance",
  BUDGET_ESTIMATE_SUBMITTED: "finance", BUDGET_ESTIMATE_REMIND: "finance",
  BUDGET_ESTIMATE_OVERDUE: "finance", BUDGET_SETTLEMENT_PENDING: "finance",
  SETTLEMENT_VARIANCE_HIGH: "finance", EXPENSE_ESCALATION: "finance",
  LEAVE_REQUEST_NEW: "hr", LEAVE_REQUEST_RESULT: "hr", NEW_EMPLOYEE: "hr",
  TEST_PUSH: "system", INTERNAL_NOTE: "system", ADMIN_BROADCAST: "system",
};
const getGroup = (t: string) => TYPE_GROUPS[t] ?? "system";
const PAGE_SIZE = 20;

function fmtMoney(n: number | null | undefined) {
  return new Intl.NumberFormat("vi-VN").format(Number(n ?? 0));
}

// Map entity_type → route đích
function getEntityLink(entityType: string | null, entityId: string | null): string | null {
  if (!entityType) return null;
  switch (entityType) {
    case "booking": return entityId ? `/dat-tour/${entityId}` : "/dat-tour";
    case "budget_estimate": return "/tai-chinh?tab=estimates";
    case "budget_settlement": return "/tai-chinh?tab=settlements";
    case "transaction": return "/tai-chinh?tab=hr-approval";
    case "finance": return "/tai-chinh";
    case "contract": return "/hop-dong";
    case "lead": return "/tiem-nang";
    case "raw_contact": return "/kho-data";
    case "employee":
    case "employee_kpi":
      return entityId ? `/nhan-su/${entityId}` : "/nhan-su";
    case "leave_request": return "/nghi-phep";
    case "payment": return "/thanh-toan";
    case "customer": return entityId ? `/khach-hang/${entityId}` : "/khach-hang";
    case "quotation": return "/bao-gia";
    default: return null;
  }
}

export default function AlertsCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ===== TAB 1: KHẨN CẤP =====
  const { data: urgentNotifs = [], isLoading: l1 } = useQuery({
    queryKey: ["alerts-urgent", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, type, title, message, entity_type, entity_id, priority, created_at, is_read")
        .eq("user_id", user!.id)
        .eq("is_read", false)
        .eq("priority", "high")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
    refetchInterval: 60000,
  });

  // ===== TAB "TẤT CẢ" — pagination + filter loại =====
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [page, setPage] = useState(0);

  const { data: allNotifsResult, isLoading: lAll } = useQuery({
    queryKey: ["alerts-all", user?.id, groupFilter, page],
    enabled: !!user?.id,
    queryFn: async () => {
      // Lấy nhiều rồi filter client (vì TYPE_GROUPS map ở client)
      let q = supabase
        .from("notifications")
        .select("id, type, title, message, entity_type, entity_id, priority, created_at, is_read", { count: "exact" })
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (groupFilter !== "all") {
        const types = Object.entries(TYPE_GROUPS).filter(([_, g]) => g === groupFilter).map(([t]) => t);
        if (types.length > 0) q = q.in("type", types);
      }
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, count } = await q.range(from, to);
      return { rows: data ?? [], total: count ?? 0 };
    },
    refetchInterval: 60000,
  });
  const allNotifs = allNotifsResult?.rows ?? [];
  const totalCount = allNotifsResult?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const markAllReadMutation = async () => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("user_id", user!.id)
      .eq("is_read", false);
    if (error) { toast.error(error.message); return; }
    toast.success("Đã đánh dấu tất cả đã đọc");
    queryClient.invalidateQueries({ queryKey: ["alerts-all"] });
    queryClient.invalidateQueries({ queryKey: ["alerts-urgent", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["alerts-badge", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["notifications-all", user?.id] });
  };

  const handleNotificationClick = async (n: any) => {
    const link = getEntityLink(n.entity_type, n.entity_id);
    if (!n.is_read) {
      await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", n.id);
      queryClient.invalidateQueries({ queryKey: ["alerts-urgent", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["alerts-all"] });
      queryClient.invalidateQueries({ queryKey: ["alerts-badge", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["notifications-all", user?.id] });
    }
    if (link) navigate(link);
  };

  // ===== TAB 2: TÀI CHÍNH =====
  const { data: pendingTxns = [] } = useQuery({
    queryKey: ["alerts-pending-txns"],
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("id, amount, description, approval_status, transaction_date, created_at")
        .in("approval_status", ["PENDING_HR", "PENDING_REVIEW"])
        .order("created_at", { ascending: false })
        .limit(30);
      return data ?? [];
    },
  });

  const { data: pendingSettlements = [] } = useQuery({
    queryKey: ["alerts-pending-settlements"],
    queryFn: async () => {
      const { data } = await supabase
        .from("budget_settlements")
        .select("id, code, total_actual, status, created_at")
        .in("status", ["pending_accountant", "pending_ceo"])
        .order("created_at", { ascending: false })
        .limit(30);
      return data ?? [];
    },
  });

  const { data: overduePayments = [] } = useQuery({
    queryKey: ["alerts-overdue-payments"],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data } = await supabase
        .from("accounts_receivable")
        .select("id, amount_remaining, due_date, customer_id, customers(full_name)")
        .lt("due_date", today)
        .gt("amount_remaining", 0)
        .order("due_date", { ascending: true })
        .limit(30);
      return data ?? [];
    },
  });

  // ===== TAB 3: VẬN HÀNH =====
  const { data: upcomingDepartures = [] } = useQuery({
    queryKey: ["alerts-departures"],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const next7 = format(addDays(new Date(), 7), "yyyy-MM-dd");
      const { data } = await supabase
        .from("bookings")
        .select("id, code, deposit_due_at, remaining_due_at, total_value, status, customers(full_name)")
        .gte("remaining_due_at", today)
        .lte("remaining_due_at", next7)
        .neq("status", "cancelled")
        .order("remaining_due_at", { ascending: true })
        .limit(30);
      return data ?? [];
    },
  });

  const { data: highNotes = [] } = useQuery({
    queryKey: ["alerts-high-notes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("booking_special_notes")
        .select("id, content, note_type, priority, booking_id, created_at")
        .eq("priority", "high")
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const { data: pendingContracts = [] } = useQuery({
    queryKey: ["alerts-pending-contracts"],
    queryFn: async () => {
      const threeDaysAgo = format(addDays(new Date(), -3), "yyyy-MM-dd");
      const { data } = await supabase
        .from("contracts")
        .select("id, code, status, total_value, created_at, customer_id, customers(full_name)")
        .eq("status", "PENDING_APPROVAL")
        .lte("created_at", threeDaysAgo)
        .order("created_at", { ascending: true })
        .limit(20);
      return data ?? [];
    },
  });

  const urgentCount = urgentNotifs.length;
  const financeCount = pendingTxns.length + pendingSettlements.length + overduePayments.length;
  const opsCount = upcomingDepartures.length + highNotes.length + pendingContracts.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-7 w-7 text-destructive" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Trung tâm Cảnh báo</h1>
            <p className="text-sm text-muted-foreground">Tổng hợp các cảnh báo, nhắc hẹn và việc cần xử lý gấp</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={markAllReadMutation}>
          <CheckCheck className="h-4 w-4 mr-2" /> Đánh dấu tất cả đã đọc
        </Button>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList data-testid="alerts-tabs" className="grid w-full grid-cols-4">
          <TabsTrigger value="all" data-testid="tab-all">
            <Inbox className="h-4 w-4 mr-2" />
            Tất cả {totalCount > 0 && <Badge variant="secondary" className="ml-2">{totalCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="urgent" data-testid="tab-urgent">
            <ShieldAlert className="h-4 w-4 mr-2" />
            Khẩn cấp {urgentCount > 0 && <Badge variant="destructive" className="ml-2">{urgentCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="finance" data-testid="tab-finance">
            <Wallet className="h-4 w-4 mr-2" />
            Tài chính {financeCount > 0 && <Badge variant="secondary" className="ml-2">{financeCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="ops" data-testid="tab-ops">
            <Plane className="h-4 w-4 mr-2" />
            Vận hành {opsCount > 0 && <Badge variant="secondary" className="ml-2">{opsCount}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* ===== TẤT CẢ ===== */}
        <TabsContent value="all" className="mt-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Loại:</span>
            <Select value={groupFilter} onValueChange={(v) => { setGroupFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[180px] h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="lead">Lead / Tiềm năng</SelectItem>
                <SelectItem value="booking">Booking / Tour</SelectItem>
                <SelectItem value="finance">Tài chính</SelectItem>
                <SelectItem value="hr">Nhân sự</SelectItem>
                <SelectItem value="system">Hệ thống</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground ml-auto">
              Trang {page + 1}/{totalPages} · {totalCount} thông báo
            </span>
          </div>

          {lAll ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>
          ) : allNotifs.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground">
              <Bell className="h-10 w-10 mx-auto mb-2 opacity-30" />
              Không có thông báo nào.
            </CardContent></Card>
          ) : (
            <>
              {allNotifs.map((n: any) => {
                const link = getEntityLink(n.entity_type, n.entity_id);
                const clickable = !!link;
                return (
                  <Card
                    key={n.id}
                    className={`${n.is_read ? "bg-card" : "bg-accent/30"} ${n.priority === "high" ? "border-l-4 border-l-destructive" : ""} ${clickable ? "cursor-pointer hover:bg-accent/60 transition-colors" : ""}`}
                    onClick={clickable ? () => handleNotificationClick(n) : undefined}
                    role={clickable ? "button" : undefined}
                    tabIndex={clickable ? 0 : undefined}
                  >
                    <CardContent className="py-3 flex items-start gap-3">
                      <Bell className={`h-4 w-4 mt-0.5 shrink-0 ${n.is_read ? "text-muted-foreground" : "text-primary"}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${n.is_read ? "font-normal" : "font-semibold"}`}>{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap break-words line-clamp-2">{n.message}</p>
                        <p className="text-[11px] text-muted-foreground/70 mt-1">
                          <Badge variant="outline" className="mr-2 text-[10px]">{getGroup(n.type)}</Badge>
                          {format(new Date(n.created_at), "HH:mm, dd/MM/yyyy", { locale: vi })}
                        </p>
                      </div>
                      {clickable && <ArrowRight className="h-4 w-4 text-primary shrink-0 mt-1" />}
                    </CardContent>
                  </Card>
                );
              })}
              <div className="flex items-center justify-center gap-2 pt-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>Trước</Button>
                <span className="text-sm text-muted-foreground">{page + 1} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Sau</Button>
              </div>
            </>
          )}
        </TabsContent>

        {/* ===== KHẨN CẤP ===== */}
        <TabsContent value="urgent" className="mt-4 space-y-3">
          {l1 ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>
          ) : urgentCount === 0 ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground">
              <Bell className="h-10 w-10 mx-auto mb-2 opacity-30" />
              Không có cảnh báo khẩn cấp nào.
            </CardContent></Card>
          ) : (
            urgentNotifs.map((n: any) => {
              const link = getEntityLink(n.entity_type, n.entity_id);
              const clickable = !!link;
              return (
                <Card
                  key={n.id}
                  className={`border-l-4 border-l-destructive ${clickable ? "cursor-pointer hover:bg-accent/50 transition-colors" : ""}`}
                  onClick={clickable ? () => handleNotificationClick(n) : undefined}
                  role={clickable ? "button" : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  onKeyDown={clickable ? (e) => { if (e.key === "Enter") handleNotificationClick(n); } : undefined}
                >
                  <CardContent className="py-4 flex items-start gap-3">
                    <ShieldAlert className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{n.title}</p>
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap break-words">{n.message}</p>
                      <p className="text-xs text-muted-foreground/70 mt-2">
                        {format(new Date(n.created_at), "HH:mm, dd/MM/yyyy", { locale: vi })}
                      </p>
                    </div>
                    {clickable && (
                      <div className="flex items-center gap-1 text-xs text-primary shrink-0 mt-1">
                        <span className="hidden sm:inline">Xem chi tiết</span>
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* ===== TÀI CHÍNH ===== */}
        <TabsContent value="finance" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4" /> Chi phí chờ duyệt ({pendingTxns.length})
            </CardTitle></CardHeader>
            <CardContent>
              {pendingTxns.length === 0 ? <p className="text-sm text-muted-foreground">Không có</p> : (
                <div className="space-y-2">
                  {pendingTxns.map((t: any) => (
                    <div key={t.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{t.description || "(Không mô tả)"}</p>
                        <p className="text-xs text-muted-foreground">
                          {fmtMoney(t.amount)} VNĐ · {t.approval_status === "PENDING_HR" ? "Chờ HR" : "Chờ Kế toán"}
                        </p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => navigate("/tai-chinh?tab=kt-duyet")}><ArrowRight className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4" /> Quyết toán chờ xử lý ({pendingSettlements.length})
            </CardTitle></CardHeader>
            <CardContent>
              {pendingSettlements.length === 0 ? <p className="text-sm text-muted-foreground">Không có</p> : (
                <div className="space-y-2">
                  {pendingSettlements.map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{s.code || s.id.slice(0, 8)}</p>
                        <p className="text-xs text-muted-foreground">
                          {fmtMoney(s.total_actual)} VNĐ · {s.status === "pending_accountant" ? "Chờ Kế toán" : "Chờ CEO"}
                        </p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => navigate("/tai-chinh?tab=quyet-toan")}><ArrowRight className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2 text-destructive">
              <CreditCard className="h-4 w-4" /> Công nợ quá hạn ({overduePayments.length})
            </CardTitle></CardHeader>
            <CardContent>
              {overduePayments.length === 0 ? <p className="text-sm text-muted-foreground">Không có</p> : (
                <div className="space-y-2">
                  {overduePayments.map((p: any) => {
                    const overdueDays = differenceInDays(new Date(), new Date(p.due_date));
                    return (
                      <div key={p.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{p.customers?.full_name || "(Không tên)"}</p>
                          <p className="text-xs text-destructive">
                            Quá hạn {overdueDays} ngày · Còn {fmtMoney(p.amount_remaining)} VNĐ
                          </p>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => p.customer_id && navigate(`/khach-hang/${p.customer_id}`)}>
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== VẬN HÀNH ===== */}
        <TabsContent value="ops" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2">
              <Plane className="h-4 w-4" /> Tour khởi hành trong 7 ngày ({upcomingDepartures.length})
            </CardTitle></CardHeader>
            <CardContent>
              {upcomingDepartures.length === 0 ? <p className="text-sm text-muted-foreground">Không có</p> : (
                <div className="space-y-2">
                  {upcomingDepartures.map((b: any) => (
                    <div key={b.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {b.code} — {b.customers?.full_name || "(KH)"}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {b.remaining_due_at && format(new Date(b.remaining_due_at), "dd/MM/yyyy")} · {fmtMoney(b.total_value)} VNĐ
                        </p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/dat-tour/${b.id}`)}><ArrowRight className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" /> Lưu ý đặc biệt mức cao ({highNotes.length})
            </CardTitle></CardHeader>
            <CardContent>
              {highNotes.length === 0 ? <p className="text-sm text-muted-foreground">Không có</p> : (
                <div className="space-y-2">
                  {highNotes.map((n: any) => (
                    <div key={n.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{n.note_type}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{n.content}</p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/dat-tour/${n.booking_id}`)}><ArrowRight className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2">
              <FileSignature className="h-4 w-4" /> Hợp đồng chờ duyệt {'>'} 3 ngày ({pendingContracts.length})
            </CardTitle></CardHeader>
            <CardContent>
              {pendingContracts.length === 0 ? <p className="text-sm text-muted-foreground">Không có</p> : (
                <div className="space-y-2">
                  {pendingContracts.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {c.code} — {c.customers?.full_name || "(KH)"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {fmtMoney(c.total_value)} VNĐ · Tạo {format(new Date(c.created_at), "dd/MM/yyyy")}
                        </p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => navigate("/hop-dong")}><ArrowRight className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
