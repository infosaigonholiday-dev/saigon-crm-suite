import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  TASK_STATUS_LABEL, TASK_STATUS_BADGE, type TaskStatus,
  getAllowedTransitions, TASK_PRIORITY_LABEL,
} from "@/lib/tourFileWorkflow";
import { format } from "date-fns";
import { Upload, Loader2 } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { completeActionsForEntity } from "@/lib/notificationActions";

export default function TaskDetailDialog({
  taskId, tf, open, onOpenChange,
}: { taskId: string; tf: any; open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const { user, userRole } = useAuth();
  const { hasPermission } = usePermissions();
  const [uploading, setUploading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [pendingNewStatus, setPendingNewStatus] = useState<TaskStatus | null>(null);

  const { data: task } = useQuery({
    queryKey: ["tour_task", taskId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("tour_tasks")
        .select(`*, owner:owner_id ( id, full_name ), checker:checked_by ( id, full_name ), assigned_by_p:assigned_by ( full_name )`)
        .eq("id", taskId).single();
      if (error) throw error;
      return data;
    },
  });

  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(userRole || "");
  const isOwner = task?.owner_id === user?.id;
  const isManager = ["MANAGER", "GDKD", "DIEUHAN", "HR_MANAGER"].includes(userRole || "")
    || tf.manager_owner_id === user?.id || task?.checked_by === user?.id;
  const canApprove = isManager || isAdmin;

  const transitions = task ? getAllowedTransitions(task.status, isOwner, canApprove, isAdmin) : [];

  const transition = useMutation({
    mutationFn: async ({ newStatus, evidenceUrl, reason }: { newStatus: TaskStatus; evidenceUrl?: string; reason?: string }) => {
      const { error } = await (supabase as any).rpc("rpc_tour_task_transition", {
        _task_id: taskId,
        _new_status: newStatus,
        _evidence_url: evidenceUrl ?? null,
        _reject_reason: reason ?? null,
      });
      if (error) throw error;

      // when approving, mark related notifications completed
      if (newStatus === "approved_done") {
        await completeActionsForEntity("tour_task", taskId);
      }
    },
    onSuccess: () => {
      toast.success("Đã cập nhật trạng thái");
      qc.invalidateQueries({ queryKey: ["tour_task", taskId] });
      qc.invalidateQueries({ queryKey: ["tour_tasks", tf.id] });
      qc.invalidateQueries({ queryKey: ["tour_file_stats", tf.id] });
      setRejectReason("");
      setPendingNewStatus(null);
    },
    onError: (e: any) => toast.error(e.message || "Không cập nhật được"),
  });

  const handleEvidenceUpload = async (file: File) => {
    setUploading(true);
    try {
      const path = `${tf.id}/evidence/${taskId}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from("tour-files").upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from("tour-files").createSignedUrl(path, 60 * 60 * 24 * 365);
      const url = signed?.signedUrl || path;
      const { error } = await (supabase as any).from("tour_tasks").update({ evidence_url: url }).eq("id", taskId);
      if (error) throw error;
      toast.success("Đã upload bằng chứng");
      qc.invalidateQueries({ queryKey: ["tour_task", taskId] });
    } catch (e: any) {
      toast.error(e.message);
    } finally { setUploading(false); }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {task.title}
            <Badge className={TASK_STATUS_BADGE[task.status as TaskStatus]}>
              {TASK_STATUS_LABEL[task.status as TaskStatus]}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          {task.description && <p className="text-muted-foreground whitespace-pre-wrap">{task.description}</p>}

          <div className="grid grid-cols-2 gap-3 border rounded p-3">
            <div><span className="text-muted-foreground">Phòng:</span> <Badge variant="outline">{task.department || "—"}</Badge></div>
            <div><span className="text-muted-foreground">Ưu tiên:</span> {TASK_PRIORITY_LABEL[task.priority as keyof typeof TASK_PRIORITY_LABEL]}</div>
            <div><span className="text-muted-foreground">Chủ việc:</span> {task.owner?.full_name}</div>
            <div><span className="text-muted-foreground">Hạn:</span> {task.due_at ? format(new Date(task.due_at), "dd/MM/yyyy HH:mm") : "—"}</div>
            <div><span className="text-muted-foreground">Người giao:</span> {task.assigned_by_p?.full_name || "—"}</div>
            <div><span className="text-muted-foreground">Người kiểm:</span> {task.checker?.full_name || "—"}</div>
          </div>

          {task.evidence_required && (
            <div className="border rounded p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label>Bằng chứng {task.evidence_type ? `(${task.evidence_type})` : ""}</Label>
                {task.evidence_url
                  ? <a href={task.evidence_url} target="_blank" rel="noreferrer" className="text-primary text-xs underline">Xem file</a>
                  : <Badge variant="destructive">Chưa có</Badge>}
              </div>
              {(isOwner || isAdmin) && (
                <div>
                  <Input
                    type="file"
                    disabled={uploading}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleEvidenceUpload(f); }}
                  />
                  {uploading && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Đang upload...</p>}
                </div>
              )}
            </div>
          )}

          {task.status === "rejected_rework" && task.reject_reason && (
            <div className="border border-destructive/30 bg-destructive/5 rounded p-3 text-sm">
              <strong>Lý do trả lại:</strong> {task.reject_reason}
            </div>
          )}

          {pendingNewStatus === "rejected_rework" && (
            <div className="border rounded p-3 space-y-2">
              <Label>Lý do trả lại *</Label>
              <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={2} />
              <div className="flex gap-2">
                <Button size="sm" variant="destructive"
                  disabled={!rejectReason || transition.isPending}
                  onClick={() => transition.mutate({ newStatus: "rejected_rework", reason: rejectReason })}>
                  Xác nhận trả lại
                </Button>
                <Button size="sm" variant="outline" onClick={() => setPendingNewStatus(null)}>Huỷ</Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-wrap gap-2">
          {transitions.map(t => (
            <Button
              key={t.value}
              variant={t.variant === "destructive" ? "destructive" : t.variant === "secondary" ? "secondary" : "default"}
              size="sm"
              disabled={transition.isPending}
              onClick={() => {
                if (t.value === "rejected_rework") { setPendingNewStatus("rejected_rework"); return; }
                transition.mutate({ newStatus: t.value });
              }}
            >
              {t.label}
            </Button>
          ))}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
