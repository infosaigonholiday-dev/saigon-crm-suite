import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { ArrowLeft, Loader2, User, CreditCard, TrendingUp, CalendarDays } from "lucide-react";

function fmt(n: number | null) {
  if (!n) return "0";
  return new Intl.NumberFormat("vi-VN").format(n);
}

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: customer, isLoading } = useQuery({
    queryKey: ["customer", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ["customer-bookings", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, code, status, total_value, deposit_amount, remaining_amount, created_at, pax_total")
        .eq("customer_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["customer-payments", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("id, amount, payment_type, method, paid_at, bank_ref_code, booking_id, bookings!inner(code, customer_id)")
        .eq("bookings.customer_id", id!)
        .order("paid_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Monthly chart data from bookings
  const chartData = (() => {
    const map: Record<string, { month: string; revenue: number; paid: number }> = {};
    bookings.forEach((b) => {
      const d = new Date(b.created_at!);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!map[key]) map[key] = { month: key, revenue: 0, paid: 0 };
      map[key].revenue += Number(b.total_value) || 0;
    });
    payments.forEach((p) => {
      if (!p.paid_at) return;
      const d = new Date(p.paid_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!map[key]) map[key] = { month: key, revenue: 0, paid: 0 };
      map[key].paid += Number(p.amount) || 0;
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
  })();

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!customer) {
    return <div className="text-center py-20 text-muted-foreground">Không tìm thấy khách hàng</div>;
  }

  const stats = [
    { label: "Tổng booking", value: customer.total_bookings ?? 0, icon: CalendarDays },
    { label: "Doanh thu", value: fmt(customer.total_revenue), icon: TrendingUp },
    { label: "Đã thanh toán", value: fmt(customer.total_paid), icon: CreditCard },
    { label: "Còn nợ", value: fmt((customer.total_revenue ?? 0) - (customer.total_paid ?? 0)), icon: User },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/khach-hang")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{customer.full_name}</h1>
          <p className="text-sm text-muted-foreground">
            {customer.phone ?? ""} {customer.email ? `• ${customer.email}` : ""}
          </p>
        </div>
        <Badge variant="outline" className="ml-auto">{customer.segment ?? "NEW"}</Badge>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-lg font-bold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="bookings">
        <TabsList>
          <TabsTrigger value="bookings">Bookings ({bookings.length})</TabsTrigger>
          <TabsTrigger value="payments">Thanh toán ({payments.length})</TabsTrigger>
          <TabsTrigger value="chart">Xu hướng</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Pax</TableHead>
                    <TableHead className="text-right">Tổng tiền</TableHead>
                    <TableHead className="text-right">Đặt cọc</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.code}</TableCell>
                      <TableCell><Badge variant="outline">{b.status}</Badge></TableCell>
                      <TableCell className="text-right">{b.pax_total}</TableCell>
                      <TableCell className="text-right">{fmt(b.total_value)}</TableCell>
                      <TableCell className="text-right">{fmt(b.deposit_amount)}</TableCell>
                      <TableCell>{b.created_at ? new Date(b.created_at).toLocaleDateString("vi-VN") : "—"}</TableCell>
                    </TableRow>
                  ))}
                  {bookings.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chưa có booking</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Phương thức</TableHead>
                    <TableHead className="text-right">Số tiền</TableHead>
                    <TableHead>Ref</TableHead>
                    <TableHead>Ngày TT</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.bookings?.code ?? "—"}</TableCell>
                      <TableCell>{p.payment_type ?? "—"}</TableCell>
                      <TableCell>{p.method ?? "—"}</TableCell>
                      <TableCell className="text-right">{fmt(p.amount)}</TableCell>
                      <TableCell>{p.bank_ref_code ?? "—"}</TableCell>
                      <TableCell>{p.paid_at ? new Date(p.paid_at).toLocaleDateString("vi-VN") : "—"}</TableCell>
                    </TableRow>
                  ))}
                  {payments.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chưa có thanh toán</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chart">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Xu hướng doanh thu & thanh toán theo tháng</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Chưa có dữ liệu</p>
              ) : (
                <ChartContainer config={{
                  revenue: { label: "Doanh thu", color: "hsl(var(--primary))" },
                  paid: { label: "Đã TT", color: "hsl(var(--accent))" },
                }} className="h-[300px]">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="paid" fill="var(--color-paid)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
