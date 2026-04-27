import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmployeeAvatar } from "@/components/employees/EmployeeAvatar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, Plus, Loader2, ChevronLeft, ChevronRight, Pencil, Trash2, Download } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { exportToCSV } from "@/lib/exportUtils";
import { useNavigate } from "react-router-dom";
import { EmployeeFormDialog } from "@/components/employees/EmployeeFormDialog";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { useMyDepartmentId } from "@/hooks/useScopedQuery";

const statusLabels: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "Đang làm", className: "bg-success/15 text-success border-success/30" },
  PROBATION: { label: "Thử việc", className: "bg-warning/15 text-warning border-warning/30" },
  INTERN: { label: "Thực tập", className: "bg-accent/15 text-accent border-accent/30" },
  RESIGNED: { label: "Đã nghỉ", className: "bg-destructive/10 text-destructive border-destructive/20" },
  ON_LEAVE: { label: "Nghỉ phép", className: "bg-muted text-muted-foreground" },
};

const employmentTypes: Record<string, string> = {
  FULLTIME: "Toàn thời gian", PROBATION: "Thử việc", INTERN: "Thực tập sinh",
  PARTTIME: "Bán thời gian", CONTRACT: "Hợp đồng", SEASONAL: "Thời vụ",
};

const levelLabels: Record<string, string> = {
  "C-LEVEL": "C-Level",
  "DIRECTOR": "Giám đốc",
  "MANAGER": "Trưởng phòng",
  "STAFF": "Nhân viên",
  "INTERN": "Thực tập sinh",
};

