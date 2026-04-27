import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { ArrowRight, Inbox } from "lucide-react";

const STALE = 5 * 60 * 1000;

function fmt(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + " đ";
}

function Empty() {
  return (
    <div className="flex flex-col items-center py-6 text-muted-foreground text-xs">
      <Inbox className="h-7 w-7 mb-1 opacity-40" />
      <p>Không có dữ liệu</p>
    </div>
  );
}

export function FinanceOverdueAR() {
  const today = new Date().toISOString().split("T")[0];

  const { data, isLoading } = useQuery({
    queryKey: ["finance-overdue-ar"],
    staleTime: STALE,
    queryFn: async () => {
      const { data: ar } = await supabase
        .from("accounts_receivable")
        .select("id, customer_id, amount_remaining, due_date, status")
        .lt("due_date", today)
        .gt("amount_remaining", 0)
        .order("due_date", { ascending: true })
        .limit(5);
      const ids = Array.from(new Set((ar || []).map((r: any) => r.customer_id).filter(Boolean)));
      let nameMap = new Map<string, string>();
      if (ids.length) {
        const { data: cs } = await supabase.from("customers").select("id, full_name").in("id", ids);
        (cs || []).forEach((c: any) => nameMap.set(c.id, c.full_name));
      }
      return (ar || []).map((r: any) => ({
        ...r,
        customer_name: nameMap.get(r.customer_id) || "—",
        days_overdue: Math.floor((Date.now() - new Date(r.due_date).getTime()) / 86400000),
      }));
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3 flex-row items-center justify-between">
        <CardTitle className="text-base">Công nợ quá hạn</CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link to="/tai-chinh?tab=debt">Xem <ArrowRight className="h-3 w-3" /></Link>
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <Skeleton className="h-32" />
        ) : !data || data.length === 0 ? (
          <Empty />
        ) : (
          <div className="space-y-2">
            {data.map((r) => (
              <Link
                key={r.id}
                to={`/khach-hang/${r.customer_id}`}
                className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-muted/50 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{r.customer_name}</p>
                  <p className="text-xs text-destructive">Quá {r.days_overdue} ngày</p>
                </div>
                <span className="font-medium text-sm shrink-0">{fmt(Number(r.amount_remaining))}</span>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function FinancePendingExpenses() {
  const { data, isLoading } = useQuery({
    queryKey: ["finance-pending-tx"],
    staleTime: STALE,
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("id, description, amount, approval_status, created_at")
        .in("approval_status", ["PENDING_HR", "PENDING_REVIEW", "PENDING"])
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3 flex-row items-center justify-between">
        <CardTitle className="text-base">Chi phí chờ duyệt</CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link to="/tai-chinh?tab=approval">Xem <ArrowRight className="h-3 w-3" /></Link>
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <Skeleton className="h-32" />
        ) : !data || data.length === 0 ? (
          <Empty />
        ) : (
          <div className="space-y-2">
            {data.map((r: any) => (
              <Link
                key={r.id}
                to="/tai-chinh?tab=approval"
                className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-muted/50 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{r.description || "Chi phí"}</p>
                  <Badge variant="outline" className="text-[10px] mt-0.5">{r.approval_status}</Badge>
                </div>
                <span className="font-medium shrink-0">{fmt(Number(r.amount))}</span>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function FinancePendingBudgets() {
  const { data, isLoading } = useQuery({
    queryKey: ["finance-pending-budgets"],
    staleTime: STALE,
    queryFn: async () => {
      const [estRes, settleRes] = await Promise.all([
        supabase
          .from("budget_estimates")
          .select("id, code, total_estimated, status, created_at")
          .like("status", "pending_%")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("budget_settlements")
          .select("id, code, total_actual, status, created_at")
          .like("status", "pending_%")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);
      const merged = [
        ...(estRes.data || []).map((e: any) => ({
          id: e.id, code: e.code, type: "DT", amount: Number(e.total_estimated || 0),
          status: e.status, created_at: e.created_at,
        })),
        ...(settleRes.data || []).map((s: any) => ({
          id: s.id, code: s.code, type: "QT", amount: Number(s.total_actual || 0),
          status: s.status, created_at: s.created_at,
        })),
      ].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 5);
      return merged;
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3 flex-row items-center justify-between">
        <CardTitle className="text-base">Dự toán/Quyết toán chờ</CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link to="/tai-chinh?tab=estimates">Xem <ArrowRight className="h-3 w-3" /></Link>
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <Skeleton className="h-32" />
        ) : !data || data.length === 0 ? (
          <Empty />
        ) : (
          <div className="space-y-2">
            {data.map((r) => (
              <Link
                key={r.id}
                to={r.type === "QT" ? "/tai-chinh?tab=settlements" : "/tai-chinh?tab=estimates"}
                className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-muted/50 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{r.code || "—"}</p>
                  <div className="flex gap-1 mt-0.5">
                    <Badge variant="secondary" className="text-[10px]">{r.type}</Badge>
                    <Badge variant="outline" className="text-[10px]">{r.status.replace("pending_", "")}</Badge>
                  </div>
                </div>
                <span className="font-medium shrink-0">{fmt(r.amount)}</span>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function CeoFinanceAlerts() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <FinanceOverdueAR />
      <FinancePendingExpenses />
      <FinancePendingBudgets />
    </div>
  );
}
