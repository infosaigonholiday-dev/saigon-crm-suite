import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { ArrowRight } from "lucide-react";
import { TOUR_STAGE_LABEL, type TourStage } from "@/lib/tourFileWorkflow";

export default function TourFileHistoryTab({ tourFileId }: { tourFileId: string }) {
  const { data } = useQuery({
    queryKey: ["tour_file_history", tourFileId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("tour_file_status_history")
        .select("*, changed_by_profile:changed_by ( full_name )")
        .eq("tour_file_id", tourFileId)
        .order("changed_at", { ascending: false });
      return data || [];
    },
  });

  return (
    <Card><CardContent className="p-4">
      {(!data || data.length === 0) ? (
        <div className="text-sm text-muted-foreground text-center py-6">Chưa có lịch sử.</div>
      ) : (
        <ol className="space-y-3">
          {data.map((h: any) => (
            <li key={h.id} className="flex items-start gap-3 text-sm border-l-2 border-primary/30 pl-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {h.from_stage && <span className="text-muted-foreground">{TOUR_STAGE_LABEL[h.from_stage as TourStage] || h.from_stage}</span>}
                  {h.from_stage && <ArrowRight className="h-3 w-3" />}
                  <span className="font-medium">{TOUR_STAGE_LABEL[h.to_stage as TourStage] || h.to_stage}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {h.changed_by_profile?.full_name || "Hệ thống"} · {format(new Date(h.changed_at), "dd/MM/yyyy HH:mm")}
                  {h.reason ? ` · ${h.reason}` : ""}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </CardContent></Card>
  );
}
