import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, CalendarDays, Users, Wallet } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const STALE = 5 * 60 * 1000;

function fmtVND(value: number) {
  if (Math.abs(value) >= 1_000_000_000) return (value / 1_000_000_000).toFixed(2) + " tỷ";
  if (Math.abs(value) >= 1_000_000) return (value / 1_000_000).toFixed(0) + " tr";
  return new Intl.NumberFormat("vi-VN").format(value) + " đ";
}

interface Props {
  departmentId?: string | null;
}

export function CeoScorecard({ departmentId }: Props) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const { data, isLoading } = useQuery({
    queryKey: ["ceo-scorecard", departmentId, startOfMonth],
    staleTime: STALE,
    queryFn: async () => {
      // Revenue (bookings)
      let bQ = supabase
        .from("bookings")
        .select("total_value, status, sale_id, department_id")
        .gte("created_at", startOfMonth);
      if (departmentId) bQ = bQ.eq("department_id", departmentId);
      const { data: bookings } = await bQ;
      const validBookings = (bookings || []).filter(
        (b: any) => !["cancelled", "CANCELLED", "Cancelled"].includes(b.status || "")
      );
      const monthlyRevenue = validBookings.reduce(
        (s: number, b: any) => s + Number(b.total_value || 0),
        0
      );
      const newBookings = validBookings.length;

      // Leads
      let lQ = supabase.from("leads").select("id").gte("created_at", startOfMonth);
      if (departmentId) lQ = lQ.eq("department_id", departmentId);
      const { data: leads } = await lQ;

      // Cashflow: payments in vs transactions out
      const { data: payments } = await supabase
        .from("payments")
        .select("amount, paid_at, created_at")
        .gte("created_at", startOfMonth);
      const inflow = (payments || []).reduce(
        (s: number, p: any) => s + Number(p.amount || 0),
        0
      );

      // Transactions trong hệ thống đều là chi phí; thu nằm ở payments
      const { data: txs } = await supabase
        .from("transactions")
        .select("amount, approval_status, created_at")
        .gte("created_at", startOfMonth)
        .eq("approval_status", "APPROVED");
      const outflow = (txs || []).reduce(
        (s: number, t: any) => s + Number(t.amount || 0),
        0
      );

      // Sale target (sum of targets in current month)
      let tQ = supabase
        .from("sale_targets")
        .select("target_revenue, sale_id, department_id")
        .eq("year", year)
        .eq("month", month);
      if (departmentId) tQ = tQ.eq("department_id", departmentId);
      const { data: targets } = await tQ;
      const targetRevenue = (targets || []).reduce(
        (s: number, t: any) => s + Number(t.target_revenue || 0),
        0
      );

      return {
        monthlyRevenue,
        targetRevenue,
        newBookings,
        newLeads: leads?.length || 0,
        inflow,
        outflow,
        cashflow: inflow - outflow,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const achievementPct =
    data.targetRevenue > 0 ? (data.monthlyRevenue / data.targetRevenue) * 100 : null;

  let revColor = "text-emerald-600";
  if (achievementPct !== null) {
    if (achievementPct < 50) revColor = "text-destructive";
    else if (achievementPct < 80) revColor = "text-amber-600";
  }

  const cashflowColor = data.cashflow >= 0 ? "text-emerald-600" : "text-destructive";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Doanh thu tháng</p>
              <p className={`text-2xl font-bold mt-1 ${revColor}`}>{fmtVND(data.monthlyRevenue)}</p>
              {data.targetRevenue > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Mục tiêu {fmtVND(data.targetRevenue)} ({achievementPct!.toFixed(0)}%)
                </p>
              )}
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Booking mới</p>
              <p className="text-2xl font-bold mt-1">{data.newBookings}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Lead mới</p>
              <p className="text-2xl font-bold mt-1">{data.newLeads}</p>
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
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Dòng tiền tháng</p>
              <p className={`text-2xl font-bold mt-1 ${cashflowColor}`}>{fmtVND(data.cashflow)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Thu {fmtVND(data.inflow)} – Chi {fmtVND(data.outflow)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default CeoScorecard;
