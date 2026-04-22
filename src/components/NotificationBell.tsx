import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Bell, Cake, Building2, Phone, CreditCard, FileText, AlertTriangle, Clock, Plane, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

const typeIcons: Record<string, typeof Cake> = {
  birthday: Cake,
  company_anniversary: Building2,
  follow_up: Phone,
  payment_due: CreditCard,
  LEAD_FORGOTTEN: AlertTriangle,
  FOLLOW_UP_OVERDUE: Clock,
  TRAVEL_DATE_NEAR: Plane,
  internal_note: MessageSquare,
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
};

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications-unread", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
    enabled: !!user?.id,
    refetchInterval: 60000,
  });

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("my-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ["notifications-unread", user.id] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, queryClient]);

  const markAsRead = async (id: string, entityId: string | null, entityType: string | null) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["notifications-unread", user?.id] });
    setOpen(false);
    if (entityType && entityId) {
      const builder = entityRouteMap[entityType];
      if (builder) {
        navigate(builder(entityId));
        return;
      }
      // legacy fallback
      if (entityType === "lead") navigate("/tiem-nang");
      else navigate(`/khach-hang/${entityId}`);
    }
  };

  const markAllRead = async () => {
    if (!user?.id) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    queryClient.invalidateQueries({ queryKey: ["notifications-unread", user.id] });
  };

  const count = notifications.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3 font-medium text-sm">Thông báo</div>
        <div className="max-h-80 overflow-auto">
          {count === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Không có thông báo mới</p>
          ) : (
            notifications.map((n: any) => {
              const Icon = typeIcons[n.type] || FileText;
              return (
                <button
                  key={n.id}
                  onClick={() => markAsRead(n.id, n.entity_id, n.entity_type)}
                  className="flex w-full gap-3 px-4 py-3 text-left hover:bg-accent transition-colors border-b last:border-b-0"
                >
                  <Icon className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-tight truncate">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: vi })}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
        {count > 0 && (
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
