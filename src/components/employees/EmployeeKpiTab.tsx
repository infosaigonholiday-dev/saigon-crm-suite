import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

function getPctBadge(pct: number) {
  if (pct >= 80) return <Badge className="bg-green-100 text-green-700 border-green-300">{pct}%</Badge>;
  if (pct >= 50) return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">{pct}%</Badge>;
  return <Badge className="bg-red-100 text-red-700 border-red-300">{pct}%</Badge>;
}

function formatValue(value: number, unit: string) {
  if (unit === "currency") {
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(0) + "tr";
    return new Intl.NumberFormat("vi-VN").format(value);
  }
  if (unit === "percent") return value + "%";
  return String(value);
}

interface Props {
  employeeId: string;
}

export function EmployeeKpiTab({ employeeId }: Props) {
  const { user, userRole } = useAuth();
  const qc = useQueryClient();
  const [year, setYear] = useState(new Date().getFullYear());
  const [evalNote, setEvalNote] = useState("");
  const [evalKpiId, setEvalKpiId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const canEval = ["ADMIN", "MANAGER", "GDKD", "DIEUHAN"].includes(userRole || "");

  const { data: kpis = [], isLoading } = useQuery({
    queryKey: ["employee-kpis", employeeId, year],
    queryFn: async () => {
      const { data } = await supabase
        .from("employee_kpis")
        .select("*")
        .eq("employee_id", employeeId)
        .eq("period_year", year)
        .order("period_value")
        .order("kpi_name");
      return data || [];
    },
  });

  // Build trend chart data - average achievement per month
  const monthMap = new Map<number, { total: number; count: number }>();
  kpis.forEach((k: any) => {
    if (k.period_type !== "monthly") return;
    const curr = monthMap.get(k.period_value) || { total: 0, count: 0 };
    curr.total += Number(k.achievement_pct) || 0;
    curr.count += 1;
    monthMap.set(k.period_value, curr);
  });
  const trendData = Array.from({ length: 12 }, (_, i) => {
    const m = monthMap.get(i + 1);
    return { month: `T${i + 1}`, value: m ? Math.round(m.total / m.count) : null };
  });

  const handleEvaluate = async (kpiId: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("employee_kpis")
        .update({
          evaluated_by: user!.id,
          evaluated_at: new Date().toISOString(),
          note: evalNote,
        } as any)
        .eq("id", kpiId);
      if (error) throw error;
      toast.success("Đã lưu đánh giá");
      setEvalKpiId(null);
      setEvalNote("");
      qc.invalidateQueries({ queryKey: ["employee-kpis", employeeId, year] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[2024, 2025, 2026].map(y => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Trend chart */}
      {trendData.some(d => d.value !== null) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Xu hướng KPI {year}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" domain={[0, 120]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* KPI Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Chi tiết KPI</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : kpis.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Chưa có KPI nào</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kỳ</TableHead>
                  <TableHead>Chỉ tiêu</TableHead>
                  <TableHead className="text-right">Mục tiêu</TableHead>
                  <TableHead className="text-right">Thực tế</TableHead>
                  <TableHead className="text-center">Đạt</TableHead>
                  <TableHead>Ghi chú</TableHead>
                  {canEval && <TableHead className="w-16"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {kpis.map((kpi: any) => (
                  <TableRow key={kpi.id}>
                    <TableCell className="text-sm">
                      {kpi.period_type === "monthly" ? `T${kpi.period_value}` : kpi.period_type === "quarterly" ? `Q${kpi.period_value}` : kpi.period_year}
                    </TableCell>
                    <TableCell className="font-medium text-sm">{kpi.kpi_name}</TableCell>
                    <TableCell className="text-right text-sm">{formatValue(Number(kpi.target_value), kpi.unit)}</TableCell>
                    <TableCell className="text-right text-sm">{formatValue(Number(kpi.actual_value), kpi.unit)}</TableCell>
                    <TableCell className="text-center">{getPctBadge(Number(kpi.achievement_pct) || 0)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {evalKpiId === kpi.id ? (
                        <div className="flex gap-1">
                          <Textarea
                            value={evalNote}
                            onChange={e => setEvalNote(e.target.value)}
                            className="h-16 text-xs"
                            placeholder="Nhận xét..."
                          />
                          <Button size="icon" variant="ghost" onClick={() => handleEvaluate(kpi.id)} disabled={saving}>
                            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                          </Button>
                        </div>
                      ) : (
                        kpi.note || "—"
                      )}
                    </TableCell>
                    {canEval && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onClick={() => { setEvalKpiId(kpi.id); setEvalNote(kpi.note || ""); }}
                        >
                          Đánh giá
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
