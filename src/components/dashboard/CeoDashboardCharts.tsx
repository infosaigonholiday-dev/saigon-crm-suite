import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line,
} from "recharts";
import { Download } from "lucide-react";
import { exportToCSV } from "@/lib/exportUtils";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(142 71% 45%)",
  "hsl(38 92% 50%)",
  "hsl(var(--muted-foreground))",
];

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
};

const formatVND = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(1) + "tr";
  return v.toLocaleString("vi-VN");
};

export function CeoDashboardCharts() {
  const { userRole } = useAuth();
  const currentYear = new Date().getFullYear();
  const isCeo = userRole === "ADMIN";

  // Revenue by department (last 3 months)
  const { data: deptRevenue = [] } = useQuery({
    queryKey: ["ceo-dept-revenue", currentYear],
    queryFn: async () => {
      const now = new Date();
      const months = [now.getMonth() + 1, now.getMonth(), now.getMonth() - 1].filter(m => m > 0);
      const { data } = await supabase
        .from("revenue_records")
        .select("*, departments(name)")
        .eq("year", currentYear)
        .in("month", months)
        .order("month");
      return data || [];
    },
  });

  // Cost breakdown
  const { data: costs = [] } = useQuery({
    queryKey: ["ceo-cost-breakdown", currentYear],
    queryFn: async () => {
      const { data } = await supabase
        .from("cost_records")
        .select("cost_type, amount")
        .eq("year", currentYear);
      return data || [];
    },
  });

  // P&L trend
  const { data: pnl = [] } = useQuery({
    queryKey: ["ceo-pnl-trend", currentYear],
    queryFn: async () => {
      const { data } = await supabase
        .from("profit_loss_monthly")
        .select("month, gross_revenue, net_profit")
        .eq("year", currentYear)
        .order("month");
      return data || [];
    },
  });

  // KPI by department
  const { data: kpiByDept = [] } = useQuery({
    queryKey: ["ceo-kpi-dept", currentYear],
    queryFn: async () => {
      const now = new Date();
      const { data } = await supabase
        .from("employee_kpis")
        .select("achievement_pct, department_id, departments(name)")
        .eq("period_type", "monthly")
        .eq("period_year", currentYear)
        .eq("period_value", now.getMonth() + 1);
      return data || [];
    },
  });

  // Build charts data
  // 1. Revenue by department
  const deptMap = new Map<string, Map<number, number>>();
  const monthsSet = new Set<number>();
  deptRevenue.forEach((r: any) => {
    const name = r.departments?.name || "Khác";
    monthsSet.add(r.month);
    if (!deptMap.has(name)) deptMap.set(name, new Map());
    deptMap.get(name)!.set(r.month, (r.gross_revenue ?? 0) / 1_000_000);
  });
  const deptNames = [...deptMap.keys()];
  const months = [...monthsSet].sort((a, b) => a - b);
  const deptChartData = months.map(m => {
    const row: any = { month: `T${m}` };
    deptNames.forEach(n => { row[n] = deptMap.get(n)?.get(m) || 0; });
    return row;
  });

  // 2. Cost pie
  const costByType = new Map<string, number>();
  costs.forEach((c: any) => {
    const type = c.cost_type || "Khác";
    costByType.set(type, (costByType.get(type) || 0) + (c.amount || 0));
  });
  const costLabels: Record<string, string> = {
    tour: "Tour", salary: "Lương", office: "Văn phòng", marketing: "MKT", other: "Khác",
    TOUR: "Tour", SALARY: "Lương", OFFICE: "Văn phòng", MARKETING: "MKT", OTHER: "Khác",
  };
  const costPieData = [...costByType.entries()].map(([type, value]) => ({
    name: costLabels[type] || type,
    value: Math.round(value / 1_000_000),
  }));

  // 3. P&L trend
  const pnlChartData = pnl.map((r: any) => ({
    month: `T${r.month}`,
    revenue: (r.gross_revenue ?? 0) / 1_000_000,
    profit: (r.net_profit ?? 0) / 1_000_000,
  }));

  // 4. KPI by dept
  const kpiDeptMap = new Map<string, { total: number; count: number }>();
  kpiByDept.forEach((k: any) => {
    const name = (k.departments as any)?.name || "Khác";
    const curr = kpiDeptMap.get(name) || { total: 0, count: 0 };
    curr.total += Number(k.achievement_pct) || 0;
    curr.count += 1;
    kpiDeptMap.set(name, curr);
  });
  const kpiChartData = [...kpiDeptMap.entries()].map(([name, d]) => ({
    name,
    value: d.count > 0 ? Math.round(d.total / d.count) : 0,
  }));

  const handleExportAll = () => {
    const allData: Record<string, any>[] = [];
    pnl.forEach((r: any) => {
      allData.push({ Section: 'P&L', Tháng: r.month, 'Doanh thu': r.gross_revenue, 'LN ròng': r.net_profit });
    });
    costs.forEach((c: any) => {
      allData.push({ Section: 'Chi phí', Loại: c.cost_type, 'Số tiền': c.amount });
    });
    kpiByDept.forEach((k: any) => {
      allData.push({ Section: 'KPI', 'Phòng ban': (k.departments as any)?.name, '% Đạt': k.achievement_pct });
    });
    if (allData.length > 0) exportToCSV(allData, 'bao-cao-tong-hop-ceo');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Tổng quan biểu đồ</h2>
        {isCeo && (
          <Button variant="outline" size="sm" onClick={handleExportAll}>
            <Download className="h-4 w-4 mr-2" />Xuất tất cả báo cáo
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by department */}
        {deptChartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Doanh thu theo phòng KD (triệu VNĐ)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={deptChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  {deptNames.map((name, i) => (
                    <Bar key={name} dataKey={name} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Cost breakdown */}
        {costPieData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cơ cấu chi phí (triệu VNĐ)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={costPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {costPieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Revenue + Profit trend */}
        {pnlChartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Doanh thu & LN ròng 12 tháng (triệu VNĐ)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={pnlChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" name="Doanh thu" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="profit" name="LN ròng" stroke="hsl(142 71% 45%)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* KPI by department */}
        {kpiChartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">KPI trung bình theo phòng ban (%)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={kpiChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" domain={[0, 100]} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" name="% Đạt" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
