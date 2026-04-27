import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Inbox } from "lucide-react";

const STALE = 5 * 60 * 1000;

interface Props {
  departmentId?: string | null;
}

function fmtVND(v: number) {
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1) + "B";
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(0) + "M";
  return new Intl.NumberFormat("vi-VN").format(v);
}

const SOURCE_COLORS: Record<string, string> = {
  FB: "hsl(217 91% 60%)",
  Facebook: "hsl(217 91% 60%)",
  Zalo: "hsl(150 70% 45%)",
  Website: "hsl(270 70% 60%)",
  Web: "hsl(270 70% 60%)",
  Referral: "hsl(180 60% 45%)",
  "Giới thiệu": "hsl(180 60% 45%)",
  Khác: "hsl(220 10% 60%)",
};

function colorFor(name: string, idx: number) {
  if (SOURCE_COLORS[name]) return SOURCE_COLORS[name];
  const palette = [
    "hsl(217 91% 60%)", "hsl(150 70% 45%)", "hsl(270 70% 60%)",
    "hsl(180 60% 45%)", "hsl(30 90% 55%)", "hsl(340 75% 55%)", "hsl(220 10% 60%)",
  ];
  return palette[idx % palette.length];
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
      <Inbox className="h-10 w-10 mb-2 opacity-40" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function CeoFunnelChart({ departmentId }: Props) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data, isLoading } = useQuery({
    queryKey: ["ceo-funnel", departmentId, startOfMonth],
    staleTime: STALE,
    queryFn: async () => {
      const [rawRes, leadRes, bookRes, contractRes] = await Promise.all([
        (async () => {
          let q = supabase.from("raw_contacts").select("id", { count: "exact", head: true }).gte("created_at", startOfMonth);
          if (departmentId) q = q.eq("department_id", departmentId);
          const { count } = await q;
          return count || 0;
        })(),
        (async () => {
          let q = supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", startOfMonth);
          if (departmentId) q = q.eq("department_id", departmentId);
          const { count } = await q;
          return count || 0;
        })(),
        (async () => {
          let q = supabase.from("bookings").select("id", { count: "exact", head: true }).gte("created_at", startOfMonth);
          if (departmentId) q = q.eq("department_id", departmentId);
          const { count } = await q;
          return count || 0;
        })(),
        (async () => {
          const { count } = await supabase
            .from("contracts")
            .select("id", { count: "exact", head: true })
            .gte("created_at", startOfMonth);
          return count || 0;
        })(),
      ]);
      return [
        { stage: "Kho Data", value: rawRes },
        { stage: "Lead", value: leadRes },
        { stage: "Booking", value: bookRes },
        { stage: "Hợp đồng", value: contractRes },
      ];
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Funnel chuyển đổi (tháng này)</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-56" />
        ) : !data || data.every(d => d.value === 0) ? (
          <EmptyState label="Chưa có dữ liệu chuyển đổi" />
        ) : (
          <div className="space-y-3">
            {data.map((row, i) => {
              const max = Math.max(...data.map(d => d.value), 1);
              const widthPct = (row.value / max) * 100;
              const prev = i > 0 ? data[i - 1].value : null;
              const convPct = prev && prev > 0 ? Math.round((row.value / prev) * 100) : null;
              return (
                <div key={row.stage}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{row.stage}</span>
                    <span className="text-muted-foreground">
                      {row.value}{convPct !== null ? ` (${convPct}%)` : ""}
                    </span>
                  </div>
                  <div className="h-7 bg-muted rounded relative overflow-hidden">
                    <div
                      className="h-full bg-primary rounded transition-all"
                      style={{ width: `${Math.max(widthPct, 4)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function CeoSaleRevenueChart({ departmentId }: Props) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data, isLoading } = useQuery({
    queryKey: ["ceo-sale-revenue", departmentId, startOfMonth],
    staleTime: STALE,
    queryFn: async () => {
      let q = supabase
        .from("bookings")
        .select("total_value, sale_id, status, department_id")
        .gte("created_at", startOfMonth);
      if (departmentId) q = q.eq("department_id", departmentId);
      const { data: bookings } = await q;
      const valid = (bookings || []).filter(
        (b: any) => !["cancelled", "CANCELLED"].includes(b.status || "") && b.sale_id
      );
      const map = new Map<string, number>();
      for (const b of valid) {
        map.set(b.sale_id, (map.get(b.sale_id) || 0) + Number(b.total_value || 0));
      }
      const ids = Array.from(map.keys());
      if (!ids.length) return [];
      const { data: emps } = await supabase
        .from("employees")
        .select("profile_id, full_name")
        .in("profile_id", ids);
      const nameMap = new Map<string, string>();
      (emps || []).forEach((e: any) => nameMap.set(e.profile_id, e.full_name));
      return Array.from(map.entries())
        .map(([id, rev]) => ({ name: nameMap.get(id) || "—", revenue: rev }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Doanh thu theo Sale (tháng này)</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-56" />
        ) : !data || data.length === 0 ? (
          <EmptyState label="Chưa có booking trong tháng" />
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(220, data.length * 32)}>
            <BarChart data={data} layout="vertical" margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" tickFormatter={fmtVND} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                formatter={(v: any) => [new Intl.NumberFormat("vi-VN").format(Number(v)) + " đ", "Doanh thu"]}
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function CeoLeadSourceChart({ departmentId }: Props) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data, isLoading } = useQuery({
    queryKey: ["ceo-lead-source", departmentId, startOfMonth],
    staleTime: STALE,
    queryFn: async () => {
      let q = supabase.from("leads").select("channel").gte("created_at", startOfMonth);
      if (departmentId) q = q.eq("department_id", departmentId);
      const { data: rows } = await q;
      const map = new Map<string, number>();
      for (const r of rows || []) {
        const k = (r as any).channel || "Khác";
        map.set(k, (map.get(k) || 0) + 1);
      }
      return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Lead theo nguồn (tháng này)</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-56" />
        ) : !data || data.length === 0 ? (
          <EmptyState label="Chưa có lead trong tháng" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                {data.map((d, i) => (
                  <Cell key={d.name} fill={colorFor(d.name, i)} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
