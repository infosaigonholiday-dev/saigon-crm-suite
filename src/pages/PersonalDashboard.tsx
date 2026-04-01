import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { TrendingUp, Users, ClipboardList, CalendarDays, Gift, Building2, Cake, Circle, MapPin, Phone as PhoneIcon } from "lucide-react";
import { usePersonalDashboardData } from "@/hooks/useDashboardData";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { format, addDays, differenceInCalendarDays } from "date-fns";

function formatVND(value: number) {
  if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + " tỷ";
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(0) + " triệu";
  return new Intl.NumberFormat("vi-VN").format(value);
}

interface UpcomingEvent {
  customerId: string;
  customerName: string;
  type: "birthday" | "contact_birthday" | "founded";
  date: string; // MM/DD display
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
    // Reset today for comparison
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diff = Math.ceil((upcoming.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff >= 0 && diff <= 7) {
      events.push({
        customerId,
        customerName: name,
        type,
        date: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
        daysLeft: diff,
        tier,
      });
    }
  };

  customers.forEach((c) => {
    checkDate(c.date_of_birth, c.id, c.full_name, "birthday", c.tier);
    checkDate(c.contact_birthday, c.id, c.full_name, "contact_birthday", c.tier);
    checkDate(c.founded_date, c.id, c.full_name, "founded", c.tier);
  });

  return events.sort((a, b) => a.daysLeft - b.daysLeft);
}

const eventIcons = {
  birthday: Cake,
  contact_birthday: Gift,
  founded: Building2,
};

const eventLabels = {
  birthday: "Sinh nhật",
  contact_birthday: "SN người LH",
  founded: "Ngày thành lập",
};

export default function PersonalDashboard() {
  const { stats, monthlyData } = usePersonalDashboardData();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ["upcoming-events", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, full_name, date_of_birth, contact_birthday, founded_date, tier, assigned_sale_id")
        .eq("assigned_sale_id", user!.id);
      if (error) throw error;
      return getUpcomingEvents(data || []);
    },
    enabled: !!user?.id,
  });

  const statCards = [
    { label: "Doanh số tháng này", value: formatVND(stats.myRevenue), icon: TrendingUp },
    { label: "Booking của tôi", value: String(stats.myBookingCount), icon: CalendarDays },
    { label: "Lead của tôi", value: String(stats.myLeadCount), icon: ClipboardList },
    { label: "Khách hàng của tôi", value: String(stats.myCustomerCount), icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard cá nhân</h1>
        <p className="text-muted-foreground text-sm">
          Hiệu suất của bạn — tháng {new Date().getMonth() + 1}/{new Date().getFullYear()}
        </p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart */}
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
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="value" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Gift className="h-4 w-4 text-primary" />
              Sự kiện sắp tới
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Không có sự kiện trong 7 ngày tới
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((ev, i) => {
                  const Icon = eventIcons[ev.type];
                  return (
                    <div
                      key={`${ev.customerId}-${ev.type}-${i}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/khach-hang/${ev.customerId}`)}
                    >
                      <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4 text-pink-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{ev.customerName}</p>
                        <p className="text-xs text-muted-foreground">
                          {eventLabels[ev.type]} — {ev.date}
                        </p>
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
    </div>
  );
}
