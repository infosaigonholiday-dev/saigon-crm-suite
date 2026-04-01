import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { TrendingUp, Users, ClipboardList, CalendarDays, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getDashboardType, useBusinessDashboardData, getDataScope } from "@/hooks/useDashboardData";
import PersonalDashboard from "./PersonalDashboard";
import HrDashboard from "./HrDashboard";
import ManagerKPIDashboard from "./ManagerKPIDashboard";
import { CeoDashboardCharts } from "@/components/dashboard/CeoDashboardCharts";

function formatVND(value: number) {
  if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + " tỷ";
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(0) + " triệu";
  return new Intl.NumberFormat("vi-VN").format(value);
}

function BusinessDashboard() {
  const { userRole } = useAuth();
  const scope = getDataScope(userRole);
  const { stats, revenueByMonth, deadlines, loading } = useBusinessDashboardData();

  const canViewRevenue = ["ADMIN", "SUPER_ADMIN", "DIRECTOR", "KETOAN"].includes(userRole || "");

  const scopeLabel = scope === "all" ? "toàn công ty" : scope === "team" ? "phòng ban" : "cá nhân";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const statCards = [
    ...(canViewRevenue
      ? [{ label: "Doanh thu tháng", value: formatVND(stats.monthlyRevenue), icon: TrendingUp }]
      : []),
    { label: "Booking mới", value: String(stats.newBookings), icon: CalendarDays },
    { label: "Lead mới", value: String(stats.newLeads), icon: ClipboardList },
    { label: "Khách hàng", value: new Intl.NumberFormat("vi-VN").format(stats.customerCount), icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tổng quan</h1>
        <p className="text-muted-foreground text-sm">
          Dữ liệu {scopeLabel} — tháng {new Date().getMonth() + 1}/{new Date().getFullYear()}
        </p>
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${statCards.length} gap-4`}>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {canViewRevenue && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">
                Doanh thu 12 tháng (triệu VNĐ) — {scopeLabel}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueByMonth}>
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
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        <Card className={canViewRevenue ? "" : "lg:col-span-3"}>
          <CardHeader>
            <CardTitle className="text-base">Deadline hôm nay</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {deadlines.length === 0 && (
              <p className="text-sm text-muted-foreground">Không có deadline hôm nay</p>
            )}
            {deadlines.map((d, i) => (
              <div key={i} className="flex items-start justify-between gap-2 pb-3 border-b last:border-0 last:pb-0">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{d.customer}</p>
                  <p className="text-xs text-muted-foreground truncate">{d.tour}</p>
                </div>
                <div className="text-right shrink-0">
                  <Badge variant={d.type === "Đặt cọc" ? "secondary" : "default"} className="text-xs">
                    {d.type}
                  </Badge>
                  <p className="text-xs font-medium mt-1">{d.amount}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {canViewRevenue && <CeoDashboardCharts />}
    </div>
  );
}

export default function Dashboard() {
  const { userRole } = useAuth();
  const type = getDashboardType(userRole);

  if (type === "hr") return <HrDashboard />;
  if (type === "manager") return <ManagerKPIDashboard />;
  if (type === "personal") return <PersonalDashboard />;
  return <BusinessDashboard />;
}
