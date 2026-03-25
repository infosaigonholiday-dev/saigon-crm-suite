import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, TrendingDown, DollarSign, BarChart3 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const formatVND = (v: number | null) => {
  if (!v) return "0";
  if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(1) + "tr";
  return v.toLocaleString("vi-VN");
};

export default function Finance() {
  const currentYear = new Date().getFullYear();

  const { data: pnl = [], isLoading: loadingPnl } = useQuery({
    queryKey: ["profit_loss_monthly", currentYear],
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

  const { data: revenue = [], isLoading: loadingRev } = useQuery({
    queryKey: ["revenue_records", currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revenue_records")
        .select("*")
        .eq("year", currentYear)
        .order("month", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const isLoading = loadingPnl || loadingRev;

  const totalRevenue = pnl.reduce((s, r) => s + (r.gross_revenue ?? 0), 0);
  const totalProfit = pnl.reduce((s, r) => s + (r.net_profit ?? 0), 0);
  const totalBookings = revenue.reduce((s, r) => s + (r.booking_count ?? 0), 0);
  const latestMargin = pnl.length > 0 ? pnl[pnl.length - 1].net_margin_pct ?? 0 : 0;

  const chartData = pnl.map((r) => ({
    month: `T${r.month}`,
    revenue: (r.gross_revenue ?? 0) / 1_000_000,
    profit: (r.net_profit ?? 0) / 1_000_000,
  }));

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const stats = [
    { label: "Doanh thu năm", value: formatVND(totalRevenue), icon: TrendingUp },
    { label: "Lợi nhuận ròng", value: formatVND(totalProfit), icon: DollarSign },
    { label: "Tổng booking", value: totalBookings.toString(), icon: BarChart3 },
    { label: "Biên LN tháng gần nhất", value: latestMargin.toFixed(1) + "%", icon: TrendingDown },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tài chính</h1>
        <p className="text-sm text-muted-foreground">Báo cáo tài chính năm {currentYear}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold mt-1">{s.value}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Doanh thu & Lợi nhuận theo tháng (triệu VNĐ)</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData}>
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
                <Bar dataKey="revenue" name="Doanh thu" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name="Lợi nhuận" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center py-12 text-muted-foreground">Chưa có dữ liệu</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
