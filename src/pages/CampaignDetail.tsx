import { useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Edit, Clock, MessageSquare, CheckCircle2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import InternalNotes from "@/components/shared/InternalNotes";

const STATUS_OPTIONS = [
  { value: "draft", label: "Nháp", color: "bg-slate-500" },
  { value: "active", label: "Đang chạy", color: "bg-green-600" },
  { value: "paused", label: "Tạm dừng", color: "bg-yellow-500" },
  { value: "completed", label: "Hoàn thành", color: "bg-blue-600" },
  { value: "cancelled", label: "Hủy", color: "bg-red-600" },
];
const PRIORITY_OPTIONS = [
  { value: "low", label: "Thấp", color: "bg-slate-400" },
  { value: "medium", label: "Trung bình", color: "bg-blue-500" },
  { value: "high", label: "Cao", color: "bg-orange-500" },
  { value: "critical", label: "Khẩn cấp", color: "bg-red-600" },
];
const TASK_COLUMNS = [
  { id: "todo", label: "Cần làm" },
  { id: "in_progress", label: "Đang làm" },
  { id: "review", label: "Review" },
  { id: "done", label: "Hoàn thành" },
];
const SECONDARY_COLS = [
  { id: "blocked", label: "Bị chặn" },
  { id: "cancelled", label: "Đã hủy" },
];

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const qc = useQueryClient();

  const canEdit = hasPermission("campaigns", "edit");
  const canCreateTask = hasPermission("tasks", "create");

  const [tab, setTab] = useState("overview");
  const [showSecondary, setShowSecondary] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<any>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const { data: campaign, isLoading } = useQuery({
    queryKey: ["campaign", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*, department:departments(name), owner:employees!campaigns_owner_id_fkey(id, full_name)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });

  const { data: milestones = [] } = useQuery({
    queryKey: ["milestones", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("milestones").select("*").eq("campaign_id", id!).order("order_index");
      if (error) throw error;
      return data as any[];
    },
    enabled: !!id,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, assignee:employees!tasks_assignee_id_fkey(id, full_name), milestone:milestones(name)")
        .eq("campaign_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!id,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("employees").select("id, full_name, profile_id, department_id").order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const myEmployeeId = useMemo(() => {
    return (employees as any[]).find(e => e.profile_id === user?.id)?.id ?? null;
  }, [employees, user]);

  // Mutations
  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase.from("campaigns").update({ status }).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Đã cập nhật"); qc.invalidateQueries({ queryKey: ["campaign", id] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const moveTask = useMutation({
    mutationFn: async ({ taskId, newStatus }: { taskId: string; newStatus: string }) => {
      const old = (tasks as any[]).find(t => t.id === taskId);
      if (!old || old.status === newStatus) return;
      const updates: any = { status: newStatus };
      if (newStatus === "done") updates.completed_at = new Date().toISOString();
      const { error } = await supabase.from("tasks").update(updates).eq("id", taskId);
      if (error) throw error;
      // log
      await supabase.from("task_logs").insert({
        task_id: taskId, user_id: user?.id, action: "status_change",
        old_value: old.status, new_value: newStatus,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", id] });
      qc.invalidateQueries({ queryKey: ["milestones", id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const stats = useMemo(() => {
    const totalTasks = tasks.length;
    const doneTasks = tasks.filter((t: any) => t.status === "done").length;
    const totalMs = milestones.length;
    const doneMs = milestones.filter((m: any) => m.status === "completed").length;
    return { totalTasks, doneTasks, totalMs, doneMs };
  }, [tasks, milestones]);

  if (isLoading) return <div className="p-6">Đang tải...</div>;
  if (!campaign) return <div className="p-6">Không tìm thấy chiến dịch</div>;

  const status = STATUS_OPTIONS.find(s => s.value === campaign.status);
  const priority = PRIORITY_OPTIONS.find(p => p.value === campaign.priority);
  const targetPct = campaign.target_value > 0
    ? Math.min(100, Math.round((Number(campaign.actual_value || 0) / Number(campaign.target_value)) * 100)) : 0;
  const costPct = campaign.budget > 0
    ? Math.round((Number(campaign.actual_cost || 0) / Number(campaign.budget)) * 100) : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button variant="ghost" size="sm" onClick={() => navigate("/chien-dich")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Chiến dịch
        </Button>
        <span>/</span>
        <span className="font-medium text-foreground">{campaign.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{campaign.name}</h1>
          <div className="flex flex-wrap gap-2 mt-2">
            {status && <Badge className={`${status.color} text-white hover:${status.color}`}>{status.label}</Badge>}
            {priority && <Badge className={`${priority.color} text-white hover:${priority.color}`}>{priority.label}</Badge>}
            <Badge variant="outline">{campaign.department?.name}</Badge>
            <Badge variant="outline">Phụ trách: {campaign.owner?.full_name ?? "-"}</Badge>
          </div>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Select value={campaign.status} onValueChange={(v) => updateStatus.mutate(v)}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Scorecards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Tiến độ mục tiêu</p>
            <p className="text-2xl font-bold mt-1">{campaign.actual_value || 0}/{campaign.target_value || 0}</p>
            <p className="text-xs text-muted-foreground">{campaign.target_unit}</p>
            <Progress value={targetPct} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Chi phí</p>
            <p className="text-2xl font-bold mt-1">{Number(campaign.actual_cost || 0).toLocaleString("vi-VN")}</p>
            <p className="text-xs text-muted-foreground">/ {Number(campaign.budget || 0).toLocaleString("vi-VN")} VNĐ</p>
            <Progress value={Math.min(100, costPct)} className={`mt-2 ${costPct > 100 ? "[&>div]:bg-red-600" : ""}`} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Tasks hoàn thành</p>
            <p className="text-2xl font-bold mt-1">{stats.doneTasks}/{stats.totalTasks}</p>
            <Progress value={stats.totalTasks ? (stats.doneTasks / stats.totalTasks) * 100 : 0} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Milestones</p>
            <p className="text-2xl font-bold mt-1">{stats.doneMs}/{stats.totalMs}</p>
            <Progress value={stats.totalMs ? (stats.doneMs / stats.totalMs) * 100 : 0} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="milestones">Milestones ({milestones.length})</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Mô tả</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{campaign.description || "(Chưa có mô tả)"}</p>
              {campaign.notes && (
                <>
                  <h4 className="font-medium mt-4 mb-1">Ghi chú</h4>
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground">{campaign.notes}</p>
                </>
              )}
              {campaign.tags && campaign.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {campaign.tags.map((t: string, i: number) => (
                    <Badge key={i} variant="secondary">{t}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {milestones.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Timeline Milestones</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {milestones.map((m: any) => (
                  <div key={m.id} className="flex items-center gap-3">
                    <div className="w-32 text-sm font-medium truncate">{m.name}</div>
                    <div className="flex-1 h-6 bg-muted rounded relative">
                      <div
                        className={`h-full rounded ${m.status === "completed" ? "bg-blue-600" : m.status === "in_progress" ? "bg-orange-500" : "bg-slate-400"}`}
                        style={{ width: `${m.completion_pct || 0}%` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                        {m.completion_pct || 0}%
                      </span>
                    </div>
                    <div className="w-32 text-xs text-muted-foreground text-right">
                      {m.start_date ? format(new Date(m.start_date), "dd/MM") : "?"} → {m.end_date ? format(new Date(m.end_date), "dd/MM") : "?"}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Ghi chú nội bộ</CardTitle></CardHeader>
            <CardContent>
              <InternalNotes entityType="campaign" entityId={campaign.id} entityName={campaign.name} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* MILESTONES */}
        <TabsContent value="milestones" className="space-y-3">
          {canEdit && (
            <Button onClick={() => { setEditingMilestone(null); setMilestoneDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />Thêm milestone
            </Button>
          )}
          {milestones.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Chưa có milestone</CardContent></Card>
          ) : milestones.map((m: any) => (
            <Card key={m.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{m.name}</h3>
                      <Badge variant={m.status === "completed" ? "default" : "outline"} className={m.status === "completed" ? "bg-blue-600" : ""}>
                        {m.status === "completed" ? "Hoàn thành" : m.status === "in_progress" ? "Đang làm" : "Chưa bắt đầu"}
                      </Badge>
                    </div>
                    {m.description && <p className="text-sm text-muted-foreground mt-1">{m.description}</p>}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                      <span>{m.start_date ? format(new Date(m.start_date), "dd/MM/yyyy") : "?"} → {m.end_date ? format(new Date(m.end_date), "dd/MM/yyyy") : "?"}</span>
                      <span>{m.completion_pct || 0}%</span>
                    </div>
                    <Progress value={m.completion_pct || 0} className="mt-2" />
                    {m.deliverables && (
                      <p className="text-sm mt-2"><strong>Deliverables:</strong> {m.deliverables}</p>
                    )}
                  </div>
                  {canEdit && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => { setEditingMilestone(m); setMilestoneDialogOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={async () => {
                        if (!confirm("Xóa milestone này?")) return;
                        const { error } = await supabase.from("milestones").delete().eq("id", m.id);
                        if (error) toast.error(error.message);
                        else { toast.success("Đã xóa"); qc.invalidateQueries({ queryKey: ["milestones", id] }); }
                      }}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* TASKS KANBAN */}
        <TabsContent value="tasks">
          <div className="flex items-center justify-between mb-3">
            <Button variant="outline" size="sm" onClick={() => setShowSecondary(s => !s)}>
              {showSecondary ? "Ẩn" : "Hiện"} cột Blocked/Cancelled
            </Button>
            {canCreateTask && (
              <Button onClick={() => { setEditingTask(null); setTaskDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />Thêm task
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {TASK_COLUMNS.map(col => (
              <KanbanColumn
                key={col.id}
                col={col}
                tasks={tasks.filter((t: any) => t.status === col.id)}
                onDragStart={setDraggedTaskId}
                onDrop={() => { if (draggedTaskId) moveTask.mutate({ taskId: draggedTaskId, newStatus: col.id }); setDraggedTaskId(null); }}
                onClickTask={(t) => { setEditingTask(t); setTaskDialogOpen(true); }}
              />
            ))}
          </div>
          {showSecondary && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              {SECONDARY_COLS.map(col => (
                <KanbanColumn
                  key={col.id}
                  col={col}
                  tasks={tasks.filter((t: any) => t.status === col.id)}
                  onDragStart={setDraggedTaskId}
                  onDrop={() => { if (draggedTaskId) moveTask.mutate({ taskId: draggedTaskId, newStatus: col.id }); setDraggedTaskId(null); }}
                  onClickTask={(t) => { setEditingTask(t); setTaskDialogOpen(true); }}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <TaskDialog
        open={taskDialogOpen}
        onClose={() => { setTaskDialogOpen(false); setEditingTask(null); }}
        task={editingTask}
        campaignId={id!}
        milestones={milestones}
        employees={employees as any[]}
        myEmployeeId={myEmployeeId}
        canEdit={canEdit || canCreateTask}
      />
      <MilestoneDialog
        open={milestoneDialogOpen}
        onClose={() => { setMilestoneDialogOpen(false); setEditingMilestone(null); }}
        milestone={editingMilestone}
        campaignId={id!}
        nextOrder={milestones.length}
      />
    </div>
  );
}

// ============= Kanban Column =============
function KanbanColumn({ col, tasks, onDragStart, onDrop, onClickTask }: any) {
  return (
    <div className="bg-muted/40 rounded p-2 min-h-[300px]" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="font-medium text-sm">{col.label}</span>
        <Badge variant="secondary">{tasks.length}</Badge>
      </div>
      <div className="space-y-2">
        {tasks.map((t: any) => {
          const isOverdue = t.due_date && new Date(t.due_date) < new Date(new Date().toDateString());
          const isToday = t.due_date && new Date(t.due_date).toDateString() === new Date().toDateString();
          const priority = PRIORITY_OPTIONS.find(p => p.value === t.priority);
          return (
            <div
              key={t.id}
              draggable
              onDragStart={() => onDragStart(t.id)}
              onClick={() => onClickTask(t)}
              className="bg-card border rounded p-2 cursor-pointer hover:shadow text-sm"
            >
              <p className="font-medium line-clamp-2">{t.title}</p>
              <div className="flex flex-wrap items-center gap-1 mt-1.5 text-xs">
                {t.assignee && <span className="text-muted-foreground">{t.assignee.full_name}</span>}
                {priority && <Badge className={`${priority.color} text-white text-[10px] px-1.5 py-0`}>{priority.label}</Badge>}
              </div>
              {t.due_date && (
                <p className={`text-xs mt-1 ${isOverdue ? "text-red-600 font-medium" : isToday ? "text-orange-600 font-medium" : "text-muted-foreground"}`}>
                  {format(new Date(t.due_date), "dd/MM/yyyy")}
                </p>
              )}
              {t.milestone && <p className="text-[10px] text-muted-foreground mt-0.5">📍 {t.milestone.name}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============= Task Dialog =============
function TaskDialog({ open, onClose, task, campaignId, milestones, employees, myEmployeeId, canEdit }: any) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState<any>({});
  const [comment, setComment] = useState("");
  const [logHours, setLogHours] = useState("");

  // Init form when task changes
  useMemo(() => {
    if (task) {
      setForm({
        title: task.title || "",
        description: task.description || "",
        assignee_id: task.assignee_id || "",
        milestone_id: task.milestone_id || "",
        priority: task.priority || "medium",
        status: task.status || "todo",
        due_date: task.due_date || "",
        estimated_hours: task.estimated_hours || "",
        actual_hours: task.actual_hours || "",
        tags: task.tags?.join(", ") || "",
      });
    } else {
      setForm({ title: "", description: "", assignee_id: "", milestone_id: "", priority: "medium", status: "todo", due_date: "", estimated_hours: "", actual_hours: "", tags: "" });
    }
  }, [task]);

  const { data: logs = [] } = useQuery({
    queryKey: ["task-logs", task?.id],
    queryFn: async () => {
      if (!task?.id) return [];
      const { data, error } = await supabase
        .from("task_logs")
        .select("*, user:profiles(full_name)")
        .eq("task_id", task.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!task?.id && open,
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.title?.trim()) throw new Error("Vui lòng nhập tiêu đề");
      const payload: any = {
        title: form.title.trim(),
        description: form.description || null,
        assignee_id: form.assignee_id || null,
        milestone_id: form.milestone_id || null,
        priority: form.priority,
        status: form.status,
        due_date: form.due_date || null,
        estimated_hours: form.estimated_hours ? Number(form.estimated_hours) : null,
        actual_hours: form.actual_hours ? Number(form.actual_hours) : null,
        tags: form.tags ? form.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : null,
      };
      if (task?.id) {
        const { error } = await supabase.from("tasks").update(payload).eq("id", task.id);
        if (error) throw error;
      } else {
        payload.campaign_id = campaignId;
        payload.reporter_id = myEmployeeId;
        payload.created_by = user?.id;
        const { error } = await supabase.from("tasks").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Đã lưu");
      qc.invalidateQueries({ queryKey: ["tasks", campaignId] });
      qc.invalidateQueries({ queryKey: ["milestones", campaignId] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addComment = useMutation({
    mutationFn: async () => {
      if (!comment.trim() || !task?.id) return;
      const { error } = await supabase.from("task_logs").insert({
        task_id: task.id, user_id: user?.id, action: "comment", comment: comment.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => { setComment(""); qc.invalidateQueries({ queryKey: ["task-logs", task?.id] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const addTimeLog = useMutation({
    mutationFn: async () => {
      const hrs = Number(logHours);
      if (!hrs || hrs <= 0 || !task?.id) return;
      const { error } = await supabase.from("task_logs").insert({
        task_id: task.id, user_id: user?.id, action: "time_log", hours_logged: hrs,
      });
      if (error) throw error;
      // accumulate actual_hours
      await supabase.from("tasks").update({ actual_hours: (Number(task.actual_hours) || 0) + hrs }).eq("id", task.id);
    },
    onSuccess: () => {
      setLogHours("");
      qc.invalidateQueries({ queryKey: ["task-logs", task?.id] });
      qc.invalidateQueries({ queryKey: ["tasks", campaignId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{task?.id ? "Chi tiết task" : "Tạo task mới"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Tiêu đề *</Label>
            <Input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} disabled={!canEdit} />
          </div>
          <div>
            <Label>Mô tả</Label>
            <Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} disabled={!canEdit} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Giao cho</Label>
              <Select value={form.assignee_id || ""} onValueChange={(v) => setForm({ ...form, assignee_id: v })} disabled={!canEdit}>
                <SelectTrigger><SelectValue placeholder="Chọn..." /></SelectTrigger>
                <SelectContent>
                  {employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Milestone</Label>
              <Select value={form.milestone_id || ""} onValueChange={(v) => setForm({ ...form, milestone_id: v })} disabled={!canEdit}>
                <SelectTrigger><SelectValue placeholder="Không có" /></SelectTrigger>
                <SelectContent>
                  {milestones.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Trạng thái</Label>
              <Select value={form.status || "todo"} onValueChange={(v) => setForm({ ...form, status: v })} disabled={!canEdit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[...TASK_COLUMNS, ...SECONDARY_COLS].map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ưu tiên</Label>
              <Select value={form.priority || "medium"} onValueChange={(v) => setForm({ ...form, priority: v })} disabled={!canEdit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Hạn chót</Label>
              <Input type="date" value={form.due_date || ""} onChange={(e) => setForm({ ...form, due_date: e.target.value })} disabled={!canEdit} />
            </div>
            <div>
              <Label>Estimate hours</Label>
              <Input type="number" step="0.5" value={form.estimated_hours || ""} onChange={(e) => setForm({ ...form, estimated_hours: e.target.value })} disabled={!canEdit} />
            </div>
            <div className="col-span-2">
              <Label>Tags (phẩy ngăn cách)</Label>
              <Input value={form.tags || ""} onChange={(e) => setForm({ ...form, tags: e.target.value })} disabled={!canEdit} />
            </div>
          </div>

          {task?.id && (
            <>
              {/* Time log */}
              <div className="border-t pt-3">
                <Label className="flex items-center gap-2"><Clock className="h-4 w-4" />Log giờ làm việc</Label>
                <div className="flex gap-2 mt-2">
                  <Input type="number" step="0.5" placeholder="Số giờ" value={logHours} onChange={(e) => setLogHours(e.target.value)} className="w-32" />
                  <Button onClick={() => addTimeLog.mutate()} disabled={!logHours}>Log</Button>
                  <span className="text-sm text-muted-foreground self-center">Tổng đã log: {task.actual_hours || 0}h</span>
                </div>
              </div>

              {/* Comment */}
              <div className="border-t pt-3">
                <Label className="flex items-center gap-2"><MessageSquare className="h-4 w-4" />Thêm bình luận</Label>
                <div className="flex gap-2 mt-2">
                  <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Nhập bình luận..." />
                  <Button onClick={() => addComment.mutate()} disabled={!comment.trim()}>Gửi</Button>
                </div>
              </div>

              {/* Timeline */}
              <div className="border-t pt-3">
                <Label>Lịch sử & Bình luận</Label>
                <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                  {logs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Chưa có hoạt động</p>
                  ) : logs.map((l: any) => (
                    <div key={l.id} className="text-sm border-l-2 border-primary pl-3 py-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{l.user?.full_name ?? "Hệ thống"}</span>
                        <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(l.created_at), { locale: vi, addSuffix: true })}</span>
                      </div>
                      {l.action === "status_change" && <p className="text-muted-foreground">Đổi trạng thái: {l.old_value} → {l.new_value}</p>}
                      {l.action === "comment" && <p>{l.comment}</p>}
                      {l.action === "time_log" && <p className="text-muted-foreground">⏱ Log {l.hours_logged}h</p>}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Đóng</Button>
          {canEdit && <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Đang lưu..." : "Lưu"}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============= Milestone Dialog =============
function MilestoneDialog({ open, onClose, milestone, campaignId, nextOrder }: any) {
  const qc = useQueryClient();
  const [form, setForm] = useState<any>({});

  useMemo(() => {
    setForm(milestone ? {
      name: milestone.name || "",
      description: milestone.description || "",
      start_date: milestone.start_date || "",
      end_date: milestone.end_date || "",
      deliverables: milestone.deliverables || "",
    } : { name: "", description: "", start_date: "", end_date: "", deliverables: "" });
  }, [milestone]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name?.trim()) throw new Error("Vui lòng nhập tên milestone");
      const payload: any = {
        name: form.name.trim(),
        description: form.description || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        deliverables: form.deliverables || null,
      };
      if (milestone?.id) {
        const { error } = await supabase.from("milestones").update(payload).eq("id", milestone.id);
        if (error) throw error;
      } else {
        payload.campaign_id = campaignId;
        payload.order_index = nextOrder;
        payload.status = "not_started";
        payload.completion_pct = 0;
        const { error } = await supabase.from("milestones").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Đã lưu"); qc.invalidateQueries({ queryKey: ["milestones", campaignId] }); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{milestone?.id ? "Sửa" : "Thêm"} milestone</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Tên *</Label>
            <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Mô tả</Label>
            <Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Bắt đầu</Label>
              <Input type="date" value={form.start_date || ""} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div>
              <Label>Kết thúc</Label>
              <Input type="date" value={form.end_date || ""} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Deliverables</Label>
            <Textarea value={form.deliverables || ""} onChange={(e) => setForm({ ...form, deliverables: e.target.value })} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Hủy</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>Lưu</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
