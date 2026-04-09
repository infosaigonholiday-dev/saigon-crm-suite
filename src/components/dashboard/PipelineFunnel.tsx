import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface Props {
  departmentId?: string | null;
}

const FUNNEL_STAGES = [
  { key: "NEW", label: "Mới", color: "bg-blue-500" },
  { key: "CONTACTED", label: "Đã liên hệ", color: "bg-cyan-500" },
  { key: "INTERESTED", label: "Quan tâm", color: "bg-green-500" },
  { key: "QUOTE_SENT", label: "Báo giá", color: "bg-amber-500" },
  { key: "WON", label: "Chốt tour", color: "bg-emerald-600" },
];

export function PipelineFunnel({ departmentId }: Props) {
  const { data: counts, isLoading } = useQuery({
    queryKey: ["pipeline-funnel", departmentId],
    queryFn: async () => {
      let q = supabase.from("leads").select("status");
      if (departmentId) q = q.eq("department_id", departmentId);
      // Exclude LOST/DORMANT for active pipeline
      q = q.not("status", "in", "(LOST,DORMANT)");
      const { data } = await q;
      if (!data) return FUNNEL_STAGES.map(s => ({ ...s, count: 0 }));

      const statusCounts: Record<string, number> = {};
      data.forEach(d => {
        statusCounts[d.status] = (statusCounts[d.status] || 0) + 1;
      });

      // Cumulative: each stage = that stage + all stages after it
      const stages = FUNNEL_STAGES.map(s => ({
        ...s,
        count: statusCounts[s.key] || 0,
      }));

      // Calculate cumulative from bottom up for funnel visualization
      const cumulative = [...stages];
      for (let i = 0; i < cumulative.length; i++) {
        cumulative[i] = {
          ...cumulative[i],
          count: stages.slice(i).reduce((sum, s) => sum + s.count, 0),
        };
      }

      return cumulative;
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const stages = counts || [];
  const maxCount = Math.max(...stages.map(s => s.count), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Phễu chuyển đổi</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {stages.map((stage, i) => {
          const widthPct = Math.max((stage.count / maxCount) * 100, 15);
          const nextCount = stages[i + 1]?.count;
          const convRate = i < stages.length - 1 && stage.count > 0
            ? Math.round((nextCount / stage.count) * 100)
            : null;

          return (
            <div key={stage.key} className="space-y-0.5">
              <div className="flex items-center gap-3">
                <div className="w-24 text-xs text-muted-foreground text-right shrink-0">{stage.label}</div>
                <div className="flex-1 relative">
                  <div
                    className={`${stage.color} rounded-sm h-8 flex items-center justify-end pr-3 transition-all`}
                    style={{ width: `${widthPct}%` }}
                  >
                    <span className="text-xs font-bold text-white">{stage.count}</span>
                  </div>
                </div>
              </div>
              {convRate !== null && (
                <div className="flex items-center gap-3">
                  <div className="w-24" />
                  <span className="text-[10px] text-muted-foreground ml-2">↓ {convRate}%</span>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
