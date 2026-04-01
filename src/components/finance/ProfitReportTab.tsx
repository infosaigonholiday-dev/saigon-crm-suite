import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, DollarSign, Download } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { exportToCSV } from "@/lib/exportUtils";

const formatVND = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(1) + "tr";
  return v.toLocaleString("vi-VN");
};

export function ProfitReportTab() {
  const currentYear = new Date().getFullYear();

  const { data = [], isLoading } = useQuery({
    queryKey: ["profit-report", currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profit_loss_monthly")
        .select("*")
        .eq("year", currentYear)
        .order("month", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const totalGrossProfit = data.reduce((s, r) => s + (r.gross_profit ?? 0), 0);
  const totalNetProfit = data.reduce((s, r) => s + (r.net_profit ?? 0), 0);

  const chartData = data.map((r) => ({
    month: `T${r.month}`,
    grossProfit: (r.gross_profit ?? 0) / 1_000_000,
    netProfit: (r.net_profit ?? 0) / 1_000_000,
  }));

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Báo cáo lợi nhuận — {currentYear}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Lợi nhuận gộp</p>
                <p className="text-2xl font-bold mt-1">{formatVND(totalGrossProfit)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Doanh thu - Chi phí tour trực tiếp</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Lợi nhuận ròng</p>
                <p className="text-2xl font-bold mt-1">{formatVND(totalNetProfit)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Doanh thu - Tổng OPEX</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Xu hướng lợi nhuận 12 tháng (triệu VNĐ)</CardTitle>
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
                <Line type="monotone" dataKey="grossProfit" name="LN gộp" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="netProfit" name="LN ròng" stroke="hsl(var(--success, 142 71% 45%))" strokeWidth={2} dot={{ r: 3 }} />
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
