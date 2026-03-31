import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export function ExpenseSummaryTab() {
  const currentYear = new Date().getFullYear();

  const { data: chartData = [], isLoading } = useQuery({
    queryKey: ["opex-summary", currentYear],
    queryFn: async () => {
      // Fetch all expense sources in parallel
      const [payrollRes, officeRes, mktRes, otherRes, txnRes] = await Promise.all([
        supabase.from("payroll").select("month, total_employer_cost").eq("year", currentYear),
        supabase.from("office_expenses").select("amount, expense_date").gte("expense_date", `${currentYear}-01-01`).lt("expense_date", `${currentYear + 1}-01-01`),
        supabase.from("marketing_expenses").select("amount, expense_date").gte("expense_date", `${currentYear}-01-01`).lt("expense_date", `${currentYear + 1}-01-01`),
        supabase.from("other_expenses").select("amount, expense_date").gte("expense_date", `${currentYear}-01-01`).lt("expense_date", `${currentYear + 1}-01-01`),
        supabase.from("transactions").select("amount, transaction_date, category").eq("type", "EXPENSE").in("category", ["OFFICE_RENT", "UTILITIES", "PHONE", "PARKING"]).gte("transaction_date", `${currentYear}-01-01`).lt("transaction_date", `${currentYear + 1}-01-01`),
      ]);

      const months: Record<number, any> = {};
      for (let m = 1; m <= 12; m++) {
        months[m] = { month: `T${m}`, "Lương": 0, "Văn phòng": 0, "Marketing": 0, "Vận hành": 0, "Khác": 0 };
      }

      // Payroll
      (payrollRes.data || []).forEach((r: any) => {
        if (months[r.month]) months[r.month]["Lương"] += Math.round((Number(r.total_employer_cost) || 0) / 1_000_000);
      });

      // Office expenses
      (officeRes.data || []).forEach((r: any) => {
        const m = new Date(r.expense_date).getMonth() + 1;
        if (months[m]) months[m]["Văn phòng"] += Math.round((Number(r.amount) || 0) / 1_000_000);
      });

      // Marketing
      (mktRes.data || []).forEach((r: any) => {
        const m = new Date(r.expense_date).getMonth() + 1;
        if (months[m]) months[m]["Marketing"] += Math.round((Number(r.amount) || 0) / 1_000_000);
      });

      // Other
      (otherRes.data || []).forEach((r: any) => {
        const m = new Date(r.expense_date).getMonth() + 1;
        if (months[m]) months[m]["Khác"] += Math.round((Number(r.amount) || 0) / 1_000_000);
      });

      // Transactions (OPEX categories)
      (txnRes.data || []).forEach((r: any) => {
        const m = new Date(r.transaction_date).getMonth() + 1;
        if (months[m]) months[m]["Vận hành"] += Math.round((Number(r.amount) || 0) / 1_000_000);
      });

      return Object.values(months);
    },
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const hasData = chartData.some((d: any) => d["Lương"] > 0 || d["Văn phòng"] > 0 || d["Marketing"] > 0 || d["Vận hành"] > 0 || d["Khác"] > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tổng hợp chi phí vận hành theo tháng (triệu VNĐ)</CardTitle>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
              <Legend />
              <Bar dataKey="Lương" stackId="a" fill="hsl(var(--primary))" />
              <Bar dataKey="Văn phòng" stackId="a" fill="hsl(var(--accent))" />
              <Bar dataKey="Marketing" stackId="a" fill="hsl(var(--warning))" />
              <Bar dataKey="Vận hành" stackId="a" fill="hsl(var(--success))" />
              <Bar dataKey="Khác" stackId="a" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center py-12 text-muted-foreground">Chưa có dữ liệu chi phí</p>
        )}
      </CardContent>
    </Card>
  );
}
