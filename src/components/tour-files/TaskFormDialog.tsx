import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const DEPARTMENTS = ["SALES", "OPERATION", "ACCOUNTING", "HR", "MKT", "OTHER"];

export default function TaskFormDialog({
  open, onOpenChange, tourFileId, tf,
}: { open: boolean; onOpenChange: (v: boolean) => void; tourFileId: string; tf: any }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: "",
    description: "",
    department: "SALES",
    owner_id: tf.sale_owner_id || "",
    due_at: "",
    priority: "medium",
    evidence_required: false,
    evidence_type: "",
  });

  const { data: profiles } = useQuery({
    queryKey: ["profiles_active_simple"],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name").eq("is_active", true).order("full_name");
      return data || [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("tour_tasks").insert({
        tour_file_id: tourFileId,
        title: form.title,
        description: form.description || null,
        department: form.department,
        owner_id: form.owner_id,
        due_at: form.due_at ? new Date(form.due_at).toISOString() : null,
        priority: form.priority,
        evidence_required: form.evidence_required,
        evidence_type: form.evidence_type || null,
        status: "todo",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Đã tạo task");
      qc.invalidateQueries({ queryKey: ["tour_tasks", tourFileId] });
      onOpenChange(false);
      setForm({ ...form, title: "", description: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Tạo task mới</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Tiêu đề *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <Label>Mô tả</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Phòng</Label>
              <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ưu tiên</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Thấp</SelectItem>
                  <SelectItem value="medium">Trung bình</SelectItem>
                  <SelectItem value="high">Cao</SelectItem>
                  <SelectItem value="critical">Khẩn cấp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Chủ việc *</Label>
              <Select value={form.owner_id} onValueChange={(v) => setForm({ ...form, owner_id: v })}>
                <SelectTrigger><SelectValue placeholder="Chọn người làm..." /></SelectTrigger>
                <SelectContent>
                  {(profiles || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Hạn (deadline)</Label>
              <Input type="datetime-local" value={form.due_at} onChange={(e) => setForm({ ...form, due_at: e.target.value })} />
            </div>
            <div className="col-span-2 flex items-center justify-between border rounded p-3">
              <div>
                <Label>Yêu cầu bằng chứng</Label>
                <p className="text-xs text-muted-foreground">Nếu bật, không thể báo xong nếu chưa upload bằng chứng.</p>
              </div>
              <Switch checked={form.evidence_required} onCheckedChange={(v) => setForm({ ...form, evidence_required: v })} />
            </div>
            {form.evidence_required && (
              <div className="col-span-2">
                <Label>Loại bằng chứng</Label>
                <Input value={form.evidence_type} onChange={(e) => setForm({ ...form, evidence_type: e.target.value })}
                  placeholder="document / payment_proof / supplier_confirmation..." />
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Huỷ</Button>
          <Button onClick={() => create.mutate()} disabled={!form.title || !form.owner_id || create.isPending}>
            {create.isPending ? "Đang tạo..." : "Tạo task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
