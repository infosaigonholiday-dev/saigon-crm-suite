import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Bell, Cake, Building2, Phone, CreditCard, FileText, AlertTriangle, Clock,
  Plane, MessageSquare, FileSignature, FileCheck, CalendarDays, UserCheck,
  ShieldAlert, Wallet, Receipt,
} from "lucide-react";
import { formatDistanceToNow, isToday, isYesterday, isThisWeek } from "date-fns";
import { vi } from "date-fns/locale";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/markNotificationRead";

const typeIcons: Record<string, typeof Cake> = {
  birthday: Cake,
  company_anniversary: Building2,
  follow_up: Phone,
  payment_due: CreditCard,
  PAYMENT_DUE: CreditCard,
  LEAD_FORGOTTEN: AlertTriangle,
  FOLLOW_UP_OVERDUE: Clock,
  TRAVEL_DATE_NEAR: Plane,
  internal_note: MessageSquare,
  mention: MessageSquare,
  BOOKING_DEPARTURE_NEAR: Plane,
  CONTRACT_APPROVAL_OVERDUE: FileSignature,
  QUOTATION_NO_RESPONSE: FileCheck,
  EMPLOYEE_BIRTHDAY: Cake,
  EMPLOYEE_CONTRACT_EXPIRING: CalendarDays,
  LEAVE_REQUEST_NEW: UserCheck,
  LEAVE_REQUEST_RESULT: UserCheck,
  ESCALATION_LV1: ShieldAlert,
  ESCALATION_LV2: ShieldAlert,
  ESCALATION_LV3: ShieldAlert,
  BUDGET_ESTIMATE_NEW: Wallet,
  BUDGET_ESTIMATE_RESULT: Wallet,
  BUDGET_SETTLEMENT_STATUS: Receipt,
  BUDGET_SETTLEMENT_CLOSED: Receipt,
  BUDGET_SETTLEMENT_REJECTED: Receipt,
  TRANSACTION_APPROVAL: Wallet,
  TRANSACTION_APPROVED: Wallet,
  TRANSACTION_REJECTED: Wallet,
};

const entityRouteMap: Record<string, (id: string) => string> = {
  raw_contact: () => "/kho-data",
  lead: () => "/tiem-nang",
  customer: (id) => `/khach-hang/${id}`,
  booking: (id) => `/dat-tour/${id}`,
  quotation: () => "/bao-gia",
  contract: () => "/hop-dong",
  payment: () => "/thanh-toan",
  employee: (id) => `/nhan-su/${id}`,
  finance: () => "/tai-chinh",
  transaction: () => "/tai-chinh",
  budget_estimate: () => "/tai-chinh",
  budget_settlement: () => "/tai-chinh",
  leave_request: () => "/nghi-phep",
};

type FilterGroup = "all" | "finance" | "crm" | "tour" | "hr";

const ENTITY_GROUPS: Record<FilterGroup, string[]> = {
  all: [],
  finance: ["transaction", "budget_estimate", "budget_settlement", "payment", "finance"],
  crm: ["lead", "customer", "raw_contact"],
  tour: ["booking", "b2b_tour", "quotation", "contract"],
  hr: ["leave_request", "employee"],
};

function dateBucket(d: Date): "today" | "yesterday" | "week" | "older" {
  if (isToday(d)) return "today";
  if (isYesterday(d)) return "yesterday";
  if (isThisWeek(d, { weekStartsOn: 1 })) return "week";
  return "older";
}

