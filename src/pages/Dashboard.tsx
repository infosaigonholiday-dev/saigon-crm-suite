import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { TrendingUp, Users, ClipboardList, CalendarDays, Loader2, Phone, Target, Database } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getDashboardType, useBusinessDashboardData, getDataScope } from "@/hooks/useDashboardData";
import PersonalDashboard from "./PersonalDashboard";
import HrDashboard from "./HrDashboard";
import ManagerKPIDashboard from "./ManagerKPIDashboard";
import { CeoDashboardCharts } from "@/components/dashboard/CeoDashboardCharts";
import { CeoCustomerOverview } from "@/components/dashboard/CeoCustomerOverview";
import { SalePerformanceTable } from "@/components/dashboard/SalePerformanceTable";
import { PipelineFunnel } from "@/components/dashboard/PipelineFunnel";
import { WeeklyTrendChart } from "@/components/dashboard/WeeklyTrendChart";
import LeadMonitoringWidget from "@/components/dashboard/LeadMonitoringWidget";
import { CeoScorecard } from "@/components/dashboard/CeoScorecard";
import { CeoFunnelChart, CeoSaleRevenueChart, CeoLeadSourceChart } from "@/components/dashboard/CeoCharts";
import { CeoFinanceAlerts } from "@/components/dashboard/CeoFinanceAlerts";
import { CeoOperations } from "@/components/dashboard/CeoOperations";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SectionBoundary } from "@/components/SectionBoundary";

function formatVND(value: number) {
  if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + " tỷ";
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(0) + " triệu";
  return new Intl.NumberFormat("vi-VN").format(value);
}

