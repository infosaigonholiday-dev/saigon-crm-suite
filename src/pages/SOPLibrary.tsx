import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, BookOpen, Plus, Check, AlertCircle, Filter, BarChart3, ChevronLeft, FileText, ExternalLink, Upload, Link as LinkIcon, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

const CATEGORIES = [
  { value: "general", label: "Chung" },
  { value: "regulation", label: "Quy định công ty" },
  { value: "onboarding", label: "Onboarding" },
  { value: "daily", label: "Hàng ngày" },
  { value: "weekly", label: "Hàng tuần" },
  { value: "monthly", label: "Hàng tháng" },
  { value: "process", label: "Quy trình" },
  { value: "checklist", label: "Checklist" },
];

const LEVEL_OPTIONS = [
  { value: "all", label: "Tất cả cấp bậc" },
  { value: "C-LEVEL", label: "C-Level" },
  { value: "DIRECTOR", label: "Giám đốc" },
  { value: "MANAGER", label: "Trưởng phòng" },
  { value: "STAFF", label: "Nhân viên" },
  { value: "INTERN", label: "Thực tập sinh" },
];

const ADMIN_ROLES = ["ADMIN"];
const MANAGER_ROLES = ["MANAGER", "GDKD", "DIEUHAN"];
const CAN_CREATE_ROLES = [...ADMIN_ROLES, ...MANAGER_ROLES];

interface SOP {
  id: string;
  department_id: string | null;
  level: string | null;
  title: string;
  description: string | null;
  content: string;
  category: string;
  is_required: boolean;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  acknowledged?: boolean;
  file_url?: string | null;
  file_name?: string | null;
}

interface Department {
  id: string;
  code: string;
  name: string;
}

