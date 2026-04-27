import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Target, Plus, Search, Calendar, User, Building2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

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
const TYPE_SUGGESTIONS = [
  "email_mkt", "sms_mkt", "cold_call", "recruitment", "tour_ops",
  "finance_close", "ads", "content", "b2b_telesale", "web_fix", "digital_audit", "other",
];

interface CampaignFormState {
  id?: string;
  name: string;
  description: string;
  campaign_type: string;
  department_id: string;
  owner_id: string;
  priority: string;
  start_date: string;
  end_date: string;
  target_value: string;
  target_unit: string;
  budget: string;
  tags: string;
  notes: string;
}

const emptyForm: CampaignFormState = {
  name: "", description: "", campaign_type: "other", department_id: "",
  owner_id: "", priority: "medium", start_date: "", end_date: "",
  target_value: "", target_unit: "", budget: "", tags: "", notes: "",
};

export default function CampaignList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { has } = usePermissions();
  const qc = useQueryClient();

  const canCreate = has("campaigns", "create");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<CampaignFormState>(emptyForm);

  const { data: departments = [] } = useQuery({
    queryKey: ["departments-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("departments").select("id, name, code").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, full_name, department_id, profile_id")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["campaigns", deptFilter, statusFilter, priorityFilter, search],
    queryFn: async () => {
      let q = supabase
        .from("campaigns")
        .select("*, department:departments(name), owner:employees!campaigns_owner_id_fkey(full_name)")
        .order("created_at", { ascending: false });

      if (deptFilter !== "all") q = q.eq("department_id", deptFilter);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      if (priorityFilter !== "all") q = q.eq("priority", priorityFilter);
      if (search.trim()) q = q.ilike("name", `%${search.trim()}%`);

      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const filteredEmployees = useMemo(
    () => form.department_id ? employees.filter((e: any) => e.department_id === form.department_id) : employees,
    [employees, form.department_id]
  );

  const saveMutation = useMutation({
    mutationFn: async (f: CampaignFormState) => {
      const payload: any = {
        name: f.name.trim(),
        description: f.description || null,
        campaign_type: f.campaign_type || "other",
        department_id: f.department_id || null,
        owner_id: f.owner_id || null,
        priority: f.priority,
        start_date: f.start_date || null,
        end_date: f.end_date || null,
        target_value: f.target_value ? Number(f.target_value) : null,
        target_unit: f.target_unit || null,
        budget: f.budget ? Number(f.budget) : null,
        tags: f.tags ? f.tags.split(",").map(t => t.trim()).filter(Boolean) : null,
        notes: f.notes || null,
      };
      if (f.id) {
        const { error } = await supabase.from("campaigns").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        payload.created_by = user?.id;
        payload.status = "draft";
        const { error } = await supabase.from("campaigns").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Đã lưu chiến dịch");
      setDialogOpen(false);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: (e: any) => toast.error("Lỗi: " + e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Vui lòng nhập tên chiến dịch");
    if (!form.department_id) return toast.error("Vui lòng chọn phòng ban");
    if (!form.owner_id) return toast.error("Vui lòng chọn người phụ trách");
    saveMutation.mutate(form);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Target className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Chiến dịch</h1>
            <p className="text-sm text-muted-foreground">{campaigns.length} chiến dịch</p>
          </div>
        </div>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setForm(emptyForm); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Tạo chiến dịch</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{form.id ? "Sửa" : "Tạo"} chiến dịch</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Tên chiến dịch *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div>
                  <Label>Mô tả</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Loại chiến dịch</Label>
                    <Select value={form.campaign_type} onValueChange={(v) => setForm({ ...form, campaign_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TYPE_SUGGESTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Ưu tiên</Label>
                    <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PRIORITY_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Phòng ban *</Label>
                    <Select value={form.department_id} onValueChange={(v) => setForm({ ...form, department_id: v, owner_id: "" })}>
                      <SelectTrigger><SelectValue placeholder="Chọn phòng ban" /></SelectTrigger>
                      <SelectContent>
                        {departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Người phụ trách *</Label>
                    <Select value={form.owner_id} onValueChange={(v) => setForm({ ...form, owner_id: v })} disabled={!form.department_id}>
                      <SelectTrigger><SelectValue placeholder="Chọn nhân viên" /></SelectTrigger>
                      <SelectContent>
                        {filteredEmployees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Ngày bắt đầu</Label>
                    <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                  </div>
                  <div>
                    <Label>Ngày kết thúc</Label>
                    <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                  </div>
                  <div>
                    <Label>Mục tiêu</Label>
                    <Input type="number" value={form.target_value} onChange={(e) => setForm({ ...form, target_value: e.target.value })} />
                  </div>
                  <div>
                    <Label>Đơn vị mục tiêu</Label>
                    <Input value={form.target_unit} onChange={(e) => setForm({ ...form, target_unit: e.target.value })} placeholder="VD: emails, VNĐ" />
                  </div>
                  <div>
                    <Label>Ngân sách (VNĐ)</Label>
                    <Input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
                  </div>
                  <div>
                    <Label>Tags (phẩy ngăn cách)</Label>
                    <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="vd: q4, urgent" />
                  </div>
                </div>
                <div>
                  <Label>Ghi chú</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
                  <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Đang lưu..." : "Lưu"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Tìm theo tên..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger><SelectValue placeholder="Phòng ban" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả phòng ban</SelectItem>
              {departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả ưu tiên</SelectItem>
              {PRIORITY_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Cards */}
      {isLoading ? (
        <p className="text-center text-muted-foreground py-8">Đang tải...</p>
      ) : campaigns.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground">Chưa có chiến dịch nào</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((c: any) => {
            const status = STATUS_OPTIONS.find(s => s.value === c.status);
            const priority = PRIORITY_OPTIONS.find(p => p.value === c.priority);
            const pct = c.target_value && c.target_value > 0
              ? Math.min(100, Math.round((Number(c.actual_value || 0) / Number(c.target_value)) * 100))
              : null;
            return (
              <Card key={c.id} className="cursor-pointer hover:shadow-md transition" onClick={() => navigate(`/chien-dich/${c.id}`)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base line-clamp-2">{c.name}</CardTitle>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {status && <Badge className={`${status.color} text-white hover:${status.color}`}>{status.label}</Badge>}
                    {priority && <Badge variant="outline" className={`${priority.color} text-white border-0`}>{priority.label}</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5" />
                    <span>{c.department?.name ?? "-"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                    <span>{c.owner?.full_name ?? "-"}</span>
                  </div>
                  {(c.start_date || c.end_date) && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        {c.start_date ? format(new Date(c.start_date), "dd/MM/yy") : "?"}
                        {" → "}
                        {c.end_date ? format(new Date(c.end_date), "dd/MM/yy") : "?"}
                      </span>
                    </div>
                  )}
                  {pct !== null && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Tiến độ</span>
                        <span className="font-medium">{c.actual_value || 0}/{c.target_value} {c.target_unit}</span>
                      </div>
                      <Progress value={pct} />
                    </div>
                  )}
                  {c.tags && c.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {c.tags.slice(0, 5).map((t: string, i: number) => (
                        <span key={i} className="text-xs px-2 py-0.5 bg-muted rounded-full">{t}</span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