function BusinessDashboard() {
  const { userRole, user } = useAuth();
  const scope = getDataScope(userRole);
  const { stats, revenueByMonth, deadlines, loading } = useBusinessDashboardData();
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);

  const canViewRevenue = ["ADMIN", "KETOAN"].includes(userRole || "");
  const isCeo = ["ADMIN", "SUPER_ADMIN"].includes(userRole || "");
  const isAdmin = userRole === "ADMIN";

  // Fetch departments for ADMIN dropdown
  const { data: departments = [] } = useQuery({
    queryKey: ["departments-list"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("id, name").order("name");
      return data || [];
    },
    enabled: isAdmin,
  });

  // Fetch my department for non-admin
  const { data: myProfile } = useQuery({
    queryKey: ["my-profile-dept", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("department_id").eq("id", user!.id).single();
      return data;
    },
    enabled: !!user && !isAdmin,
  });

  const activeDeptId = isAdmin ? selectedDeptId : myProfile?.department_id;

  // KPI stats for leads
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data: leadKpis } = useQuery({
    queryKey: ["lead-kpis", activeDeptId, startOfMonth],
    queryFn: async () => {
      let leadsQ = supabase.from("leads").select("id, status, created_at");
      if (activeDeptId) leadsQ = leadsQ.eq("department_id", activeDeptId);
      leadsQ = leadsQ.gte("created_at", startOfMonth);
      const { data: newLeads } = await leadsQ;

      let careQ = supabase.from("lead_care_history").select("id, contacted_at")
        .gte("contacted_at", startOfMonth);
      const { data: careCount } = await careQ;

      let intQ = supabase.from("leads").select("id, status")
        .in("status", ["INTERESTED", "PROFILE_SENT", "QUOTE_SENT", "NEGOTIATING"]);
      if (activeDeptId) intQ = intQ.eq("department_id", activeDeptId);
      const { data: interested } = await intQ;

      let wonQ = supabase.from("leads").select("id, status")
        .eq("status", "WON");
      if (activeDeptId) wonQ = wonQ.eq("department_id", activeDeptId);
      const { data: won } = await wonQ;

      return {
        newLeads: newLeads?.length || 0,
        careCount: careCount?.length || 0,
        interested: interested?.length || 0,
        won: won?.length || 0,
      };
    },
  });

  // Raw contacts stats for admin/GDKD
  const { data: rawStats } = useQuery({
    queryKey: ["raw-contacts-admin-stats", activeDeptId],
    queryFn: async () => {
      let q = supabase.from("raw_contacts").select("status");
      if (activeDeptId) q = q.eq("department_id", activeDeptId);
      const { data } = await q;
      if (!data) return null;
      const total = data.length;
      const called = data.filter(d => d.status !== "new").length;
      const interested = data.filter(d => d.status === "called_interested").length;
      const converted = data.filter(d => d.status === "converted_to_lead").length;
      const noAnswer = data.filter(d => d.status === "called_no_answer").length;
      return { total, called, interested, converted, noAnswer, conversionRate: total > 0 ? ((converted / total) * 100).toFixed(1) : "0" };
    },
    enabled: isCeo || userRole === "GDKD",
  });

  const scopeLabel = scope === "all" ? "toàn công ty" : scope === "team" ? "phòng ban" : "cá nhân";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const kpiCards = [
    { label: "Leads mới", value: String(leadKpis?.newLeads || stats.newLeads), icon: ClipboardList, color: "text-blue-600" },
    { label: "Lượt chăm sóc", value: String(leadKpis?.careCount || 0), icon: Phone, color: "text-green-600" },
    { label: "Leads quan tâm", value: String(leadKpis?.interested || 0), icon: Target, color: "text-amber-600" },
    { label: "Tour chốt", value: String(leadKpis?.won || 0), icon: TrendingUp, color: "text-emerald-600" },
  ];

  const statCards = [
    ...(canViewRevenue
      ? [{ label: "Doanh thu tháng", value: formatVND(stats.monthlyRevenue), icon: TrendingUp }]
      : []),
    { label: "Booking mới", value: String(stats.newBookings), icon: CalendarDays },
    { label: "Khách hàng", value: new Intl.NumberFormat("vi-VN").format(stats.customerCount), icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tổng quan hiệu suất</h1>
          <p className="text-muted-foreground text-sm">
            Dữ liệu {scopeLabel} — tháng {now.getMonth() + 1}/{now.getFullYear()}
          </p>
        </div>
        {isAdmin && departments.length > 0 && (
          <Select value={selectedDeptId || "all"} onValueChange={(v) => setSelectedDeptId(v === "all" ? null : v)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Tất cả phòng ban" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả phòng ban</SelectItem>
              {departments.map(d => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Vận hành đoàn / MICE */}
      <SectionBoundary name="Tour Ops"><TourOpsWidgets /></SectionBoundary>

      {/* KPI Cards — Lead performance */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue stats */}
      {canViewRevenue && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
      )}

      {/* Raw Contacts Stats */}
      {rawStats && rawStats.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              Thống kê Kho Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{rawStats.total}</p>
                <p className="text-xs text-muted-foreground">Tổng data</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{rawStats.called}</p>
                <p className="text-xs text-muted-foreground">Đã gọi</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{rawStats.interested}</p>
                <p className="text-xs text-muted-foreground">Quan tâm</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{rawStats.converted}</p>
                <p className="text-xs text-muted-foreground">Chuyển Lead</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{rawStats.conversionRate}%</p>
                <p className="text-xs text-muted-foreground">Tỷ lệ chuyển đổi</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lead monitoring (ADMIN/SUPER_ADMIN/GDKD/MANAGER) */}
      <SectionBoundary name="Giám sát Lead">
        <LeadMonitoringWidget />
      </SectionBoundary>

      {/* === CEO / OPS / FINANCE DASHBOARD SECTIONS === */}
      <SectionBoundary name="Tổng quan điều hành">
        <CeoSections userRole={userRole} departmentId={activeDeptId} />
      </SectionBoundary>

      {/* Sale Performance Table */}
      <SectionBoundary name="Hiệu suất Sale">
        <SalePerformanceTable departmentId={activeDeptId} month={now} />
      </SectionBoundary>

      {/* Funnel + Trend side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionBoundary name="Pipeline Funnel">
          <PipelineFunnel departmentId={activeDeptId} />
        </SectionBoundary>
        <SectionBoundary name="Xu hướng tuần">
          <WeeklyTrendChart departmentId={activeDeptId} />
        </SectionBoundary>
      </div>

      {/* Revenue chart + Deadlines */}
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

      {canViewRevenue && (
        <SectionBoundary name="Biểu đồ doanh thu">
          <CeoDashboardCharts />
        </SectionBoundary>
      )}
      {isCeo && (
        <SectionBoundary name="Tổng quan khách hàng">
          <CeoCustomerOverview />
        </SectionBoundary>
      )}
    </div>
  );
}

function CeoSections({ userRole, departmentId }: { userRole: string | null; departmentId: string | null | undefined }) {
  const role = userRole || "";
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(role);
  const isSalesMgmt = ["GDKD", "MANAGER"].includes(role);
  const isFinance = role === "KETOAN";
  const isOps = role === "DIEUHAN";

  // Section visibility per spec
  const showAll = isAdmin;
  const showScorecard = showAll || isSalesMgmt || isFinance || isOps;
  const showCharts = showAll || isSalesMgmt;
  const showFinance = showAll || isFinance;
  const showOps = showAll || isOps;

  // Department filter: SalesMgmt/Ops always scoped to their dept; Admin uses passed dept; Finance: all
  const scopedDeptId = isFinance ? null : departmentId ?? null;

  if (!showScorecard) return null;

  return (
    <div className="space-y-6 pt-2">
      <div>
        <h2 className="text-lg font-semibold mb-3">Tổng quan điều hành</h2>
        <CeoScorecard departmentId={scopedDeptId} />
      </div>

      {showCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <CeoFunnelChart departmentId={scopedDeptId} />
          <CeoSaleRevenueChart departmentId={scopedDeptId} />
          <CeoLeadSourceChart departmentId={scopedDeptId} />
        </div>
      )}

      {showFinance && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Cảnh báo tài chính</h2>
          <CeoFinanceAlerts />
        </div>
      )}

      {showOps && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Vận hành</h2>
          <CeoOperations />
        </div>
      )}
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