const bucketLabels: Record<string, string> = {
  today: "Hôm nay",
  yesterday: "Hôm qua",
  week: "Tuần này",
  older: "Cũ hơn",
};

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"unread" | "all">("unread");
  const [group, setGroup] = useState<FilterGroup>("all");

  // Badge count nhẹ — poll 60s, head-only (không tải data)
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["alerts-badge", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("is_read", false);
      return count ?? 0;
    },
    enabled: !!user?.id,
    refetchInterval: 60000,
  });

  // Danh sách 50 notification — chỉ fetch khi user mở popover
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications-all", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, user_id, type, title, message, entity_type, entity_id, related_entity_type, related_entity_id, action_url, is_read, priority, created_at, action_required, action_status, action_due_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
    enabled: !!user?.id && open,
  });

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("my-notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications-all", user.id] });
          queryClient.invalidateQueries({ queryKey: ["alerts-badge", user.id] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, queryClient]);

  const filtered = useMemo(() => {
    let list = notifications;
    if (tab === "unread") list = list.filter((n: any) => !n.is_read);
    if (group !== "all") {
      const allowed = ENTITY_GROUPS[group];
      list = list.filter((n: any) => allowed.includes(n.entity_type ?? ""));
    }
    return list;
  }, [notifications, tab, group]);

  const grouped = useMemo(() => {
    const buckets: Record<string, any[]> = { today: [], yesterday: [], week: [], older: [] };
    for (const n of filtered) {
      buckets[dateBucket(new Date(n.created_at))].push(n);
    }
    return buckets;
  }, [filtered]);

  const markAsRead = async (id: string, entityId: string | null, entityType: string | null) => {
    await markNotificationRead(id);
    queryClient.invalidateQueries({ queryKey: ["notifications-all", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["alerts-badge", user?.id] });
    setOpen(false);
    if (entityType && entityId) {
      const builder = entityRouteMap[entityType];
      if (builder) { navigate(builder(entityId)); return; }
    }
    if (entityType === "lead") navigate("/tiem-nang");
  };

  const markAllRead = async () => {
    if (!user?.id) return;
    await markAllNotificationsRead(user.id);
    queryClient.invalidateQueries({ queryKey: ["notifications-all", user.id] });
    queryClient.invalidateQueries({ queryKey: ["alerts-badge", user.id] });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[420px] p-0">
        <div className="border-b px-4 py-3 flex items-center justify-between">
          <span className="font-medium text-sm">Thông báo</span>
          <Select value={group} onValueChange={(v) => setGroup(v as FilterGroup)}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả nhóm</SelectItem>
              <SelectItem value="finance">Tài chính</SelectItem>
              <SelectItem value="crm">CRM</SelectItem>
              <SelectItem value="tour">Tour</SelectItem>
              <SelectItem value="hr">Nhân sự</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <div className="border-b px-2 pt-2">
            <TabsList className="grid w-full grid-cols-2 h-8">
              <TabsTrigger value="unread" className="text-xs">Chưa đọc {unreadCount > 0 && `(${unreadCount})`}</TabsTrigger>
              <TabsTrigger value="all" className="text-xs">Tất cả</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={tab} className="mt-0">
            <div className="max-h-[480px] overflow-auto">
              {filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Không có thông báo</p>
              ) : (
                (["today", "yesterday", "week", "older"] as const).map((bk) =>
                  grouped[bk].length === 0 ? null : (
                    <div key={bk}>
                      <div className="sticky top-0 bg-muted/50 backdrop-blur px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b">
                        {bucketLabels[bk]}
                      </div>
                      {grouped[bk].map((n: any) => {
                        const Icon = typeIcons[n.type] || FileText;
                        const isHigh = n.priority === "high" || n.priority === "critical";
                        const needsAction = n.action_required && ["pending","in_progress"].includes(n.action_status);
                        const isOverdue = n.action_status === "overdue";
                        return (
                          <button
                            key={n.id}
                            onClick={() => markAsRead(n.id, n.entity_id, n.entity_type)}
                            className={`flex w-full gap-3 px-4 py-3 text-left hover:bg-accent transition-colors border-b last:border-b-0 ${
                              !n.is_read ? "bg-primary/5" : ""
                            }`}
                          >
                            <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${isHigh ? "text-destructive" : "text-primary"}`} />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium leading-tight">{n.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap break-words">{n.message}</p>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <p className="text-xs text-muted-foreground/70">
                                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: vi })}
                                </p>
                                {isOverdue && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive text-destructive-foreground font-medium">Quá hạn</span>
                                )}
                                {needsAction && !isOverdue && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 font-medium">Cần xử lý</span>
                                )}
                              </div>
                            </div>
                            {!n.is_read && <span className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )
                )
              )}
            </div>
          </TabsContent>
        </Tabs>

        {unreadCount > 0 && (
          <div className="border-t px-4 py-2">
            <button onClick={markAllRead} className="text-xs text-primary hover:underline w-full text-center">
              Đánh dấu tất cả đã đọc
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
