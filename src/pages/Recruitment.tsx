import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2, Briefcase, Building2, Calendar, Copy } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import CandidateFormDialog from "@/components/recruitment/CandidateFormDialog";
import CandidateDetailDialog from "@/components/recruitment/CandidateDetailDialog";

type CandidateStatus = "new" | "cv_screening" | "interview" | "offer" | "onboarded" | "rejected" | "withdrawn";

const COLUMNS: { id: CandidateStatus; label: string; color: string }[] = [
  { id: "new", label: "Mới", color: "bg-secondary" },
  { id: "cv_screening", label: "Lọc CV", color: "bg-blue-50" },
  { id: "interview", label: "Phỏng vấn", color: "bg-yellow-50" },
  { id: "offer", label: "Offer", color: "bg-orange-50" },
  { id: "onboarded", label: "Nhận việc", color: "bg-blue-100" },
  { id: "rejected", label: "Từ chối", color: "bg-destructive/10" },
  { id: "withdrawn", label: "Rút lui", color: "bg-muted" },
];

const CANDIDATE_COLS = "id, full_name, phone, email, position_applied, department_id, source, cv_url, salary_expectation, offer_salary, interview_date, interview_result, note, status, rejection_reason, assigned_hr, created_by, created_at, departments(name)";

export default function Recruitment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [detail, setDetail] = useState<any>(null);

  // Reject reason dialog
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; id: string; reason: string }>({ open: false, id: "", reason: "" });

  // Onboard confirm dialog
  const [onboardDialog, setOnboardDialog] = useState<{ open: boolean; candidate: any | null }>({ open: false, candidate: null });
  const [onboardingPwd, setOnboardingPwd] = useState<string | null>(null);
  const [onboarding, setOnboarding] = useState(false);

  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ["candidates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidates")
        .select(CANDIDATE_COLS)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, extra }: { id: string; status: CandidateStatus; extra?: Record<string, any> }) => {
      const { error } = await supabase.from("candidates").update({ status, ...extra }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["candidates"] }),
    onError: (e: any) => toast.error("Lỗi", { description: e.message }),
  });

  const handleDragStart = useCallback((id: string) => setDraggedId(id), []);

  const handleDrop = useCallback(
    (col: CandidateStatus) => {
      if (!draggedId) return;
      const cand = candidates.find((c: any) => c.id === draggedId);
      setDraggedId(null);
      if (!cand || cand.status === col) return;

      if (col === "rejected") {
        setRejectDialog({ open: true, id: cand.id, reason: "" });
        return;
      }
      if (col === "onboarded") {
        setOnboardDialog({ open: true, candidate: cand });
        return;
      }
      updateStatus.mutate({ id: cand.id, status: col });
    },
    [draggedId, candidates, updateStatus]
  );

  const confirmReject = () => {
    if (!rejectDialog.reason.trim()) {
      toast.error("Vui lòng nhập lý do từ chối");
      return;
    }
    updateStatus.mutate(
      { id: rejectDialog.id, status: "rejected", extra: { rejection_reason: rejectDialog.reason.trim() } },
      { onSuccess: () => setRejectDialog({ open: false, id: "", reason: "" }) }
    );
  };

  const performOnboarding = async () => {
    const cand = onboardDialog.candidate;
    if (!cand) return;
    if (!cand.email) {
      toast.error("Ứng viên chưa có email — không thể tạo tài khoản");
      return;
    }
    setOnboarding(true);
    try {
      // 1. Check duplicate email in profiles
      const { data: existProfile } = await supabase
        .from("profiles")
        .select("id")
        .ilike("email", cand.email.trim())
        .maybeSingle();
      if (existProfile) {
        toast.error("Email đã tồn tại trong hệ thống");
        setOnboarding(false);
        return;
      }

      // 2. Insert employee
      const { data: newEmp, error: empErr } = await supabase
        .from("employees")
        .insert({
          full_name: cand.full_name,
          department_id: cand.department_id,
          position: cand.position_applied,
          email: cand.email,
          phone: cand.phone,
          status: "active",
          hire_date: new Date().toISOString().slice(0, 10),
        } as any)
        .select("id")
        .single();
      if (empErr) throw empErr;

      // 3. Create auth account via edge function
      const { data: acctData, error: acctErr } = await supabase.functions.invoke("manage-employee-accounts", {
        body: {
          action: "create",
          full_name: cand.full_name,
          email: cand.email,
          role: "TOUR", // safe default; HR can change later
          department_id: cand.department_id,
          employee_id: newEmp!.id,
        },
      });
      if (acctErr) throw new Error("Lỗi tạo tài khoản: " + acctErr.message);
      if ((acctData as any)?.error) throw new Error((acctData as any).error);

      // 4. Insert onboarding checklist
      const items = [
        { item_name: "Ký cam kết bảo mật (NDA)", is_required: true },
        { item_name: "Đọc nội quy công ty", is_required: true },
        { item_name: "Đọc SOP phòng ban", is_required: true },
      ].map((it) => ({ ...it, employee_id: newEmp!.id, is_completed: false }));
      const { error: clErr } = await supabase.from("onboarding_checklist").insert(items);
      if (clErr) throw new Error("Lỗi tạo checklist: " + clErr.message);

      // 5. Update candidate
      await supabase.from("candidates").update({ status: "onboarded" }).eq("id", cand.id);

      setOnboardingPwd("sgh123456");
      toast.success("Đã onboard nhân viên thành công");
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    } catch (e: any) {
      toast.error("Lỗi onboarding", { description: e.message });
    } finally {
      setOnboarding(false);
    }
  };

  const closeOnboard = () => {
    setOnboardDialog({ open: false, candidate: null });
    setOnboardingPwd(null);
  };

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tuyển dụng</h1>
          <p className="text-sm text-muted-foreground">{candidates.length} ứng viên</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />Thêm ứng viên
        </Button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const colCands = candidates.filter((c: any) => c.status === col.id);
          return (
            <div key={col.id} className="min-w-[240px] flex-shrink-0" onDragOver={(e) => e.preventDefault()} onDrop={() => handleDrop(col.id)}>
              <div className={`rounded-t-lg px-3 py-2 ${col.color}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-xs">{col.label}</span>
                  <Badge variant="secondary" className="text-xs h-5">{colCands.length}</Badge>
                </div>
              </div>
              <div className="bg-muted/30 rounded-b-lg min-h-[400px] p-1.5 space-y-1.5">
                {colCands.map((c: any) => (
                  <Card
                    key={c.id}
                    draggable
                    onDragStart={() => handleDragStart(c.id)}
                    onClick={() => setDetail(c)}
                    className={`cursor-pointer hover:shadow-md transition-shadow ${draggedId === c.id ? "opacity-50" : ""}`}
                  >
                    <CardContent className="p-2.5 space-y-1">
                      <p className="font-medium text-sm">{c.full_name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Briefcase className="h-3 w-3" />{c.position_applied}
                      </p>
                      {c.departments?.name && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-3 w-3" />{c.departments.name}
                        </p>
                      )}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        {c.source && <Badge variant="outline" className="text-[10px] h-4">{c.source}</Badge>}
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />{new Date(c.created_at).toLocaleDateString("vi-VN")}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <CandidateFormDialog open={formOpen} onOpenChange={setFormOpen} />
      <CandidateDetailDialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)} candidate={detail} />

      {/* Reject reason dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(o) => !o && setRejectDialog({ open: false, id: "", reason: "" })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lý do từ chối</DialogTitle>
            <DialogDescription>Nhập lý do để lưu vào hồ sơ ứng viên.</DialogDescription>
          </DialogHeader>
          <Textarea rows={4} value={rejectDialog.reason} onChange={(e) => setRejectDialog({ ...rejectDialog, reason: e.target.value })} placeholder="VD: Chưa phù hợp về kinh nghiệm, mức lương..." />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectDialog({ open: false, id: "", reason: "" })}>Hủy</Button>
            <Button onClick={confirmReject} disabled={updateStatus.isPending}>Xác nhận</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Onboard confirm dialog */}
      <Dialog open={onboardDialog.open} onOpenChange={(o) => !o && closeOnboard()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo tài khoản cho {onboardDialog.candidate?.full_name}</DialogTitle>
            <DialogDescription>
              Thao tác này sẽ tạo hồ sơ nhân viên, tài khoản đăng nhập và giao checklist onboarding.
            </DialogDescription>
          </DialogHeader>
          {onboardingPwd ? (
            <div className="space-y-3">
              <p className="text-sm">Đã tạo tài khoản thành công. Mật khẩu mặc định:</p>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                <code className="font-mono text-sm flex-1">{onboardingPwd}</code>
                <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(onboardingPwd); toast.success("Đã sao chép"); }}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Nhân viên sẽ phải đổi mật khẩu khi đăng nhập lần đầu.</p>
            </div>
          ) : (
            <div className="text-sm space-y-1">
              <p>• Email: <code className="font-mono">{onboardDialog.candidate?.email || "(chưa có)"}</code></p>
              <p>• Vị trí: {onboardDialog.candidate?.position_applied}</p>
              <p>• Phòng ban: {onboardDialog.candidate?.departments?.name}</p>
            </div>
          )}
          <DialogFooter>
            {onboardingPwd ? (
              <Button onClick={closeOnboard}>Đóng</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={closeOnboard} disabled={onboarding}>Hủy</Button>
                <Button onClick={performOnboarding} disabled={onboarding || !onboardDialog.candidate?.email}>
                  {onboarding && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Xác nhận onboard
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