const levelColors: Record<string, string> = {
  "C-LEVEL": "bg-destructive/10 text-destructive border-destructive/20",
  "DIRECTOR": "bg-warning/15 text-warning border-warning/30",
  "MANAGER": "bg-success/15 text-success border-success/30",
  "STAFF": "bg-primary/15 text-primary border-primary/30",
  "INTERN": "bg-muted text-muted-foreground",
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

const ROLE_LABEL_MAP: Record<string, string> = {
  ADMIN: "Admin",
  HCNS: "NV HCNS", HR_MANAGER: "Leader HCNS",
  KETOAN: "Kế toán", MANAGER: "Trưởng phòng", GDKD: "GĐ Kinh doanh", DIEUHAN: "Điều hành",
  SALE_DOMESTIC: "Sale NĐ", SALE_INBOUND: "Sale IB", SALE_OUTBOUND: "Sale OB", SALE_MICE: "Sale MICE",
  TOUR: "HDV", MKT: "MKT",
  INTERN_DIEUHAN: "TTS ĐH", INTERN_SALE_DOMESTIC: "TTS KD NĐ", INTERN_SALE_OUTBOUND: "TTS KD OB",
  INTERN_SALE_MICE: "TTS KD MICE", INTERN_SALE_INBOUND: "TTS KD IB",
  INTERN_MKT: "TTS MKT", INTERN_HCNS: "TTS HCNS", INTERN_KETOAN: "TTS KT",
};

const PAGE_SIZE = 20;

export default function Employees() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission, getScope } = usePermissions();
  const { userRole, user } = useAuth();
  const canDelete = hasPermission("staff", "delete");
  const canCreate = hasPermission("staff", "create");
  const canEdit = hasPermission("staff", "edit");

  const scope = getScope("staff");
  const isSelfOnly = scope === "personal";
  const isDeptScoped = scope === "department";
  const { data: myDeptId } = useMyDepartmentId(isDeptScoped);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [page, setPage] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEmployeeId, setEditEmployeeId] = useState<string | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // For self-only roles, redirect to own profile
  const { data: myEmployee } = useQuery({
    queryKey: ["my-employee-id"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id")
        .eq("profile_id", user?.id ?? "")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: isSelfOnly && !!user?.id,
  });

  useEffect(() => {
    if (isSelfOnly && myEmployee?.id) {
      navigate(`/nhan-su/${myEmployee.id}`, { replace: true });
    }
  }, [isSelfOnly, myEmployee, navigate]);

  // Get my department name for header
  const { data: myDept } = useQuery({
    queryKey: ["my-department-name"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("department_id, departments:department_id(name)")
        .eq("id", user?.id ?? "")
        .maybeSingle();
      return (data?.departments as any)?.name ?? null;
    },
    enabled: isDeptScoped && !!user?.id,
  });

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setSearch(value);
      setPage(0);
    }, 300);
  }, []);

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("departments").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: result, isLoading, refetch } = useQuery({
    queryKey: ["employees", search, statusFilter, deptFilter, typeFilter, page, scope, myDeptId],
    queryFn: async () => {
      let query = supabase
        .from("employees")
        .select("id, employee_code, full_name, phone, email, position, level, status, employment_type, gender, department_id, profile_id, avatar_url, departments(name), profiles:profile_id(role)", { count: "exact" })
        .is("deleted_at" as any, null)
        .order("created_at", { ascending: false });

      // Apply scope filter
      if (isDeptScoped && myDeptId) {
        query = query.eq("department_id", myDeptId);
      }

      if (search) {
        query = query.or(`full_name.ilike.%${search}%,employee_code.ilike.%${search}%,email.ilike.%${search}%`);
      }
      if (statusFilter !== "ALL") query = query.eq("status", statusFilter);
      if (deptFilter !== "ALL") query = query.eq("department_id", deptFilter);
      if (typeFilter !== "ALL") query = query.eq("employment_type", typeFilter);
      query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data ?? [], count: count ?? 0 };
    },
    enabled: !isSelfOnly && (scope === "all" || (isDeptScoped && !!myDeptId)),
  });

  const employees = result?.data ?? [];
  const totalCount = result?.count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  function openEdit(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setEditEmployeeId(id);
    setDialogOpen(true);
  }

  function openNew() {
    setEditEmployeeId(undefined);
    setDialogOpen(true);
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from("employees").update({ deleted_at: new Date().toISOString() }).eq("id", deleteId);
      if (error) throw error;
      toast.success("Đã xóa nhân viên");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Lỗi xóa nhân viên");
    } finally {
      setDeleteId(null);
    }
  }

  // If self-only role and still loading, show loader
  if (isSelfOnly) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const headerTitle = isDeptScoped && myDept
    ? `Nhân viên phòng ${myDept}`
    : "Nhân sự";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{headerTitle}</h1>
          <p className="text-sm text-muted-foreground">Tổng: {totalCount} nhân viên</p>
        </div>
        {canCreate && (
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => exportToCSV(
                    employees.map(e => ({
                      'Mã NV': e.employee_code, 'Họ tên': e.full_name, 'Điện thoại': e.phone ?? '',
                      Email: e.email ?? '', 'Vị trí': e.position ?? '', 'Phòng ban': (e.departments as any)?.name ?? '',
                      'Trạng thái': e.status ?? ''
                    })),
                    'danh-sach-nhan-vien'
                  )}>
                    <Download className="h-4 w-4 mr-2" />Xuất CSV
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Tải file CSV — mở bằng Google Sheet hoặc Excel</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button onClick={openNew}>
              <Plus className="h-4 w-4 mr-2" />Thêm nhân viên
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Tìm tên, mã NV, email..." className="pl-9" value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)} />
            </div>
            <div className="flex gap-2 flex-wrap">
              {!isDeptScoped && (
                <Select value={deptFilter} onValueChange={(v) => { setDeptFilter(v); setPage(0); }}>
                  <SelectTrigger className="w-[160px]"><SelectValue placeholder="Phòng ban" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tất cả phòng ban</SelectItem>
                    {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả</SelectItem>
                  {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(0); }}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Loại NV" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả</SelectItem>
                  {Object.entries(employmentTypes).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã NV</TableHead>
                    <TableHead>Họ tên</TableHead>
                    <TableHead>Điện thoại</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Vị trí</TableHead>
                    <TableHead>Phòng ban</TableHead>
                    <TableHead>Quyền HT</TableHead>
                    <TableHead>Loại NV</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    {(canEdit || canDelete) && <TableHead className="w-[90px]">Thao tác</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((e) => {
                    const st = statusLabels[e.status ?? "ACTIVE"] ?? statusLabels.ACTIVE;
                    const deptName = (e.departments as any)?.name ?? "—";
                    const profileRole = (e as any).profiles?.role as string | undefined;
                    const roleLabel = profileRole ? (ROLE_LABEL_MAP[profileRole] ?? profileRole) : "—";
                    const lvlLabel = levelLabels[e.level ?? ""] ?? e.level ?? "";
                    const lvlClass = levelColors[e.level ?? ""] ?? "bg-muted text-muted-foreground";
                    return (
                      <TableRow key={e.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/nhan-su/${e.id}`)}>
                        <TableCell className="font-mono text-xs">{e.employee_code}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <EmployeeAvatar url={(e as any).avatar_url} name={e.full_name} size={32} />
                            <div className="min-w-0">
                              <p className="font-medium truncate">{e.full_name}</p>
                              {lvlLabel && (
                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 mt-0.5 ${lvlClass}`}>
                                  {lvlLabel}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{e.phone ?? "—"}</TableCell>
                        <TableCell className="text-sm">{e.email ?? "—"}</TableCell>
                        <TableCell>{e.position ?? "—"}</TableCell>
                        <TableCell>{deptName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{roleLabel}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">{employmentTypes[e.employment_type ?? ""] ?? e.employment_type ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={st.className}>{st.label}</Badge>
                        </TableCell>
                        {(canEdit || canDelete) && (
                          <TableCell>
                            <div className="flex gap-0.5">
                              {canEdit && (
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(ev) => openEdit(e.id, ev)} title="Sửa">
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {canDelete && (
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(ev) => { ev.stopPropagation(); setDeleteId(e.id); }} title="Xóa">
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                  {employees.length === 0 && (
                    <TableRow><TableCell colSpan={(canEdit || canDelete) ? 10 : 9} className="text-center py-8 text-muted-foreground">Không có dữ liệu</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-muted-foreground">Trang {page + 1} / {totalPages} | Tổng: {totalCount} nhân viên</p>
                  <div className="flex gap-1">
                    <Button variant="outline" size="icon" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <EmployeeFormDialog open={dialogOpen} onOpenChange={setDialogOpen} onSuccess={() => { refetch(); setDialogOpen(false); }} employeeId={editEmployeeId} />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa nhân viên?</AlertDialogTitle>
            <AlertDialogDescription>Nhân viên sẽ bị xóa mềm (có thể khôi phục). Tài khoản đăng nhập không bị ảnh hưởng.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
