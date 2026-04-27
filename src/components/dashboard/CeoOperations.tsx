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

function daysBetween(from: string | Date, to: Date = new Date()) {
  return Math.floor((+to - +new Date(from)) / 86400000);
}

export function OpsUpcomingTours() {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const in7 = new Date(today.getTime() + 7 * 86400000).toISOString().split("T")[0];

  const { data, isLoading } = useQuery({
    queryKey: ["ops-upcoming-tours-v2", todayStr],
    staleTime: STALE,
    queryFn: async () => {
      // Ưu tiên departure_date; fallback cho booking chưa có departure_date dùng remaining_due_at
      const { data: byDep } = await supabase
        .from("bookings")
        .select("id, code, customer_id, departure_date, remaining_due_at, pax_total, status, tour_name_manual, tour_guide_id")
        .gte("departure_date", todayStr)
        .lte("departure_date", in7)
        .neq("status", "cancelled")
        .order("departure_date", { ascending: true })
        .limit(10);

      const { data: byDue } = await supabase
        .from("bookings")
        .select("id, code, customer_id, departure_date, remaining_due_at, pax_total, status, tour_name_manual, tour_guide_id")
        .is("departure_date", null)
        .gte("remaining_due_at", todayStr)
        .lte("remaining_due_at", in7)
        .neq("status", "cancelled")
        .order("remaining_due_at", { ascending: true })
        .limit(5);

      const merged = [...(byDep || []), ...(byDue || [])].slice(0, 5);
      const customerIds = Array.from(new Set(merged.map((r: any) => r.customer_id).filter(Boolean)));
      const guideIds = Array.from(new Set(merged.map((r: any) => r.tour_guide_id).filter(Boolean)));

      const nameMap = new Map<string, string>();
      const guideMap = new Map<string, string>();
      if (customerIds.length) {
        const { data: cs } = await supabase.from("customers").select("id, full_name").in("id", customerIds);
        (cs || []).forEach((c: any) => nameMap.set(c.id, c.full_name));
      }
      if (guideIds.length) {
        const { data: gs } = await supabase.from("employees").select("id, full_name").in("id", guideIds);
        (gs || []).forEach((g: any) => guideMap.set(g.id, g.full_name));
      }
      return merged.map((r: any) => ({
        ...r,
        customer_name: nameMap.get(r.customer_id) || "—",
        guide_name: r.tour_guide_id ? guideMap.get(r.tour_guide_id) || "—" : null,
        date_display: r.departure_date || r.remaining_due_at,
      }));
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3 flex-row items-center justify-between">
        <CardTitle className="text-base">Tour sắp khởi hành (7 ngày)</CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link to="/dat-tour">Xem <ArrowRight className="h-3 w-3" /></Link>
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
                to={`/dat-tour/${r.id}`}
                className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-muted/50 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{r.code} – {r.customer_name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {r.date_display} • {r.pax_total || 0} khách
                  </p>
                  <div className="mt-0.5">
                    {r.guide_name ? (
                      <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                        HDV: {r.guide_name}
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[10px]">
                        Chưa có HDV
                      </Badge>
                    )}
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">{r.status}</Badge>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


export function OpsPendingContracts() {
  const { data, isLoading } = useQuery({
    queryKey: ["ops-pending-contracts"],
    staleTime: STALE,
    queryFn: async () => {
      const { data } = await supabase
        .from("contracts")
        .select("id, code, customer_id, total_value, status, created_at")
        .in("status", ["DRAFT", "PENDING_APPROVAL"])
        .order("created_at", { ascending: false })
        .limit(5);
      const ids = Array.from(new Set((data || []).map((r: any) => r.customer_id).filter(Boolean)));
      const nameMap = new Map<string, string>();
      if (ids.length) {
        const { data: cs } = await supabase.from("customers").select("id, full_name").in("id", ids);
        (cs || []).forEach((c: any) => nameMap.set(c.id, c.full_name));
      }
      return (data || []).map((r: any) => ({ ...r, customer_name: nameMap.get(r.customer_id) || "—" }));
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3 flex-row items-center justify-between">
        <CardTitle className="text-base">Hợp đồng chờ xử lý</CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link to="/hop-dong">Xem <ArrowRight className="h-3 w-3" /></Link>
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
                to="/hop-dong"
                className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-muted/50 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{r.code} – {r.customer_name}</p>
                  <Badge variant="outline" className="text-[10px] mt-0.5">{r.status}</Badge>
                </div>
                <span className="font-medium shrink-0">{fmt(Number(r.total_value || 0))}</span>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function OpsPendingQuotations() {
  const { data, isLoading } = useQuery({
    queryKey: ["ops-pending-quotes"],
    staleTime: STALE,
    queryFn: async () => {
      const { data } = await supabase
        .from("quotations")
        .select("id, code, customer_id, total_amount, created_at, status")
        .eq("status", "SENT")
        .order("created_at", { ascending: false })
        .limit(5);
      const ids = Array.from(new Set((data || []).map((r: any) => r.customer_id).filter(Boolean)));
      const nameMap = new Map<string, string>();
      if (ids.length) {
        const { data: cs } = await supabase.from("customers").select("id, full_name").in("id", ids);
        (cs || []).forEach((c: any) => nameMap.set(c.id, c.full_name));
      }
      return (data || []).map((r: any) => ({
        ...r, customer_name: nameMap.get(r.customer_id) || "—",
        days_waiting: daysBetween(r.created_at),
      }));
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3 flex-row items-center justify-between">
        <CardTitle className="text-base">Báo giá chờ phản hồi</CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link to="/bao-gia">Xem <ArrowRight className="h-3 w-3" /></Link>
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
                to="/bao-gia"
                className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-muted/50 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{r.code} – {r.customer_name}</p>
                  <p className="text-xs text-muted-foreground">Chờ {r.days_waiting} ngày</p>
                </div>
                <span className="font-medium shrink-0">{fmt(Number(r.total_amount || 0))}</span>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function CeoOperations() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <OpsUpcomingTours />
      <OpsPendingContracts />
      <OpsPendingQuotations />
    </div>
  );
}