export default function SOPLibrary() {
  const { user, userRole } = useAuth();
  const { hasPermission } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [sops, setSops] = useState<SOP[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [myAcks, setMyAcks] = useState<Set<string>>(new Set());
  const [myEmployeeId, setMyEmployeeId] = useState<string | null>(null);

  // Filters
  const [filterDept, setFilterDept] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // View state
  const [selectedSop, setSelectedSop] = useState<SOP | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState("library");

  // Stats
  const [statsData, setStatsData] = useState<any[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);

  const isAdmin = ADMIN_ROLES.includes(userRole || "");
  const isManager = MANAGER_ROLES.includes(userRole || "");
  const canCreate = CAN_CREATE_ROLES.includes(userRole || "");

  useEffect(() => {
    loadData();
  }, [user]);

  async function loadData() {
    if (!user) return;
    setLoading(true);

    const [sopRes, deptRes, empRes] = await Promise.all([
      supabase.from("department_sops").select("*").order("sort_order").order("created_at", { ascending: false }),
      supabase.from("departments").select("id, code, name").order("name"),
      supabase.from("employees").select("id").eq("profile_id", user.id).is("deleted_at", null).maybeSingle(),
    ]);

    setDepartments(deptRes.data || []);
    setSops(sopRes.data || []);

    const empId = empRes.data?.id || null;
    setMyEmployeeId(empId);

    if (empId) {
      const { data: acks } = await supabase
        .from("sop_acknowledgements")
        .select("sop_id")
        .eq("employee_id", empId);
      setMyAcks(new Set((acks || []).map((a: any) => a.sop_id)));
    }

    setLoading(false);
  }

  const filteredSops = useMemo(() => {
    return sops.filter((s) => {
      if (filterDept !== "all" && s.department_id !== filterDept && s.department_id !== null) return false;
      if (filterDept === "company" && s.department_id !== null) return false;
      if (filterCategory !== "all" && s.category !== filterCategory) return false;
      return true;
    });
  }, [sops, filterDept, filterCategory]);

  async function handleAcknowledge(sopId: string) {
    if (!myEmployeeId) {
      toast.error("Không tìm thấy hồ sơ nhân viên");
      return;
    }
    const { error } = await supabase.from("sop_acknowledgements").insert({ sop_id: sopId, employee_id: myEmployeeId });
    if (error) {
      if (error.code === "23505") {
        toast.info("Bạn đã xác nhận đọc SOP này rồi");
      } else {
        toast.error("Lỗi: " + error.message);
      }
      return;
    }
    setMyAcks((prev) => new Set(prev).add(sopId));
    toast.success("Đã xác nhận đọc");
  }

  async function loadStats() {
    setStatsLoading(true);
    const { data: reqSops } = await supabase
      .from("department_sops")
      .select("id, title, department_id")
      .eq("is_required", true);

    if (!reqSops?.length) {
      setStatsData([]);
      setStatsLoading(false);
      return;
    }

    const sopIds = reqSops.map((s) => s.id);
    const { data: acks } = await supabase
      .from("sop_acknowledgements")
      .select("sop_id, employee_id")
      .in("sop_id", sopIds);

    const { data: employees } = await supabase
      .from("employees")
      .select("id, full_name, department_id")
      .is("deleted_at", null);

    const ackSet = new Set((acks || []).map((a: any) => `${a.sop_id}__${a.employee_id}`));

    const stats: any[] = [];
    for (const emp of employees || []) {
      const relevantSops = reqSops.filter(
        (s) => s.department_id === null || s.department_id === emp.department_id
      );
      const unread = relevantSops.filter((s) => !ackSet.has(`${s.id}__${emp.id}`));
      if (unread.length > 0) {
        const dept = departments.find((d) => d.id === emp.department_id);
        stats.push({
          employeeName: emp.full_name,
          department: dept?.name || "—",
          unreadCount: unread.length,
          unreadTitles: unread.map((s) => s.title),
        });
      }
    }
    setStatsData(stats);
    setStatsLoading(false);
  }

  useEffect(() => {
    if (activeTab === "stats" && (isAdmin || isManager)) {
      loadStats();
    }
  }, [activeTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getCategoryLabel = (val: string) => CATEGORIES.find((c) => c.value === val)?.label || val;
  const getDeptName = (id: string | null) => {
    if (!id) return "Toàn công ty";
    return departments.find((d) => d.id === id)?.name || "—";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Kho quy trình</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant={filterCategory === "regulation" ? "default" : "outline"}
            onClick={() => setFilterCategory(filterCategory === "regulation" ? "all" : "regulation")}
          >
            <Shield className="h-4 w-4 mr-1" /> Quy định công ty
          </Button>
          {canCreate && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-1" /> Tạo quy trình
            </Button>
          )}
        </div>
      </div>

      {(isAdmin || isManager) ? (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="library">Danh sách</TabsTrigger>
            <TabsTrigger value="stats">Thống kê</TabsTrigger>
          </TabsList>
          <TabsContent value="library"><SOPList /></TabsContent>
          <TabsContent value="stats"><StatsView /></TabsContent>
        </Tabs>
      ) : (
        <SOPList />
      )}

      {/* SOP Detail Dialog */}
      <Dialog open={!!selectedSop} onOpenChange={(o) => !o && setSelectedSop(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedSop?.title}
              {selectedSop?.is_required && <Badge variant="destructive">Bắt buộc</Badge>}
            </DialogTitle>
            <div className="flex gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{getCategoryLabel(selectedSop?.category || "")}</Badge>
              <span>{getDeptName(selectedSop?.department_id || null)}</span>
            </div>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
              {selectedSop?.content}
            </div>
            {selectedSop?.file_url && (
              <div className="mt-4 p-3 border rounded-lg flex items-center gap-3 bg-muted/50">
                <FileText className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{selectedSop.file_name || "File đính kèm"}</p>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <a href={selectedSop.file_url} target="_blank" rel="noopener noreferrer">
                    {selectedSop.file_url.startsWith("http") && !selectedSop.file_url.includes("supabase") ? (
                      <><ExternalLink className="h-4 w-4 mr-1" /> Mở link</>
                    ) : (
                      <><FileText className="h-4 w-4 mr-1" /> Tải file</>
                    )}
                  </a>
                </Button>
              </div>
            )}
          </ScrollArea>
          <DialogFooter>
            {selectedSop && !myAcks.has(selectedSop.id) && myEmployeeId && (
              <Button onClick={() => handleAcknowledge(selectedSop.id)}>
                <Check className="h-4 w-4 mr-1" /> Xác nhận đã đọc
              </Button>
            )}
            {selectedSop && myAcks.has(selectedSop.id) && (
              <Badge variant="secondary" className="text-green-600">
                <Check className="h-3 w-3 mr-1" /> Đã đọc
              </Badge>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create SOP Form */}
      {showForm && <SOPFormDialog departments={departments} isAdmin={isAdmin} userRole={userRole} userId={user?.id || ""} onClose={() => setShowForm(false)} onSaved={loadData} />}
    </div>
  );

  function SOPList() {
    return (
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={filterDept} onValueChange={setFilterDept}>
            <SelectTrigger className="w-[200px]">
              <Filter className="h-4 w-4 mr-1" />
              <SelectValue placeholder="Phòng ban" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả phòng ban</SelectItem>
              <SelectItem value="company">Toàn công ty</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Danh mục" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả danh mục</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filteredSops.length === 0 ? (
          <p className="text-muted-foreground text-center py-10">Chưa có quy trình nào.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSops.map((sop) => (
              <Card
                key={sop.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedSop(sop)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base line-clamp-2">{sop.title}</CardTitle>
                    <div className="flex gap-1 shrink-0">
                      {sop.file_url && <Badge variant="outline" className="text-[10px]"><FileText className="h-3 w-3" /></Badge>}
                      {sop.is_required && <Badge variant="destructive" className="text-[10px]">Bắt buộc</Badge>}
                      {myAcks.has(sop.id) ? (
                        <Badge variant="secondary" className="text-green-600 text-[10px]"><Check className="h-3 w-3" /></Badge>
                      ) : sop.is_required ? (
                        <Badge variant="outline" className="text-orange-500 text-[10px]"><AlertCircle className="h-3 w-3" /></Badge>
                      ) : null}
                    </div>
                  </div>
                  <CardDescription className="text-xs">
                    {getDeptName(sop.department_id)} · {getCategoryLabel(sop.category)}
                  </CardDescription>
                </CardHeader>
                {sop.description && (
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground line-clamp-2">{sop.description}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  function StatsView() {
    if (statsLoading) {
      return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
    }
    if (statsData.length === 0) {
      return <p className="text-muted-foreground text-center py-10">Tất cả nhân viên đã đọc SOP bắt buộc! 🎉</p>;
    }
    return (
      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nhân viên</TableHead>
              <TableHead>Phòng ban</TableHead>
              <TableHead className="text-center">SOP chưa đọc</TableHead>
              <TableHead>Chi tiết</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {statsData.map((row, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{row.employeeName}</TableCell>
                <TableCell>{row.department}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="destructive">{row.unreadCount}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{row.unreadTitles.join(", ")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }
}

// ======== SOP Form Dialog ========
function SOPFormDialog({
  departments,
  isAdmin,
  userRole,
  userId,
  onClose,
  onSaved,
}: {
  departments: Department[];
  isAdmin: boolean;
  userRole: string | null;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [deptId, setDeptId] = useState<string>("none");
  const [level, setLevel] = useState("all");
  const [category, setCategory] = useState("general");
  const [isRequired, setIsRequired] = useState(false);
  const [saving, setSaving] = useState(false);

  // File upload state
  const [fileUploading, setFileUploading] = useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [externalLink, setExternalLink] = useState("");

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Chỉ hỗ trợ file PDF hoặc DOCX");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File không được vượt quá 10MB");
      return;
    }

    setFileUploading(true);
    const fileExt = file.name.split(".").pop();
    const filePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

    const { data, error } = await supabase.storage.from("sop-files").upload(filePath, file);
    if (error) {
      toast.error("Upload thất bại: " + error.message);
      setFileUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("sop-files").getPublicUrl(data.path);
    setUploadedFileUrl(urlData.publicUrl);
    setUploadedFileName(file.name);
    setExternalLink("");
    setFileUploading(false);
    toast.success("Upload thành công");
  }

  function handleRemoveFile() {
    setUploadedFileUrl(null);
    setUploadedFileName(null);
  }

  const finalFileUrl = uploadedFileUrl || (externalLink.trim() || null);
  const finalFileName = uploadedFileName || (externalLink.trim() ? "Link bên ngoài" : null);

  async function handleSave() {
    if (!title.trim() || !content.trim()) {
      toast.error("Vui lòng nhập tiêu đề và nội dung");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("department_sops").insert({
      title: title.trim(),
      description: description.trim() || null,
      content: content.trim(),
      department_id: deptId === "none" ? null : deptId,
      level: level === "all" ? null : level,
      category,
      is_required: isRequired,
      created_by: userId,
      file_url: finalFileUrl,
      file_name: finalFileName,
    } as any);
    setSaving(false);
    if (error) {
      toast.error("Lỗi: " + error.message);
      return;
    }
    toast.success("Đã tạo quy trình mới");
    onSaved();
    onClose();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tạo quy trình mới</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Tiêu đề *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tên quy trình" />
          </div>
          <div>
            <Label>Mô tả ngắn</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Mô tả tóm tắt" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Phòng ban</Label>
              <Select value={deptId} onValueChange={setDeptId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Toàn công ty</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cấp bậc</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEVEL_OPTIONS.map((l) => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Danh mục</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Switch checked={isRequired} onCheckedChange={setIsRequired} id="required" />
              <Label htmlFor="required">Bắt buộc đọc</Label>
            </div>
          </div>
          <div>
            <Label>Nội dung *</Label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Viết nội dung quy trình..." rows={10} />
          </div>

          {/* File Upload Section */}
          <div className="space-y-3 border-t pt-4">
            <Label className="text-base font-semibold">Đính kèm file / Link</Label>
            
            {/* Upload file */}
            <div>
              <Label className="text-sm text-muted-foreground">Tải file lên (PDF, DOCX — tối đa 10MB)</Label>
              {uploadedFileUrl ? (
                <div className="flex items-center gap-2 mt-1 p-2 border rounded-md bg-muted/50">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm flex-1 truncate">{uploadedFileName}</span>
                  <Button size="sm" variant="ghost" onClick={handleRemoveFile}>Xóa</Button>
                </div>
              ) : (
                <div className="mt-1">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border rounded-md text-sm hover:bg-muted/50 transition-colors">
                    {fileUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {fileUploading ? "Đang tải..." : "Chọn file"}
                    <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleFileUpload} disabled={fileUploading} />
                  </label>
                </div>
              )}
            </div>

            {/* External link */}
            {!uploadedFileUrl && (
              <div>
                <Label className="text-sm text-muted-foreground">Hoặc dán link Google Drive / Google Sheet</Label>
                <div className="flex items-center gap-2 mt-1">
                  <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input
                    value={externalLink}
                    onChange={(e) => setExternalLink(e.target.value)}
                    placeholder="https://docs.google.com/..."
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Hủy</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Tạo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
