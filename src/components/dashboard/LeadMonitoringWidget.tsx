import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Bell, CalendarOff, Clock, TrendingUp, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMyDepartmentId } from "@/hooks/useScopedQuery";
import { usePermissions } from "@/hooks/usePermissions";

const ACTIVE_STATUSES_NEG = "(WON,LOST,DORMANT,NURTURE)";

function formatDaysAgo(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const days = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "hôm nay";
  return `${days} ngày trước`;
}

export default function LeadMonitoringWidget() {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const { getScope } = usePermissions();
  const scope = getScope("leads");
  const { data: myDeptId } = useMyDepartmentId(scope === "department");

  const allowed = ["ADMIN", "SUPER_ADMIN", "GDKD", "MANAGER"].includes(userRole || "");
  if (!allowed) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoIso = sevenDaysAgo.toISOString();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

  function applyScope(q: any) {
    if (scope === "department" && myDeptId) q = q.eq("department_id", myDeptId);
    return q;
  }

  const { data, isLoading } = useQuery({
    queryKey: ["lead-monitoring", scope, myDeptId],
    queryFn: async () => {
      // A. Overdue
      const overdueQ = applyScope(supabase.from("leads").select("id", { count: "exact", head: true })
        .lt("follow_up_date", todayStr).not("status", "in", ACTIVE_STATUSES_NEG));
      // B. Today
      const todayQ = applyScope(supabase.from("leads").select("id", { count: "exact", head: true })
        .eq("follow_up_date", todayStr).not("status", "in", ACTIVE_STATUSES_NEG));
      // C. No schedule
      const noSchedQ = applyScope(supabase.from("leads").select("id", { count: "exact", head: true })
        .is("follow_up_date", null).not("status", "in", ACTIVE_STATUSES_NEG));
      // D. Stale (>7 days no contact OR never)
      const staleQ = applyScope(supabase.from("leads").select("id", { count: "exact", head: true })
        .not("status", "in", ACTIVE_STATUSES_NEG)
        .or(`last_contact_at.lt.${sevenDaysAgoIso},last_contact_at.is.null`));
      // E. Conversion rate this month
      const monthLeadsQ = applyScope(supabase.from("leads").select("id", { count: "exact", head: true })
        .gte("created_at", startOfMonth));
      const monthConvertedQ = applyScope(supabase.from("leads").select("id", { count: "exact", head: true })
        .gte("created_at", startOfMonth).not("converted_customer_id", "is", null));

      // Top 5 overdue
      const topOverdueQ = applyScope(supabase.from("leads")
        .select("id, full_name, follow_up_date, last_contact_at, assigned_profile:profiles!leads_assigned_to_fkey(full_name)")
        .lt("follow_up_date", todayStr).not("status", "in", ACTIVE_STATUSES_NEG)
        .order("follow_up_date", { ascending: true }).limit(5));

      const [overdue, todayC, noSched, stale, monthLeads, monthConv, topOverdue] = await Promise.all([
        overdueQ, todayQ, noSchedQ, staleQ, monthLeadsQ, monthConvertedQ, topOverdueQ,
      ]);

      const conversionPct = (monthLeads.count ?? 0) > 0
        ? Math.round(((monthConv.count ?? 0) / (monthLeads.count ?? 1)) * 100)
        : 0;

      return {
        overdue: overdue.count ?? 0,
        today: todayC.count ?? 0,
        noSchedule: noSched.count ?? 0,
        stale: stale.count ?? 0,
        conversionPct,
        topOverdue: (topOverdue.data as any[]) || [],
      };
    },
    enabled: scope === "all" || (scope === "department" && !!myDeptId),
  });

  if (isLoading || !data) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const cards = [
    { label: "Quá hạn follow-up", value: data.overdue, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10", filter: "overdue" },
    { label: "Cần follow-up hôm nay", value: data.today, icon: Bell, color: "text-orange-600", bg: "bg-orange-100", filter: "today" },
    { label: "Không có lịch hẹn", value: data.noSchedule, icon: CalendarOff, color: "text-amber-600", bg: "bg-amber-100", filter: "no_schedule" },
    { label: ">7 ngày không tương tác", value: data.stale, icon: Clock, color: "text-destructive", bg: "bg-destructive/10", filter: "stale" },
    { label: "Tỷ lệ chuyển đổi tháng", value: `${data.conversionPct}%`, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-100", filter: null as string | null },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          Giám sát Lead — Hành động cần làm ngay
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {cards.map((c) => (
            <button
              key={c.label}
              onClick={() => c.filter && navigate(`/tiem-nang?filter=${c.filter}`)}
              disabled={!c.filter}
              className={`text-left p-3 rounded-lg border transition-all ${c.filter ? "hover:shadow-md hover:border-primary cursor-pointer" : "cursor-default"}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs text-muted-foreground line-clamp-2">{c.label}</p>
                <div className={`w-7 h-7 rounded ${c.bg} flex items-center justify-center shrink-0`}>
                  <c.icon className={`h-3.5 w-3.5 ${c.color}`} />
                </div>
              </div>
              <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
            </button>
          ))}
        </div>

        {data.topOverdue.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Top 5 leads quá hạn lâu nhất</p>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-xs text-muted-foreground">
                    <th className="text-left p-2 font-medium">Lead</th>
                    <th className="text-left p-2 font-medium">NV phụ trách</th>
                    <th className="text-right p-2 font-medium">Quá hạn</th>
                    <th className="text-right p-2 font-medium">Lần cuối liên hệ</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topOverdue.map((l: any) => {
                    const overdueDays = Math.floor((today.getTime() - new Date(l.follow_up_date).getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <tr key={l.id} className="border-t hover:bg-muted/30 cursor-pointer"
                        onClick={() => navigate(`/tiem-nang?filter=overdue`)}>
                        <td className="p-2 font-medium">{l.full_name}</td>
                        <td className="p-2 text-muted-foreground">{l.assigned_profile?.full_name || "—"}</td>
                        <td className="p-2 text-right">
                          <Badge variant="destructive" className="text-xs">{overdueDays} ngày</Badge>
                        </td>
                        <td className="p-2 text-right text-xs text-muted-foreground">{formatDaysAgo(l.last_contact_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
