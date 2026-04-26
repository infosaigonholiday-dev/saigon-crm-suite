import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

function formatValue(value: number, unit: string) {
  if (unit === "currency") {
    if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + " tỷ";
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(0) + " triệu";
    return new Intl.NumberFormat("vi-VN").format(value);
  }
  if (unit === "percent") return value + "%";
  return String(value);
}

function getProgressColor(pct: number) {
  if (pct >= 80) return "bg-green-500";
  if (pct >= 50) return "bg-yellow-500";
  return "bg-red-500";
}

export function KpiProgressCard() {
  const { user } = useAuth();
  const now = new Date();

  const { data: kpis = [], isLoading } = useQuery({
    queryKey: ["my-kpis", user?.id, now.getMonth() + 1, now.getFullYear()],
    queryFn: async () => {
      // First get my employee id
      const { data: emp } = await supabase
        .from("employees")
        .select("id")
        .eq("profile_id", user!.id)
        .is("deleted_at", null)
        .single();
      if (!emp) return [];

      const { data } = await supabase
        .from("employee_kpis")
        .select("id, kpi_name, target_value, actual_value, achievement_pct, unit")
        .eq("employee_id", emp.id)
        .eq("period_type", "monthly")
        .eq("period_year", now.getFullYear())
        .eq("period_value", now.getMonth() + 1)
        .order("created_at");
      return data || [];
    },
    enabled: !!user,
  });

  if (isLoading || kpis.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          KPI tháng {now.getMonth() + 1}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {kpis.map((kpi: any) => {
          const pct = Number(kpi.achievement_pct) || 0;
          return (
            <div key={kpi.id}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{kpi.kpi_name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatValue(Number(kpi.actual_value) || 0, kpi.unit)} / {formatValue(Number(kpi.target_value) || 0, kpi.unit)}
                </span>
              </div>
              <div className="relative">
                <Progress value={Math.min(pct, 100)} className="h-2.5" />
                <div
                  className={`absolute inset-0 h-2.5 rounded-full ${getProgressColor(pct)} transition-all`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 text-right">{pct}%</p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
