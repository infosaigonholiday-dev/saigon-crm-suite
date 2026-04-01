import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarDays, Users, ClipboardList, TrendingUp, TrendingDown, Loader2, Target, Phone, Circle, MapPin, Plus, BarChart3 } from "lucide-react";
import { KpiTeamTable } from "@/components/kpi/KpiTeamTable";
import { KpiSetDialog } from "@/components/kpi/KpiSetDialog";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, addDays, differenceInCalendarDays } from "date-fns";

function formatVND(value: number) {
  if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + " tỷ";
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(0) + " triệu";
  return new Intl.NumberFormat("vi-VN").format(value);
}

export default function ManagerKPIDashboard() {
  const { user } = useAuth();
  const now = new Date();
  const [kpiDialogOpen, setKpiDialogOpen] = useState(false);
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const startOfMonth = new Date(currentYear, now.getMonth(), 1).toISOString();
  const startOfLastMonth = new Date(currentYear, now.getMonth() - 1, 1).toISOString();
  const endOfLastMonth = new Date(currentYear, now.getMonth(), 1).toISOString();

  const { data: profile } = useQuery({
    queryKey: ["my-profile-dept", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("department_id")
        .eq("id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const departmentId = profile?.department_id;

  // Sale targets for department this month
  const { data: targets } = useQuery({
    queryKey: ["manager-targets", departmentId, currentMonth, currentYear],
    queryFn: async () => {
      const { data } = await supabase
        .from("sale_targets")
        .select("target_revenue, actual_revenue, sale_id")
        .eq("department_id", departmentId!)
        .eq("month", currentMonth)
        .eq("year", currentYear);
      return data || [];
    },
    enabled: !!departmentId,
  });

  // Bookings this month (department)
  const { data: bookingsThisMonth } = useQuery({
    queryKey: ["manager-bookings-month", departmentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("id, total_value, sale_id")
        .eq("department_id", departmentId!)
        .gte("created_at", startOfMonth);
      return data || [];
    },
    enabled: !!departmentId,
  });

  // Bookings last month (for comparison)
  const { data: bookingsLastMonth } = useQuery({
    queryKey: ["manager-bookings-last-month", departmentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("id, total_value")
        .eq("department_id", departmentId!)
        .gte("created_at", startOfLastMonth)
        .lt("created_at", endOfLastMonth);
      return data || [];
    },
    enabled: !!departmentId,
  });

  // New customers this month
  const { data: newCustomerCount } = useQuery({
    queryKey: ["manager-customers-month", departmentId],
    queryFn: async () => {
      const { count } = await supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("department_id", departmentId!)
        .gte("created_at", startOfMonth);
      return count || 0;
    },
    enabled: !!departmentId,
  });

  // Pipeline (active leads)
  const { data: pipelineValue } = useQuery({
    queryKey: ["manager-pipeline", departmentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("leads")
        .select("expected_value")
        .eq("department_id", departmentId!)
        .in("status", ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL"]);
      return (data || []).reduce((s, l) => s + (Number(l.expected_value) || 0), 0);
    },
    enabled: !!departmentId,
  });

  // Sales ranking - get profiles for names
  const { data: profiles } = useQuery({
    queryKey: ["manager-sale-profiles", departmentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("department_id", departmentId!);
      return data || [];
    },
    enabled: !!departmentId,
  });
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const threeDaysLater = format(addDays(new Date(), 3), "yyyy-MM-dd");

  const { data: followUpLeads = [] } = useQuery({
    queryKey: ["manager-follow-up-leads", departmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id, full_name, follow_up_date, temperature, destination, assigned_to")
        .eq("department_id", departmentId!)
        .not("follow_up_date", "is", null)
        .lte("follow_up_date", threeDaysLater)
        .order("follow_up_date");
      if (error) throw error;
      return data || [];
    },
    enabled: !!departmentId,
  });

  const totalTarget = (targets || []).reduce((s, t) => s + (Number(t.target_revenue) || 0), 0);
  const revenueThisMonth = (bookingsThisMonth || []).reduce((s, b) => s + (Number(b.total_value) || 0), 0);
  const revenueLastMonth = (bookingsLastMonth || []).reduce((s, b) => s + (Number(b.total_value) || 0), 0);
  const achievementPct = totalTarget > 0 ? Math.round((revenueThisMonth / totalTarget) * 100) : 0;
  const growthPct = revenueLastMonth > 0
    ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth * 100).toFixed(1)
    : "0";
  const isGrowth = Number(growthPct) >= 0;

  // Build sales ranking
  const profileMap = new Map((profiles || []).map((p) => [p.id, p.full_name]));
  const salesMap = new Map<string, { revenue: number; bookings: number }>();
  (bookingsThisMonth || []).forEach((b) => {
    if (!b.sale_id) return;
    const curr = salesMap.get(b.sale_id) || { revenue: 0, bookings: 0 };
    curr.revenue += Number(b.total_value) || 0;
    curr.bookings += 1;
    salesMap.set(b.sale_id, curr);
  });
  const salesRanking = Array.from(salesMap.entries())
    .map(([id, data]) => ({ id, name: profileMap.get(id) || "N/A", ...data }))
    .sort((a, b) => b.revenue - a.revenue);

  const loading = !profile;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">KPI Phòng ban</h1>
          <p className="text-muted-foreground text-sm">
            Tháng {currentMonth}/{currentYear}
          </p>
        </div>
        <Badge variant={isGrowth ? "default" : "destructive"} className="text-sm gap-1">
          {isGrowth ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          {isGrowth ? "+" : ""}{growthPct}% so với tháng trước
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Target card with progress */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-muted-foreground">Target doanh thu</p>
                <p className="text-2xl font-bold mt-1">{formatVND(revenueThisMonth)}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-primary" />
              </div>
            </div>
            <Progress value={Math.min(achievementPct, 100)} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1.5">
              {achievementPct}% / {formatVND(totalTarget)} target
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Booking mới</p>
                <p className="text-2xl font-bold mt-1">{bookingsThisMonth?.length || 0}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CalendarDays className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">KH mới tháng</p>
                <p className="text-2xl font-bold mt-1">{newCustomerCount || 0}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pipeline value</p>
                <p className="text-2xl font-bold mt-1">{formatVND(pipelineValue || 0)}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPI Section */}
      <ManagerKpiSection departmentId={departmentId} profileMap={profileMap} />

      {/* Sales Ranking Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Xếp hạng Sale trong nhánh</CardTitle>
        </CardHeader>
        <CardContent>
          {salesRanking.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Chưa có dữ liệu booking tháng này</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Tên Sale</TableHead>
                  <TableHead className="text-right">Doanh thu</TableHead>
                  <TableHead className="text-right">Số booking</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesRanking.map((sale, i) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">
                      {i < 3 ? (
                        <Badge variant={i === 0 ? "default" : "secondary"} className="w-7 justify-center">
                          {i + 1}
                        </Badge>
                      ) : (
                        i + 1
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{sale.name}</TableCell>
                    <TableCell className="text-right">{formatVND(sale.revenue)}</TableCell>
                    <TableCell className="text-right">{sale.bookings}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Follow-up Leads (team) */}
      {followUpLeads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" />
              Lead cần follow-up (team) ({followUpLeads.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {followUpLeads.map((lead) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const followDate = new Date(lead.follow_up_date!);
                followDate.setHours(0, 0, 0, 0);
                const diff = differenceInCalendarDays(followDate, today);
                const tempColors: Record<string, string> = { hot: "text-red-500", warm: "text-orange-500", cold: "text-blue-500" };
                const saleName = profileMap.get(lead.assigned_to ?? "") || "Chưa gán";

                return (
                  <div key={lead.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                    <Circle className={`h-3 w-3 shrink-0 fill-current ${tempColors[lead.temperature ?? "warm"] || "text-muted-foreground"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{lead.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {saleName}
                        {lead.destination && <> · <MapPin className="h-3 w-3 inline" /> {lead.destination}</>}
                      </p>
                    </div>
                    {diff < 0 ? (
                      <Badge variant="destructive" className="shrink-0 text-xs">Quá hạn {Math.abs(diff)} ngày</Badge>
                    ) : diff === 0 ? (
                      <Badge className="bg-orange-100 text-orange-700 border-orange-300 shrink-0 text-xs">Hôm nay</Badge>
                    ) : (
                      <Badge className="bg-blue-50 text-blue-600 border-blue-200 shrink-0 text-xs">Còn {diff} ngày</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
