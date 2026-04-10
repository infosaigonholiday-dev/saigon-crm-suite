import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Phone, ArrowRightCircle, Search, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type RawContact = {
  id: string;
  full_name: string | null;
  phone: string;
  email: string | null;
  company_name: string | null;
  contact_type: string;
  source: string | null;
  note: string | null;
  status: string;
  call_count: number;
  last_called_at: string | null;
  assigned_to: string | null;
  created_by: string;
  department_id: string | null;
  converted_lead_id: string | null;
  created_at: string;
  company_size: string | null;
  planned_event_date: string | null;
};

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  new: { label: "Mới", variant: "secondary" },
  called_no_answer: { label: "Không bắt máy", variant: "outline" },
  called_not_interested: { label: "Không quan tâm", variant: "destructive" },
  called_interested: { label: "Quan tâm", variant: "default" },
  converted_to_lead: { label: "Đã chuyển Lead", variant: "default" },
  duplicate: { label: "Trùng", variant: "destructive" },
  invalid: { label: "Sai số", variant: "destructive" },
};

const CALL_RESULTS = [
  { value: "called_no_answer", label: "Không bắt máy" },
  { value: "called_not_interested", label: "Không quan tâm" },
  { value: "called_interested", label: "Quan tâm" },
  { value: "invalid", label: "Sai số" },
];

