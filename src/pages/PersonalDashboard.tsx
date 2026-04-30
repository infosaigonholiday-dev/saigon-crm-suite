import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { TrendingUp, Users, ClipboardList, CalendarDays, Gift, Building2, Cake, Circle, PhoneCall, Eye, Database } from "lucide-react";
import { KpiProgressCard } from "@/components/kpi/KpiProgressCard";
import { usePersonalDashboardData } from "@/hooks/useDashboardData";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { format, differenceInCalendarDays, subDays } from "date-fns";

function formatVND(value: number) {
  if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + " tỷ";
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(0) + " triệu";
  return new Intl.NumberFormat("vi-VN").format(value);
}

interface UpcomingEvent {
  customerId: string;
  customerName: string;
  type: "birthday" | "contact_birthday" | "founded";
  date: string;
  daysLeft: number;
  tier: string | null;
}

function getUpcomingEvents(customers: any[]): UpcomingEvent[] {
  const today = new Date();
  const events: UpcomingEvent[] = [];
  const checkDate = (dateStr: string | null, customerId: string, name: string, type: UpcomingEvent["type"], tier: string | null) => {
    if (!dateStr) return;
    const d = new Date(dateStr);
    const thisYear = today.getFullYear();
    const upcoming = new Date(thisYear, d.getMonth(), d.getDate());
    if (upcoming.getTime() < today.setHours(0, 0, 0, 0)) {
      upcoming.setFullYear(thisYear + 1);
    }
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diff = Math.ceil((upcoming.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff >= 0 && diff <= 7) {
      events.push({ customerId, customerName: name, type, date: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`, daysLeft: diff, tier });
    }
  };
  customers.forEach((c) => {
    checkDate(c.date_of_birth, c.id, c.full_name, "birthday", c.tier);
    checkDate(c.contact_birthday, c.id, c.full_name, "contact_birthday", c.tier);
    checkDate(c.founded_date, c.id, c.full_name, "founded", c.tier);
  });
  return events.sort((a, b) => a.daysLeft - b.daysLeft);
}

const eventIcons = { birthday: Cake, contact_birthday: Gift, founded: Building2 };
const eventLabels = { birthday: "Sinh nhật", contact_birthday: "SN người LH", founded: "Ngày thành lập" };

export default function PersonalDashboard() {
  const { stats, monthlyData } = usePersonalDashboardData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const weekAgo = format(subDays(new Date(), 7), "yyyy-MM-dd");

  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ["upcoming-events", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("id, full_name, date_of_birth, contact_birthday, founded_date, tier, assigned_sale_id").eq("assigned_sale_id", user!.id);
      if (error) throw error;
      return getUpcomingEvents(data || []);
    },
    enabled: !!user?.id,
  });

  const { data: followUpLeads = [] } = useQuery({
    queryKey: ["follow-up-leads", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id, full_name, follow_up_date, temperature, last_contact_at, contact_count, destination, phone, assigned_to, status")
        .eq("assigned_to", user!.id)
        .not("follow_up_date", "is", null)
        .lte("follow_up_date", todayStr)
        .not("status", "in", "(WON,LOST,DORMANT)")
        .order("follow_up_date");
      if (error) throw error;
      // Tính nhiệt độ động + sort: Nóng trước, sau đó theo ngày hẹn
      const tempOrder: Record<string, number> = { hot: 0, warm: 1, cold: 2 };
      const computeTemp = (lastContactAt: string | null, manual: string | null) => {
        if (!lastContactAt) return manual || "warm";
        const days = Math.floor((Date.now() - new Date(lastContactAt).getTime()) / 86400000);
        if (days < 3) return "hot";
        if (days <= 7) return "warm";
        return "cold";
      };
      return (data || []).map((l: any) => ({ ...l, _temp: computeTemp(l.last_contact_at, l.temperature) }))
        .sort((a, b) => {
          const tDiff = tempOrder[a._temp] - tempOrder[b._temp];
          if (tDiff !== 0) return tDiff;
          return (a.follow_up_date || "").localeCompare(b.follow_up_date || "");
        });
    },
    enabled: !!user?.id,
  });

  const { data: weeklyStats } = useQuery({
    queryKey: ["weekly-care-stats", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("lead_care_history").select("result").eq("contacted_by", user!.id).gte("contacted_at", weekAgo) as any;
      if (error) throw error;
      const total = data?.length ?? 0;
      const answered = data?.filter((d: any) => d.result !== "NO_ANSWER").length ?? 0;
      const interested = data?.filter((d: any) => ["INTERESTED", "SENT_PROFILE", "QUOTE_REQUESTED", "BOOKED"].includes(d.result)).length ?? 0;
      const booked = data?.filter((d: any) => d.result === "BOOKED").length ?? 0;
      return { total, answered, answerRate: total > 0 ? Math.round((answered / total) * 100) : 0, interested, booked };
    },
    enabled: !!user?.id,
  });

  const { data: forgottenLeads = [] } = useQuery({
    queryKey: ["forgotten-leads", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("id, full_name, last_contact_at, temperature, status").eq("assigned_to", user!.id).not("status", "in", "(WON,LOST,DORMANT)").lt("last_contact_at", weekAgo).order("last_contact_at").limit(5) as any;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: rawContactStats } = useQuery({
    queryKey: ["raw-contact-today", user?.id],
    queryFn: async () => {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const todayISO = todayStart.toISOString();
      const { data: newData } = await supabase.from("raw_contacts").select("id").eq("created_by", user!.id).gte("created_at", todayISO);
      const { data: calledData } = await supabase.from("raw_contacts").select("id").eq("created_by", user!.id).gte("last_called_at", todayISO);
      const { data: convertedData } = await supabase.from("raw_contacts").select("id").eq("created_by", user!.id).eq("status", "converted_to_lead").gte("created_at", todayISO);
      return { newCount: newData?.length || 0, calledCount: calledData?.length || 0, convertedCount: convertedData?.length || 0 };
    },
    enabled: !!user?.id,
  });

  const { data: pipelineCounts } = useQuery({
    queryKey: ["pipeline-funnel", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("status").eq("assigned_to", user!.id);
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach((l) => { counts[l.status ?? "NEW"] = (counts[l.status ?? "NEW"] || 0) + 1; });
      return counts;
    },
    enabled: !!user?.id,
  });

  const statCards = [
    { label: "Doanh số tháng này", value: formatVND(stats.myRevenue), icon: TrendingUp },
    { label: "Booking của tôi", value: String(stats.myBookingCount), icon: CalendarDays },
    { label: "Lead của tôi", value: String(stats.myLeadCount), icon: ClipboardList },
    { label: "Khách hàng của tôi", value: String(stats.myCustomerCount), icon: Users },
  ];

  const funnelData = pipelineCounts ? [
    { name: "Mới", value: (pipelineCounts["NEW"] ?? 0) + (pipelineCounts["NO_ANSWER"] ?? 0), fill: "hsl(var(--muted-foreground))" },
    { name: "Liên hệ", value: pipelineCounts["CONTACTED"] ?? 0, fill: "hsl(var(--primary))" },
    { name: "Quan tâm", value: (pipelineCounts["INTERESTED"] ?? 0) + (pipelineCounts["PROFILE_SENT"] ?? 0), fill: "hsl(var(--accent))" },
    { name: "Báo giá", value: pipelineCounts["QUOTE_SENT"] ?? 0, fill: "hsl(210, 70%, 50%)" },
    { name: "Chốt", value: pipelineCounts["WON"] ?? 0, fill: "hsl(142, 71%, 45%)" },
  ] : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard cá nhân</h1>
        <p className="text-muted-foreground text-sm">Hiệu suất của bạn — tháng {new Date().getMonth() + 1}/{new Date().getFullYear()}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Raw Contact Stats */}
      {rawContactStats && (rawContactStats.newCount > 0 || rawContactStats.calledCount > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              Data hôm nay
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{rawContactStats.newCount}</p>
                <p className="text-xs text-muted-foreground">Data mới nhập</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{rawContactStats.calledCount}</p>
                <p className="text-xs text-muted-foreground">Cuộc gọi</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{rawContactStats.convertedCount}</p>
                <p className="text-xs text-muted-foreground">Chuyển Lead</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PhoneCall className="h-4 w-4 text-primary" />
              Thống kê tuần này
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{weeklyStats?.total ?? 0}</p>
                <p className="text-xs text-muted-foreground">Lần liên hệ</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{weeklyStats?.answerRate ?? 0}%</p>
                <p className="text-xs text-muted-foreground">Tỷ lệ nhấc máy</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{weeklyStats?.interested ?? 0}</p>
                <p className="text-xs text-muted-foreground">Quan tâm mới</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{weeklyStats?.booked ?? 0}</p>
                <p className="text-xs text-muted-foreground">Tour chốt</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Circle className="h-4 w-4 text-orange-500" />
              Việc cần làm hôm nay ({followUpLeads.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {followUpLeads.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">🎉 Không có lead nào cần follow-up</p>
            ) : (
              <div className="space-y-2 max-h-[280px] overflow-y-auto">
                {followUpLeads.map((lead: any) => {
                  const diff = differenceInCalendarDays(new Date(lead.follow_up_date!), new Date());
                  const tempIcon = lead._temp === "hot" ? "🔥" : lead._temp === "cold" ? "❄️" : "🟡";
                  const overdue = diff < 0;
                  return (
                    <div
                      key={lead.id}
                      className={`flex items-center gap-2 p-2 rounded-lg border ${overdue ? "border-destructive/40 bg-destructive/5" : "border-transparent hover:bg-muted/50"} cursor-pointer transition-colors`}
                      onClick={() => navigate("/tiem-nang")}
                    >
                      <span className="text-base shrink-0" title={lead._temp}>{tempIcon}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{lead.full_name}</p>
                        {lead.phone && <p className="text-[10px] text-muted-foreground truncate">{lead.phone}</p>}
                      </div>
                      {overdue ? (
                        <Badge variant="destructive" className="text-[10px] shrink-0">Quá {Math.abs(diff)}d</Badge>
                      ) : (
                        <Badge className="bg-orange-100 text-orange-700 border-orange-300 text-[10px] shrink-0">Hôm nay</Badge>
                      )}
                      {lead.phone && (
                        <a
                          href={`tel:${lead.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0 inline-flex items-center justify-center h-7 w-7 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                          title="Gọi ngay"
                        >
                          <PhoneCall className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4 text-destructive" />
              Lead bị bỏ quên ({forgottenLeads.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {forgottenLeads.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Không có lead bị bỏ quên 🎉</p>
            ) : (
              <div className="space-y-2">
                {forgottenLeads.map((lead: any) => {
                  const days = lead.last_contact_at ? differenceInCalendarDays(new Date(), new Date(lead.last_contact_at)) : 999;
                  return (
                    <div key={lead.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer" onClick={() => navigate("/tiem-nang")}>
                      <p className="text-sm truncate flex-1">{lead.full_name}</p>
                      <Badge variant="destructive" className="text-[10px]">{days} ngày</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            {funnelData.length > 0 ? (
              <div className="space-y-2">
                {funnelData.map((stage) => {
                  const maxVal = Math.max(...funnelData.map(s => s.value), 1);
                  const pct = Math.max((stage.value / maxVal) * 100, 8);
                  return (
                    <div key={stage.name} className="flex items-center gap-3">
                      <span className="text-xs w-16 text-right text-muted-foreground">{stage.name}</span>
                      <div className="flex-1 h-6 rounded-md overflow-hidden bg-muted/30">
                        <div className="h-full rounded-md flex items-center px-2 text-xs font-medium text-primary-foreground" style={{ width: `${pct}%`, backgroundColor: stage.fill }}>
                          {stage.value}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Chưa có dữ liệu</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Doanh số 12 tháng của tôi (triệu VNĐ)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                <Bar dataKey="value" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Gift className="h-4 w-4 text-primary" />Sự kiện sắp tới
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Không có sự kiện trong 7 ngày tới</p>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((ev, i) => {
                  const Icon = eventIcons[ev.type];
                  return (
                    <div key={`${ev.customerId}-${ev.type}-${i}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => navigate(`/khach-hang/${ev.customerId}`)}>
                      <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4 text-pink-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{ev.customerName}</p>
                        <p className="text-xs text-muted-foreground">{eventLabels[ev.type]} — {ev.date}</p>
                      </div>
                      {ev.daysLeft === 0 ? (
                        <Badge className="bg-pink-100 text-pink-700 border-pink-300 shrink-0">Hôm nay</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground shrink-0">{ev.daysLeft} ngày</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <KpiProgressCard />
    </div>
  );
}
