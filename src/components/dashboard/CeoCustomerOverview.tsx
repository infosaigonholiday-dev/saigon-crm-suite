import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, TrendingDown, AlertTriangle, BarChart3, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface CustomerStats {
  totalCustomers: number;
  newThisMonth: number;
  newLastMonth: number;
  topCustomers: { full_name: string; total_revenue: number }[];
  totalLeads: number;
  convertedLeads: number;
  abandonedCustomers: { full_name: string; last_booking_date: string }[];
  departmentStats: { name: string; customers: number; revenue: number }[];
}

function formatVND(value: number) {
  if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + " tỷ";
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(0) + " tr";
  return new Intl.NumberFormat("vi-VN").format(value);
}

export function CeoCustomerOverview() {
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()).toISOString().split("T")[0];

        const [
          { count: totalCustomers },
          { count: newThisMonth },
          { count: newLastMonth },
          { data: topCustomers },
          { count: totalLeads },
          { count: convertedLeads },
          { data: abandonedCustomers },
          { data: departments },
          { data: allCustomers },
        ] = await Promise.all([
          supabase.from("customers").select("*", { count: "exact", head: true }),
          supabase.from("customers").select("*", { count: "exact", head: true }).gte("created_at", startOfMonth),
          supabase.from("customers").select("*", { count: "exact", head: true }).gte("created_at", startOfLastMonth).lte("created_at", endOfLastMonth),
          supabase.from("customers").select("full_name, total_revenue").order("total_revenue", { ascending: false }).limit(5),
          supabase.from("leads").select("*", { count: "exact", head: true }),
          supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", "CONVERTED"),
          supabase.from("customers").select("full_name, last_booking_date").not("last_booking_date", "is", null).lt("last_booking_date", threeMonthsAgo).order("last_booking_date", { ascending: true }).limit(10),
          supabase.from("departments").select("id, name"),
          supabase.from("customers").select("department_id, total_revenue"),
        ]);

        // Build department stats
        const deptMap = new Map<string, { name: string; customers: number; revenue: number }>();
        departments?.forEach((d) => deptMap.set(d.id, { name: d.name, customers: 0, revenue: 0 }));
        allCustomers?.forEach((c) => {
          if (c.department_id && deptMap.has(c.department_id)) {
            const entry = deptMap.get(c.department_id)!;
            entry.customers += 1;
            entry.revenue += Number(c.total_revenue) || 0;
          }
        });

        setStats({
          totalCustomers: totalCustomers || 0,
          newThisMonth: newThisMonth || 0,
          newLastMonth: newLastMonth || 0,
          topCustomers: topCustomers || [],
          totalLeads: totalLeads || 0,
          convertedLeads: convertedLeads || 0,
          abandonedCustomers: abandonedCustomers || [],
          departmentStats: Array.from(deptMap.values()).filter((d) => d.customers > 0),
        });
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) return null;

  const growthPct = stats.newLastMonth > 0
    ? Math.round(((stats.newThisMonth - stats.newLastMonth) / stats.newLastMonth) * 100)
    : stats.newThisMonth > 0 ? 100 : 0;

  const conversionRate = stats.totalLeads > 0
    ? ((stats.convertedLeads / stats.totalLeads) * 100).toFixed(1)
    : "0";

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Tổng quan Khách hàng</h2>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tổng KH</p>
                <p className="text-2xl font-bold mt-1">{new Intl.NumberFormat("vi-VN").format(stats.totalCustomers)}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">KH mới tháng này</p>
                <p className="text-2xl font-bold mt-1">{stats.newThisMonth}</p>
                <div className="flex items-center gap-1 mt-1">
                  {growthPct >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <span className={`text-xs font-medium ${growthPct >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {growthPct >= 0 ? "+" : ""}{growthPct}% so tháng trước
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tỷ lệ Lead → KH</p>
                <p className="text-2xl font-bold mt-1">{conversionRate}%</p>
                <p className="text-xs text-muted-foreground mt-1">{stats.convertedLeads}/{stats.totalLeads} leads</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">KH bỏ quên</p>
                <p className="text-2xl font-bold mt-1">{stats.abandonedCustomers.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Không booking &gt; 3 tháng</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detail row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top 5 revenue customers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 5 KH doanh thu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.topCustomers.map((c, i) => (
              <div key={i} className="flex items-center justify-between pb-2 border-b last:border-0 last:pb-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="outline" className="shrink-0 w-6 h-6 flex items-center justify-center p-0 text-xs">
                    {i + 1}
                  </Badge>
                  <span className="text-sm font-medium truncate">{c.full_name}</span>
                </div>
                <span className="text-sm font-semibold text-primary shrink-0 ml-2">{formatVND(Number(c.total_revenue) || 0)}</span>
              </div>
            ))}
            {stats.topCustomers.length === 0 && (
              <p className="text-sm text-muted-foreground">Chưa có dữ liệu</p>
            )}
          </CardContent>
        </Card>

        {/* Department comparison chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">So sánh hiệu quả giữa các nhánh KD</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.departmentStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stats.departmentStats}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => formatVND(v)} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [formatVND(value), "Doanh thu"]}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Doanh thu" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-10 text-center">Chưa có dữ liệu phòng ban</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Abandoned customers warning */}
      {stats.abandonedCustomers.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              Cảnh báo: Khách hàng không có booking &gt; 3 tháng
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {stats.abandonedCustomers.map((c, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-1">
                  <span className="font-medium truncate">{c.full_name}</span>
                  <span className="text-muted-foreground shrink-0 ml-2">
                    Booking cuối: {new Date(c.last_booking_date).toLocaleDateString("vi-VN")}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
