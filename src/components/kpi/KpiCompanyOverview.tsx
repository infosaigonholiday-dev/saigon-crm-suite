import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Target, TrendingUp, TrendingDown, Users } from "lucide-react";

export function KpiCompanyOverview() {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year] = useState(now.getFullYear());

  const { data: allKpis = [] } = useQuery({
    queryKey: ["hr-kpi-overview", month, year],
    queryFn: async () => {
      const { data } = await supabase
        .from("employee_kpis")
        .select("*, employees(full_name, department_id, departments(name))")
        .eq("period_type", "monthly")
        .eq("period_year", year)
        .eq("period_value", Number(month));
      return data || [];
    },
  });

  // Stats
  const totalEmployeesWithKpi = new Set(allKpis.map((k: any) => k.employee_id)).size;
  const above80 = new Set(allKpis.filter((k: any) => Number(k.achievement_pct) >= 80).map((k: any) => k.employee_id)).size;
  const below50 = new Set(allKpis.filter((k: any) => Number(k.achievement_pct) < 50).map((k: any) => k.employee_id)).size;

  // Group by department for chart
  const deptMap = new Map<string, { name: string; total: number; count: number }>();
  allKpis.forEach((k: any) => {
    const deptName = (k.employees as any)?.departments?.name || "Không rõ";
    const curr = deptMap.get(deptName) || { name: deptName, total: 0, count: 0 };
    curr.total += Number(k.achievement_pct) || 0;
    curr.count += 1;
    deptMap.set(deptName, curr);
  });
  const chartData = Array.from(deptMap.values()).map(d => ({
    name: d.name,
    value: d.count > 0 ? Math.round(d.total / d.count) : 0,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" /> KPI toàn công ty
        </h3>
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Array.from({ length: 12 }, (_, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>Tháng {i + 1}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">NV có KPI</p>
              <p className="text-xl font-bold">{totalEmployeesWithKpi}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Đạt ≥ 80%</p>
              <p className="text-xl font-bold text-green-600">{above80}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Dưới 50%</p>
              <p className="text-xl font-bold text-red-600">{below50}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Trung bình KPI theo phòng ban (%)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" domain={[0, 100]} />
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
    </div>
  );
}
