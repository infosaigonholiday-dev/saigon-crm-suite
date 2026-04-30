import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { TOUR_STAGES, TOUR_STAGE_LABEL, type TourStage } from "@/lib/tourFileWorkflow";
import { format } from "date-fns";
import { Calendar, Users, MapPin, Briefcase } from "lucide-react";

export default function TourFileOverviewTab({ tf }: { tf: any }) {
  const qc = useQueryClient();
  const [stage, setStage] = useState<TourStage>(tf.current_stage);

  const { data: stats } = useQuery({
    queryKey: ["tour_file_stats", tf.id],
    queryFn: async () => {
      const { data: tasks } = await (supabase as any).from("tour_tasks").select("status").eq("tour_file_id", tf.id);
      const { count: docCount } = await (supabase as any).from("tour_documents").select("*", { count: "exact", head: true }).eq("tour_file_id", tf.id).eq("is_current_version", true);
      const total = tasks?.length || 0;
      const done = (tasks || []).filter((t: any) => t.status === "approved_done").length;
      const overdue = (tasks || []).filter((t: any) => t.status === "overdue").length;
      return { total, done, overdue, docCount: docCount || 0 };
    },
  });

  const updateStage = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("tour_files").update({ current_stage: stage }).eq("id", tf.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Đã cập nhật giai đoạn");
      qc.invalidateQueries({ queryKey: ["tour_file", tf.id] });
      qc.invalidateQueries({ queryKey: ["tour_file_history", tf.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const daysToDeparture = tf.departure_date
    ? Math.ceil((+new Date(tf.departure_date) - Date.now()) / 86400000)
    : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle className="text-base">Thông tin tour</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-muted-foreground">Khởi hành</div>
                <div className="font-medium">{tf.departure_date ? format(new Date(tf.departure_date), "dd/MM/yyyy") : "—"}</div>
              </div>
            </div>
            <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-muted-foreground">Về</div>
                <div className="font-medium">{tf.return_date ? format(new Date(tf.return_date), "dd/MM/yyyy") : "—"}</div>
              </div>
            </div>
            <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-muted-foreground">Tuyến / Điểm đến</div>
                <div className="font-medium">{tf.route || "—"} {tf.destination ? `· ${tf.destination}` : ""}</div>
              </div>
            </div>
            <div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-muted-foreground">Khách</div>
                <div className="font-medium">{tf.group_size_confirmed || tf.group_size_estimated || "—"} người</div>
              </div>
            </div>
            <div className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-muted-foreground">Sale</div>
                <div className="font-medium">{tf.sale_owner?.full_name || "—"}</div>
              </div>
            </div>
            <div className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-muted-foreground">Điều hành</div>
                <div className="font-medium">{tf.operation_owner?.full_name || "—"}</div>
              </div>
            </div>
            <div className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-muted-foreground">Kế toán</div>
                <div className="font-medium">{tf.accountant_owner?.full_name || "—"}</div>
              </div>
            </div>
            <div className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-muted-foreground">Manager kiểm</div>
                <div className="font-medium">{tf.manager_owner?.full_name || "—"}</div>
              </div>
            </div>
          </div>
          {tf.notes && (
            <div className="pt-3 border-t">
              <div className="text-muted-foreground mb-1">Ghi chú</div>
              <div className="whitespace-pre-wrap">{tf.notes}</div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Tiến độ</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span>Tổng task</span><span className="font-medium">{stats?.total || 0}</span></div>
            <div className="flex justify-between"><span>Đã duyệt xong</span>
              <Badge className="bg-blue-600 text-white">{stats?.done || 0}</Badge>
            </div>
            <div className="flex justify-between"><span>Quá hạn</span>
              <Badge variant={stats?.overdue ? "destructive" : "secondary"}>{stats?.overdue || 0}</Badge>
            </div>
            <div className="flex justify-between"><span>Tài liệu hiện hành</span><span className="font-medium">{stats?.docCount || 0}</span></div>
            {daysToDeparture !== null && (
              <div className="pt-2 border-t flex justify-between">
                <span>Còn tới khởi hành</span>
                <Badge variant={daysToDeparture < 7 ? "destructive" : "secondary"}>
                  {daysToDeparture < 0 ? `Đã đi ${-daysToDeparture}d` : `${daysToDeparture} ngày`}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Đổi giai đoạn</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Select value={stage} onValueChange={(v) => setStage(v as TourStage)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TOUR_STAGES.map(s => (
                  <SelectItem key={s} value={s}>{TOUR_STAGE_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="w-full"
              size="sm"
              disabled={stage === tf.current_stage || updateStage.isPending}
              onClick={() => updateStage.mutate()}
            >
              {updateStage.isPending ? "Đang lưu..." : "Cập nhật"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
