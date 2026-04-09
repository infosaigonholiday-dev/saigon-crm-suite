import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Loader2 } from "lucide-react";

interface Props {
  departmentId?: string | null;
}

function getWeekRanges() {
  const weeks: { label: string; start: Date; end: Date }[] = [];
  const now = new Date();
  for (let i = 3; i >= 0; i--) {
    const end = new Date(now);
    end.setDate(end.getDate() - i * 7);
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    const label = `${start.getDate()}/${start.getMonth() + 1}`;
    weeks.push({ label, start, end });
  }
  return weeks;
}

export function WeeklyTrendChart({ departmentId }: Props) {
  const weeks = getWeekRanges();
  const earliest = weeks[0].start.toISOString();

  const { data: chartData, isLoading } = useQuery({
    queryKey: ["weekly-trend", departmentId],
    queryFn: async () => {
      // Get leads created in last 4 weeks
      let leadsQ = supabase.from("leads").select("id, created_at, status, updated_at")
        .gte("created_at", earliest);
      if (departmentId) leadsQ = leadsQ.eq("department_id", departmentId);
      const { data: leads } = await leadsQ;

      // Get care history
      let careQ = supabase.from("lead_care_history").select("id, contacted_at")
        .gte("contacted_at", earliest);
      const { data: care } = await careQ;

      return weeks.map(w => {
        const newLeads = (leads || []).filter(l => {
          const d = new Date(l.created_at!);
          return d >= w.start && d <= w.end;
        }).length;

        const contacts = (care || []).filter(c => {
          const d = new Date(c.contacted_at!);
          return d >= w.start && d <= w.end;
        }).length;

        const won = (leads || []).filter(l => {
          if (l.status !== "WON" || !l.updated_at) return false;
          const d = new Date(l.updated_at);
          return d >= w.start && d <= w.end;
        }).length;

        return {
          week: w.label,
          "Leads mới": newLeads,
          "Liên hệ": contacts,
          "Tour chốt": won,
        };
      });
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Xu hướng 4 tuần gần nhất</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="week" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <Line type="monotone" dataKey="Leads mới" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="Liên hệ" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="Tour chốt" stroke="#f97316" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
