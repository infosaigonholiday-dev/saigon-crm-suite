import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Download, AlertTriangle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { exportToCSV } from "@/lib/exportUtils";
import { Tooltip as UiTooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

const formatVND = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(1) + "tr";
  return v.toLocaleString("vi-VN");
};

export function CashflowReportTab() {
  const currentYear = new Date().getFullYear();

  const { data = [], isLoading } = useQuery({
    queryKey: ["cashflow-report", currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cashflow_monthly")
        .select("month, opening_balance, total_inflow, total_outflow, net_cashflow, closing_balance")
        .eq("year", currentYear)
        .order("month", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const latest = data.length > 0 ? data[data.length - 1] : null;
  const negativeMonths = data.filter((r) => (r.net_cashflow ?? 0) < 0);

  const chartData = data.map((r) => ({
    month: `T${r.month}`,
    inflow: (r.total_inflow ?? 0) / 1_000_000,
    outflow: (r.total_outflow ?? 0) / 1_000_000,
    net: (r.net_cashflow ?? 0) / 1_000_000,
    isNegative: (r.net_cashflow ?? 0) < 0,
  }));

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Dòng tiền — {currentYear}</h2>
        <TooltipProvider>
          <UiTooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => exportToCSV(
                data.map(r => ({
                  Tháng: r.month,
                  'Số dư đầu kỳ': r.opening_balance ?? 0,
                  'Thu vào': r.total_inflow ?? 0,
                  'Chi ra': r.total_outflow ?? 0,
                  'Dòng tiền ròng': r.net_cashflow ?? 0,
                  'Số dư cuối kỳ': r.closing_balance ?? 0,
                })),
                'bao-cao-dong-tien'
              )} disabled={data.length === 0}>
                <Download className="h-4 w-4 mr-2" />Xuất CSV
              </Button>
            </TooltipTrigger>
            <TooltipContent>Tải file CSV — mở bằng Google Sheet hoặc Excel</TooltipContent>
          </UiTooltip>
        </TooltipProvider>
      </div>

      {negativeMonths.length > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span className="font-medium">
            ⚠️ Cảnh báo: dòng tiền âm trong {negativeMonths.length} tháng ({negativeMonths.map((r) => `T${r.month}`).join(", ")})
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Số dư đầu kỳ</p>
            <p className="text-2xl font-bold mt-1">{formatVND(data[0]?.opening_balance ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Số dư cuối kỳ</p>
            <p className="text-2xl font-bold mt-1">{formatVND(latest?.closing_balance ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Dòng tiền ròng tháng gần nhất</p>
            <p className={`text-2xl font-bold mt-1 ${(latest?.net_cashflow ?? 0) < 0 ? "text-destructive" : ""}`}>
              {formatVND(latest?.net_cashflow ?? 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dòng tiền 12 tháng (triệu VNĐ)</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                <Legend />
                <Line type="monotone" dataKey="inflow" name="Thu vào" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="outflow" name="Chi ra" stroke="hsl(0 84% 60%)" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="net" name="Ròng" stroke="hsl(var(--success, 142 71% 45%))" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center py-12 text-muted-foreground">Chưa có dữ liệu</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
