import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2, Filter, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { TASK_STATUS_LABEL, TASK_STATUS_BADGE, type TaskStatus, TASK_PRIORITY_LABEL } from "@/lib/tourFileWorkflow";
import { getTaskTemplate } from "@/lib/tourTaskTemplates";
import { toast } from "sonner";
import TaskFormDialog from "./TaskFormDialog";
import TaskDetailDialog from "./TaskDetailDialog";
import { format } from "date-fns";

export default function TourFileTasksTab({ tourFileId, tf }: { tourFileId: string; tf: any }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [openForm, setOpenForm] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [quick, setQuick] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tour_tasks", tourFileId, filterStatus, quick, search, user?.id],
    queryFn: async () => {
      let q = (supabase as any)
        .from("tour_tasks")
        .select(`*, owner:owner_id ( id, full_name ), checker:checked_by ( id, full_name )`)
        .eq("tour_file_id", tourFileId)
        .order("due_at", { ascending: true, nullsFirst: false });
      if (filterStatus !== "all") q = q.eq("status", filterStatus);
      if (quick === "mine") q = q.eq("owner_id", user?.id);
      if (quick === "overdue") q = q.eq("status", "overdue");
      if (quick === "pending_check") q = q.eq("status", "done_pending_check");
      if (quick === "evidence") q = q.eq("evidence_required", true);
      if (search.trim()) q = q.ilike("title", `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const applyTemplate = useMutation({
    mutationFn: async () => {
      const tpl = getTaskTemplate(tf.booking_type);
      const departure = tf.departure_date ? new Date(tf.departure_date) : new Date();
      const ownerMap: Record<string, string | null> = {
        SALES: tf.sale_owner_id,
        OPERATION: tf.operation_owner_id,
        ACCOUNTING: tf.accountant_owner_id,
      };
      const fallback = tf.sale_owner_id || user?.id;
      const payload = tpl.map(t => {
        const due = new Date(departure);
        due.setDate(due.getDate() + t.due_offset_days);
        return {
          tour_file_id: tourFileId,
          title: t.title,
          department: t.department,
          owner_id: ownerMap[t.department] || fallback,
          priority: t.priority,
          evidence_required: t.evidence_required,
          evidence_type: t.evidence_type || null,
          due_at: due.toISOString(),
          status: "todo",
        };
      });
      const { error } = await (supabase as any).from("tour_tasks").insert(payload);
      if (error) throw error;
      return payload.length;
    },
    onSuccess: (n) => {
      toast.success(`Đã tạo ${n} task chuẩn`);
      qc.invalidateQueries({ queryKey: ["tour_tasks", tourFileId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const isOverdue = (t: any) => t.due_at && new Date(t.due_at) < new Date() && !["approved_done", "cancelled"].includes(t.status);

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-3 flex flex-wrap gap-2 items-center">
          <Input placeholder="Tìm task..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          <Select value={quick} onValueChange={setQuick}>
            <SelectTrigger className="w-44"><Filter className="h-3 w-3 mr-1 inline" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="mine">Việc của tôi</SelectItem>
              <SelectItem value="overdue">Quá hạn</SelectItem>
              <SelectItem value="pending_check">Chờ kiểm</SelectItem>
              <SelectItem value="evidence">Cần bằng chứng</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              {Object.entries(TASK_STATUS_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="ml-auto flex gap-2">
            {(tasks?.length || 0) === 0 && (
              <Button variant="outline" onClick={() => applyTemplate.mutate()} disabled={applyTemplate.isPending}>
                <Sparkles className="h-4 w-4 mr-1" />
                Áp template chuẩn
              </Button>
            )}
            <Button onClick={() => setOpenForm(true)}><Plus className="h-4 w-4 mr-1" /> Tạo task</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Phòng</TableHead>
                  <TableHead>Chủ việc</TableHead>
                  <TableHead>Hạn</TableHead>
                  <TableHead>Ưu tiên</TableHead>
                  <TableHead>Bằng chứng</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(tasks || []).map((t: any) => (
                  <TableRow key={t.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedTaskId(t.id)}>
                    <TableCell className="font-medium">{t.title}</TableCell>
                    <TableCell><Badge variant="outline">{t.department || "—"}</Badge></TableCell>
                    <TableCell className="text-sm">{t.owner?.full_name || "—"}</TableCell>
                    <TableCell className="text-sm">
                      {t.due_at ? (
                        <span className={isOverdue(t) ? "text-destructive font-medium" : ""}>
                          {format(new Date(t.due_at), "dd/MM HH:mm")}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell><Badge variant="secondary">{TASK_PRIORITY_LABEL[t.priority as keyof typeof TASK_PRIORITY_LABEL] || t.priority}</Badge></TableCell>
                    <TableCell>
                      {t.evidence_required ? (
                        t.evidence_url
                          ? <Badge className="bg-blue-600 text-white">Có</Badge>
                          : <Badge variant="destructive">Thiếu</Badge>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell>
                      <Badge className={TASK_STATUS_BADGE[t.status as TaskStatus] || ""}>
                        {TASK_STATUS_LABEL[t.status as TaskStatus] || t.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {tasks?.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Chưa có task. Bấm "Áp template chuẩn" để khởi tạo nhanh.
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <TaskFormDialog open={openForm} onOpenChange={setOpenForm} tourFileId={tourFileId} tf={tf} />
      {selectedTaskId && (
        <TaskDetailDialog
          taskId={selectedTaskId}
          tf={tf}
          open={!!selectedTaskId}
          onOpenChange={(v) => { if (!v) setSelectedTaskId(null); }}
        />
      )}
    </div>
  );
}
