import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Download } from "lucide-react";
import { Tooltip as UiTooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { exportToCSV } from "@/lib/exportUtils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { useState } from "react";

const formatVND = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(1) + "tr";
  return v.toLocaleString("vi-VN");
};

interface RevenueReportTabProps {
  departmentFilter?: string | null;
}

export function RevenueReportTab({ departmentFilter }: RevenueReportTabProps) {
  const [year, setYear] = useState(new Date().getFullYear());

  const { data = [], isLoading } = useQuery({
    queryKey: ["revenue-report", year, departmentFilter],
    queryFn: async () => {
      let query = supabase
        .from("revenue_records")
        .select("id, month, booking_count, gross_revenue, net_revenue, department_id")
        .eq("year", year)
        .order("month", { ascending: true });
      if (departmentFilter) {
        query = query.eq("department_id", departmentFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const chartData = data.map((r) => ({
    month: `T${r.month}`,
    revenue: (r.gross_revenue ?? 0) / 1_000_000,
  }));

  const totalRevenue = data.reduce((s, r) => s + (r.gross_revenue ?? 0), 0);
  const totalBookings = data.reduce((s, r) => s + (r.booking_count ?? 0), 0);

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Báo cáo doanh thu</h2>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <UiTooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => exportToCSV(
                  data.map(r => ({ Tháng: r.month, Booking: r.booking_count ?? 0, 'Doanh thu': r.gross_revenue ?? 0, 'Doanh thu ròng': r.net_revenue ?? 0 })),
                  'bao-cao-doanh-thu'
                )}>
                  <Download className="h-4 w-4 mr-2" />Xuất CSV
                </Button>
              </TooltipTrigger>
              <TooltipContent>Tải file CSV — mở bằng Google Sheet hoặc Excel</TooltipContent>
            </UiTooltip>
          </TooltipProvider>
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[2024, 2025, 2026].map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Tổng doanh thu năm</p>
            <p className="text-2xl font-bold mt-1">{formatVND(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Tổng booking</p>
            <p className="text-2xl font-bold mt-1">{totalBookings}</p>
          </CardContent>
        </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Doanh thu theo tháng (triệu VNĐ)</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                <Bar dataKey="revenue" name="Doanh thu" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center py-12 text-muted-foreground">Chưa có dữ liệu</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Chi tiết theo tháng</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tháng</TableHead>
                <TableHead className="text-right">Booking</TableHead>
                <TableHead className="text-right">Doanh thu</TableHead>
                <TableHead className="text-right">Doanh thu ròng</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>Tháng {r.month}</TableCell>
                  <TableCell className="text-right">{r.booking_count ?? 0}</TableCell>
                  <TableCell className="text-right">{formatVND(r.gross_revenue ?? 0)}</TableCell>
                  <TableCell className="text-right">{formatVND(r.net_revenue ?? 0)}</TableCell>
                </TableRow>
              ))}
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">Chưa có dữ liệu</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