export default function RawContacts() {
  const { user, userRole } = useAuth();
  const { hasPermission, getScope } = usePermissions();
  const queryClient = useQueryClient();
  const scope = getScope("raw_contacts");
  const canCreate = hasPermission("raw_contacts", "create");
  const canEdit = hasPermission("raw_contacts", "edit");
  const showDeptTab = scope === "department" || scope === "all";

  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [callTarget, setCallTarget] = useState<RawContact | null>(null);
  const [callResult, setCallResult] = useState("");
  const [callNote, setCallNote] = useState("");
  const [activeTab, setActiveTab] = useState("my");

  // Add form
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formType, setFormType] = useState("personal");
  const [formSource, setFormSource] = useState("");
  const [formNote, setFormNote] = useState("");
  const [formCompanySize, setFormCompanySize] = useState("");
  const [formPlannedEventDate, setFormPlannedEventDate] = useState("");
  const [phoneWarning, setPhoneWarning] = useState<string | null>(null);
  const [checkingPhone, setCheckingPhone] = useState(false);

  // Dept filter for admin
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);

  const { data: departments = [] } = useQuery({
    queryKey: ["departments-list"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("id, name").order("name");
      return data || [];
    },
    enabled: scope === "all",
  });

  const { data: myProfile } = useQuery({
    queryKey: ["my-profile-dept", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("department_id").eq("id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  // My data query
  const { data: myData = [], isLoading: loadingMy } = useQuery({
    queryKey: ["raw-contacts-my", user?.id, search],
    queryFn: async () => {
      let q = supabase.from("raw_contacts").select("*")
        .or(`created_by.eq.${user!.id},assigned_to.eq.${user!.id}`)
        .order("created_at", { ascending: false });
      if (search) q = q.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,company_name.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as RawContact[];
    },
    enabled: !!user,
  });

  // Dept data query
  const { data: deptData = [], isLoading: loadingDept } = useQuery({
    queryKey: ["raw-contacts-dept", selectedDeptId, myProfile?.department_id, search],
    queryFn: async () => {
      const deptId = scope === "all" ? selectedDeptId : myProfile?.department_id;
      let q = supabase.from("raw_contacts").select("*").order("created_at", { ascending: false });
      if (deptId) q = q.eq("department_id", deptId);
      if (search) q = q.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,company_name.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as RawContact[];
    },
    enabled: showDeptTab && activeTab === "dept",
  });

  const currentData = activeTab === "my" ? myData : deptData;
  const loading = activeTab === "my" ? loadingMy : loadingDept;

  // Phone duplicate check
  const checkPhone = useCallback(async (phone: string) => {
    if (phone.length < 8) { setPhoneWarning(null); return; }
    setCheckingPhone(true);
    try {
      const { data: rawDup } = await supabase.from("raw_contacts").select("id, created_by").eq("phone", phone).not("status", "in", "(duplicate,invalid)").limit(1);
      if (rawDup && rawDup.length > 0) {
        setPhoneWarning("SĐT đã có trong Kho Data");
        setCheckingPhone(false);
        return;
      }
      const { data: leadDup } = await supabase.from("leads").select("id, full_name").eq("phone", phone).limit(1);
      if (leadDup && leadDup.length > 0) {
        setPhoneWarning(`Đã là Lead: ${leadDup[0].full_name}`);
        setCheckingPhone(false);
        return;
      }
      const { data: custDup } = await supabase.from("customers").select("id, full_name").eq("phone", phone).limit(1);
      if (custDup && custDup.length > 0) {
        setPhoneWarning(`Đã là Khách hàng: ${custDup[0].full_name}`);
        setCheckingPhone(false);
        return;
      }
      setPhoneWarning(null);
    } catch { setPhoneWarning(null); }
    setCheckingPhone(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { if (formPhone) checkPhone(formPhone); }, 500);
    return () => clearTimeout(timer);
  }, [formPhone, checkPhone]);

  // Insert mutation
  const insertMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("raw_contacts").insert({
        full_name: formName || null,
        phone: formPhone,
        email: formEmail || null,
        company_name: formCompany || null,
        contact_type: formType,
        source: formSource || null,
        note: formNote || null,
        company_size: formCompanySize || null,
        planned_event_date: formPlannedEventDate || null,
        created_by: user!.id,
        assigned_to: user!.id,
        department_id: myProfile?.department_id || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Đã thêm data mới");
      queryClient.invalidateQueries({ queryKey: ["raw-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["raw-contacts-my"] });
      setAddOpen(false);
      resetForm();
    },
    onError: (e: any) => toast.error(e.message?.includes("idx_raw_contacts_phone") ? "SĐT đã tồn tại" : "Lỗi: " + e.message),
  });

  const resetForm = () => {
    setFormName(""); setFormPhone(""); setFormEmail(""); setFormCompany("");
    setFormType("personal"); setFormSource(""); setFormNote(""); setPhoneWarning(null);
    setFormCompanySize(""); setFormPlannedEventDate("");
  };

  // Log call mutation
  const logCallMutation = useMutation({
    mutationFn: async () => {
      if (!callTarget) return;
      const { error } = await supabase.from("raw_contacts").update({
        status: callResult,
        call_count: (callTarget.call_count || 0) + 1,
        last_called_at: new Date().toISOString(),
        note: callNote ? `${callTarget.note ? callTarget.note + "\n" : ""}[${format(new Date(), "dd/MM")}] ${callNote}` : callTarget.note,
      }).eq("id", callTarget.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Đã ghi nhận cuộc gọi");
      queryClient.invalidateQueries({ queryKey: ["raw-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["raw-contacts-my"] });
      queryClient.invalidateQueries({ queryKey: ["raw-contacts-dept"] });
      setCallOpen(false);
      setCallTarget(null);
      setCallResult("");
      setCallNote("");
    },
    onError: (e: any) => toast.error("Lỗi: " + e.message),
  });

  // Convert to lead mutation
  const convertMutation = useMutation({
    mutationFn: async (contact: RawContact) => {
      const { data: lead, error: leadErr } = await supabase.from("leads").insert({
        full_name: contact.full_name || "Chưa có tên",
        phone: contact.phone,
        email: contact.email,
        company_name: contact.company_name,
        company_size: contact.company_size ? parseInt(contact.company_size) || null : null,
        planned_travel_date: contact.planned_event_date || null,
        assigned_to: contact.assigned_to || user!.id,
        department_id: contact.department_id,
        status: "NEW",
        temperature: "warm",
      } as any).select("id").single();
      if (leadErr) throw leadErr;

      const { error: updateErr } = await supabase.from("raw_contacts").update({
        status: "converted_to_lead",
        converted_lead_id: lead.id,
      }).eq("id", contact.id);
      if (updateErr) throw updateErr;
    },
    onSuccess: () => {
      toast.success("Đã chuyển thành Lead thành công");
      queryClient.invalidateQueries({ queryKey: ["raw-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["raw-contacts-my"] });
      queryClient.invalidateQueries({ queryKey: ["raw-contacts-dept"] });
    },
    onError: (e: any) => toast.error("Lỗi: " + e.message),
  });

  const renderTable = (data: RawContact[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Người phụ trách</TableHead>
          <TableHead>SĐT</TableHead>
          <TableHead>Công ty</TableHead>
          <TableHead>Quy mô</TableHead>
          <TableHead>TG dự kiến</TableHead>
          <TableHead>Trạng thái</TableHead>
          <TableHead className="text-center">Số gọi</TableHead>
          <TableHead>Gọi cuối</TableHead>
          <TableHead className="text-right">Thao tác</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
           <TableCell colSpan={9} className="text-center text-muted-foreground py-8">Chưa có dữ liệu</TableCell>
          </TableRow>
        ) : data.map((c) => {
          const st = STATUS_MAP[c.status] || { label: c.status, variant: "outline" as const };
          return (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.full_name || "—"}</TableCell>
              <TableCell>{c.phone}</TableCell>
              <TableCell>{c.company_name || "—"}</TableCell>
              <TableCell>{c.company_size || "—"}</TableCell>
              <TableCell>{c.planned_event_date ? format(new Date(c.planned_event_date), "dd/MM/yyyy") : "—"}</TableCell>
              <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
              <TableCell className="text-center">{c.call_count}</TableCell>
              <TableCell>{c.last_called_at ? format(new Date(c.last_called_at), "dd/MM HH:mm") : "—"}</TableCell>
              <TableCell className="text-right space-x-1">
                {canEdit && c.status !== "converted_to_lead" && c.status !== "invalid" && (
                  <Button size="sm" variant="outline" onClick={() => { setCallTarget(c); setCallOpen(true); }}>
                    <Phone className="h-3.5 w-3.5 mr-1" /> Gọi
                  </Button>
                )}
                {canEdit && c.status === "called_interested" && (
                  <Button size="sm" variant="default" onClick={() => convertMutation.mutate(c)} disabled={convertMutation.isPending}>
                    <ArrowRightCircle className="h-3.5 w-3.5 mr-1" /> Chuyển Lead
                  </Button>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kho Data</h1>
          <p className="text-muted-foreground text-sm">Quản lý data thô telesale</p>
        </div>
        {canCreate && (
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Thêm data
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Tìm tên, SĐT, công ty..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        {scope === "all" && activeTab === "dept" && departments.length > 0 && (
          <Select value={selectedDeptId || "all"} onValueChange={(v) => setSelectedDeptId(v === "all" ? null : v)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Tất cả phòng ban" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả phòng ban</SelectItem>
              {departments.map(d => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="my">Data của tôi</TabsTrigger>
          {showDeptTab && <TabsTrigger value="dept">{scope === "all" ? "Tất cả" : "Data phòng"}</TabsTrigger>}
        </TabsList>
        <TabsContent value="my">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : renderTable(myData)}
            </CardContent>
          </Card>
        </TabsContent>
        {showDeptTab && (
          <TabsContent value="dept">
            <Card>
              <CardContent className="p-0">
                {loadingDept ? (
                  <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : renderTable(deptData)}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Thêm data mới</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Số điện thoại *</Label>
              <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="09xxxxxxxx" />
              {checkingPhone && <p className="text-xs text-muted-foreground mt-1">Đang kiểm tra...</p>}
              {phoneWarning && <p className="text-xs text-destructive mt-1">⚠️ {phoneWarning}</p>}
            </div>
            <div>
              <Label>Người phụ trách</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Nguyễn Văn A" />
            </div>
            <div>
              <Label>Công ty</Label>
              <Input value={formCompany} onChange={(e) => setFormCompany(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Loại</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Cá nhân</SelectItem>
                    <SelectItem value="b2b">Doanh nghiệp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nguồn</Label>
                <Input value={formSource} onChange={(e) => setFormSource(e.target.value)} placeholder="Zalo, FB..." />
              </div>
            </div>
            {formType === "b2b" && (
              <div>
                <Label>Quy mô nhân sự</Label>
                <Input value={formCompanySize} onChange={(e) => setFormCompanySize(e.target.value)} placeholder="VD: 50-100 người" />
              </div>
            )}
            <div>
              <Label>Thời gian tổ chức dự kiến</Label>
              <Input type="date" value={formPlannedEventDate} onChange={(e) => setFormPlannedEventDate(e.target.value)} />
            </div>
            <div>
              <Label>Ghi chú</Label>
              <Textarea value={formNote} onChange={(e) => setFormNote(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddOpen(false); resetForm(); }}>Hủy</Button>
            <Button onClick={() => insertMutation.mutate()} disabled={!formPhone || insertMutation.isPending}>
              {insertMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Thêm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Call Log Dialog */}
      <Dialog open={callOpen} onOpenChange={(o) => { setCallOpen(o); if (!o) { setCallTarget(null); setCallResult(""); setCallNote(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Ghi nhận cuộc gọi</DialogTitle></DialogHeader>
          {callTarget && (
            <div className="space-y-4">
              <p className="text-sm"><strong>{callTarget.full_name || callTarget.phone}</strong> — Lần gọi thứ {(callTarget.call_count || 0) + 1}</p>
              <div>
                <Label>Kết quả</Label>
                <Select value={callResult} onValueChange={setCallResult}>
                  <SelectTrigger><SelectValue placeholder="Chọn kết quả" /></SelectTrigger>
                  <SelectContent>
                    {CALL_RESULTS.map(r => (<SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ghi chú</Label>
                <Textarea value={callNote} onChange={(e) => setCallNote(e.target.value)} rows={2} placeholder="Ghi chú ngắn..." />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCallOpen(false)}>Hủy</Button>
            <Button onClick={() => logCallMutation.mutate()} disabled={!callResult || logCallMutation.isPending}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
