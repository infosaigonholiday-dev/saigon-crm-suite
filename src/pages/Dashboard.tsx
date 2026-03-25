import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, Users, ClipboardList, CalendarDays } from "lucide-react";

const revenueData = [
  { month: "T1", value: 320 },
  { month: "T2", value: 280 },
  { month: "T3", value: 450 },
  { month: "T4", value: 380 },
  { month: "T5", value: 520 },
  { month: "T6", value: 610 },
  { month: "T7", value: 780 },
  { month: "T8", value: 720 },
  { month: "T9", value: 590 },
  { month: "T10", value: 680 },
  { month: "T11", value: 820 },
  { month: "T12", value: 950 },
];

const stats = [
  { label: "Doanh thu tháng", value: "1.2 tỷ", change: "+12%", icon: TrendingUp, positive: true },
  { label: "Booking mới", value: "48", change: "+8%", icon: CalendarDays, positive: true },
  { label: "Lead mới", value: "126", change: "+23%", icon: ClipboardList, positive: true },
  { label: "Khách hàng", value: "1,840", change: "+5%", icon: Users, positive: true },
];

const deadlines = [
  { customer: "Nguyễn Văn A", tour: "Phú Quốc 4N3Đ", type: "Đặt cọc", amount: "5,000,000đ" },
  { customer: "Trần Thị B", tour: "Đà Nẵng 3N2Đ", type: "Thanh toán", amount: "12,000,000đ" },
  { customer: "Lê Hoàng C", tour: "Nha Trang 5N4Đ", type: "Đặt cọc", amount: "8,000,000đ" },
  { customer: "Phạm Minh D", tour: "Sapa 4N3Đ", type: "Thanh toán", amount: "15,000,000đ" },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tổng quan</h1>
        <p className="text-muted-foreground text-sm">Xin chào, chúc bạn ngày làm việc hiệu quả!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  <span className="text-xs text-success font-medium">{stat.change} so với tháng trước</span>
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Doanh thu 12 tháng (triệu VNĐ)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
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
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Deadline hôm nay</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {deadlines.map((d, i) => (
              <div key={i} className="flex items-start justify-between gap-2 pb-3 border-b last:border-0 last:pb-0">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{d.customer}</p>
                  <p className="text-xs text-muted-foreground truncate">{d.tour}</p>
                </div>
                <div className="text-right shrink-0">
                  <Badge variant={d.type === "Đặt cọc" ? "secondary" : "default"} className="text-xs">
                    {d.type}
                  </Badge>
                  <p className="text-xs font-medium mt-1">{d.amount}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
