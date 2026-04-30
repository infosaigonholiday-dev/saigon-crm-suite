import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { notifyUser } from "@/lib/notifyByRole";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  candidate?: any;
}

const SOURCES = ["TopCV", "LinkedIn", "Facebook", "Referral", "Nội bộ", "Khác"];

export default function CandidateFormDialog({ open, onOpenChange, candidate }: Props) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isEdit = !!candidate?.id;

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    position_applied: "",
    department_id: "",
    source: "",
    salary_expectation: "",
    note: "",
  });
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        full_name: candidate?.full_name ?? "",
        phone: candidate?.phone ?? "",
        email: candidate?.email ?? "",
        position_applied: candidate?.position_applied ?? "",
        department_id: candidate?.department_id ?? "",
        source: candidate?.source ?? "",
        salary_expectation: candidate?.salary_expectation ? String(candidate.salary_expectation) : "",
        note: candidate?.note ?? "",
      });
      setCvFile(null);
    }
  }, [open, candidate]);

  const { data: depts = [] } = useQuery({
    queryKey: ["departments-for-recruitment"],
    queryFn: async () => {
      const { data, error } = await supabase.from("departments").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!form.full_name.trim()) throw new Error("Vui lòng nhập họ tên");
      if (!form.position_applied.trim()) throw new Error("Vui lòng nhập vị trí");
      if (!form.department_id) throw new Error("Vui lòng chọn phòng ban");

      let cv_url: string | undefined;
      if (cvFile) {
        setUploading(true);
        const ext = cvFile.name.split(".").pop();
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("cv-files").upload(path, cvFile);
        setUploading(false);
        if (upErr) throw new Error("Lỗi upload CV: " + upErr.message);
        cv_url = path;
      }

      const payload: any = {
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        position_applied: form.position_applied.trim(),
        department_id: form.department_id,
        source: form.source || null,
        salary_expectation: form.salary_expectation ? Number(form.salary_expectation) : null,
        note: form.note.trim() || null,
      };
      if (cv_url) payload.cv_url = cv_url;

      if (isEdit) {
        const { error } = await supabase.from("candidates").update(payload).eq("id", candidate.id);
        if (error) throw error;
        return { id: candidate.id, isNew: false } as const;
      } else {
        payload.assigned_hr = user?.id;
        payload.created_by = user?.id;
        payload.status = "new";
        const { data: inserted, error } = await supabase.from("candidates").insert(payload).select("id, full_name, position_applied, assigned_hr, departments(name)").single();
        if (error) throw error;
        return { id: inserted.id, isNew: true, row: inserted } as const;
      }
    },
    onSuccess: async (result) => {
      toast.success(isEdit ? "Đã cập nhật ứng viên" : "Đã thêm ứng viên");
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      onOpenChange(false);
      // Notify assigned HR (only on create, and only if different from current user)
      if (result.isNew && result.row?.assigned_hr && result.row.assigned_hr !== user?.id) {
        try {
          await notifyUser(result.row.assigned_hr, {
            type: "CANDIDATE_NEW",
            title: `Ứng viên mới: ${result.row.full_name}`,
            message: `Vị trí: ${result.row.position_applied} — Phòng: ${(result.row as any).departments?.name ?? "—"}`,
            entity_type: "candidate",
            entity_id: result.id,
            priority: "medium",
          });
        } catch (e) {
          console.error("Notify candidate new failed:", e);
        }
      }
    },
    onError: (e: any) => toast.error("Lỗi", { description: e.message }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Sửa ứng viên" : "Thêm ứng viên"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Họ tên *</Label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>SĐT</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Vị trí ứng tuyển *</Label>
            <Input value={form.position_applied} onChange={(e) => setForm({ ...form, position_applied: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Phòng ban *</Label>
              <Select value={form.department_id} onValueChange={(v) => setForm({ ...form, department_id: v })}>
                <SelectTrigger><SelectValue placeholder="Chọn phòng" /></SelectTrigger>
                <SelectContent>
                  {depts.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nguồn</Label>
              <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                <SelectTrigger><SelectValue placeholder="Chọn nguồn" /></SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Lương mong muốn (VNĐ)</Label>
            <Input type="number" value={form.salary_expectation} onChange={(e) => setForm({ ...form, salary_expectation: e.target.value })} />
          </div>
          <div>
            <Label>Upload CV (PDF/Word, &lt; 5MB)</Label>
            <Input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f && f.size > 5 * 1024 * 1024) {
                  toast.error("File quá 5MB");
                  e.target.value = "";
                  return;
                }
                setCvFile(f ?? null);
              }}
            />
            {candidate?.cv_url && !cvFile && <p className="text-xs text-muted-foreground mt-1">CV hiện tại: {candidate.cv_url}</p>}
          </div>
          <div>
            <Label>Ghi chú</Label>
            <Textarea rows={3} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button onClick={() => submit.mutate()} disabled={submit.isPending || uploading}>
            {(submit.isPending || uploading) && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {uploading ? "Đang upload CV..." : isEdit ? "Lưu" : "Thêm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
