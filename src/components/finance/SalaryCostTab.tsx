import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const formatVND = (v: number) => new Intl.NumberFormat("vi-VN").format(v) + "đ";

export function SalaryCostTab() {
  const currentYear = new Date().getFullYear();

  const { data: payrollData = [], isLoading } = useQuery({
    queryKey: ["payroll-summary", currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll")
        .select("month, gross_salary, net_salary, bhxh_employee, bhyt_employee, bhtn_employee, bhxh_employer, bhyt_employer, bhtn_employer, pit_amount, total_employer_cost")
        .eq("year", currentYear);
      if (error) throw error;

      const byMonth: Record<number, any> = {};
      for (let m = 1; m <= 12; m++) {
        byMonth[m] = { month: m, gross: 0, net: 0, bhxh_ee: 0, bhxh_er: 0, pit: 0, total_cost: 0, count: 0 };
      }
      (data || []).forEach((r: any) => {
        const m = byMonth[r.month];
        if (m) {
          m.gross += Number(r.gross_salary) || 0;
          m.net += Number(r.net_salary) || 0;
          m.bhxh_ee += (Number(r.bhxh_employee) || 0) + (Number(r.bhyt_employee) || 0) + (Number(r.bhtn_employee) || 0);
          m.bhxh_er += (Number(r.bhxh_employer) || 0) + (Number(r.bhyt_employer) || 0) + (Number(r.bhtn_employer) || 0);
          m.pit += Number(r.pit_amount) || 0;
          m.total_cost += Number(r.total_employer_cost) || 0;
          m.count += 1;
        }
      });
      return Object.values(byMonth);
    },
  });

  const chartData = payrollData.map((m: any) => ({
    month: `T${m.month}`,
    "Lương gross": Math.round(m.gross / 1_000_000),
    "BHXH (CT)": Math.round(m.bhxh_er / 1_000_000),
    "Thuế TNCN": Math.round(m.pit / 1_000_000),
  }));

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Biểu đồ chi phí lương theo tháng (triệu VNĐ)</CardTitle></CardHeader>
        <CardContent>
          {chartData.some((d: any) => d["Lương gross"] > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                <Legend />
                <Bar dataKey="Lương gross" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="BHXH (CT)" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Thuế TNCN" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center py-8 text-muted-foreground">Chưa có dữ liệu lương</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Chi tiết theo tháng</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tháng</TableHead>
                <TableHead className="text-right">Số NV</TableHead>
                <TableHead className="text-right">Lương Gross</TableHead>
                <TableHead className="text-right">BHXH (NV)</TableHead>
                <TableHead className="text-right">BHXH (CT)</TableHead>
                <TableHead className="text-right">Thuế TNCN</TableHead>
                <TableHead className="text-right">Lương Net</TableHead>
                <TableHead className="text-right">Tổng CP CT</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payrollData.filter((m: any) => m.count > 0).map((m: any) => (
                <TableRow key={m.month}>
                  <TableCell>Tháng {m.month}</TableCell>
                  <TableCell className="text-right">{m.count}</TableCell>
                  <TableCell className="text-right">{formatVND(m.gross)}</TableCell>
                  <TableCell className="text-right">{formatVND(m.bhxh_ee)}</TableCell>
                  <TableCell className="text-right">{formatVND(m.bhxh_er)}</TableCell>
                  <TableCell className="text-right">{formatVND(m.pit)}</TableCell>
                  <TableCell className="text-right">{formatVND(m.net)}</TableCell>
                  <TableCell className="text-right font-medium">{formatVND(m.total_cost)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
