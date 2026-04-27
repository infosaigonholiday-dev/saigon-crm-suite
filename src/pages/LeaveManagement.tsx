import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Check, X, Plus, Trash2, AlertTriangle, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usePermissions } from "@/hooks/usePermissions";
import { useMyDepartmentId } from "@/hooks/useScopedQuery";
import { EmployeeAvatar } from "@/components/employees/EmployeeAvatar";

const leaveTypes: Record<string, string> = {
  ANNUAL: "Phép năm", SICK: "Ốm đau", COMPENSATORY: "Phép bù",
  UNPAID: "Không lương", MATERNITY: "Thai sản", PATERNITY: "Phụ sản",
  WEDDING: "Cưới", BEREAVEMENT: "Tang",
};

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Chờ duyệt", className: "bg-warning/15 text-warning" },
  APPROVED: { label: "Đã duyệt", className: "bg-success/15 text-success" },
  REJECTED: { label: "Từ chối", className: "bg-destructive/10 text-destructive" },
  CANCELLED: { label: "Đã hủy", className: "bg-muted text-muted-foreground line-through" },
};

const MANAGER_ROLES = ["ADMIN","SUPER_ADMIN","HR_MANAGER","HCNS","MANAGER","GDKD","DIEUHAN"];
const MANAGER_POSITIONS = ["GIAM_DOC","PHO_GIAM_DOC","TRUONG_PHONG","PHO_PHONG"];
const DELETE_ALLOWED_ROLES = ["ADMIN","SUPER_ADMIN","HCNS","HR_MANAGER","MANAGER","GDKD","DIEUHAN"];

const MONTHLY_LIMIT = 3;

function isManagerLevel(role: string | null | undefined, position: string | null | undefined): boolean {
  return MANAGER_ROLES.includes(role || "") || MANAGER_POSITIONS.includes(position || "");
}

// Tính số ngày approved overlap với tháng hiện tại
function daysInCurrentMonth(requests: any[], employeeId: string, schedules?: any[]): number {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  // Tập day_of_week NV này KHÔNG làm việc (dùng để loại khỏi quota)
  let offDays: Set<number> | null = null;
  if (schedules && schedules.length > 0) {
    const empSched = schedules.filter(s => s.employee_id === employeeId);
    if (empSched.length > 0) {
      offDays = new Set(empSched.filter(s => s.is_working === false).map(s => s.day_of_week));
    }
  }
  let total = 0;
  for (const r of requests) {
    if (r.employee_id !== employeeId) continue;
    if (r.status !== "APPROVED") continue;
    const start = new Date(r.start_date);
    const end = new Date(r.end_date);
    const overlapStart = start > monthStart ? start : monthStart;
    const overlapEnd = end < monthEnd ? end : monthEnd;
    if (overlapEnd < overlapStart) continue;
    // Đếm từng ngày, bỏ qua ngày trùng off-schedule
    const cur = new Date(overlapStart);
    while (cur <= overlapEnd) {
      if (!offDays || !offDays.has(cur.getDay())) total++;
      cur.setDate(cur.getDate() + 1);
    }
  }
  return total;
}

function buildScheduleSummary(employeeId: string, schedules: any[]): { short: string; long: string } | null {
  const empSched = schedules.filter(s => s.employee_id === employeeId);
  if (empSched.length === 0) return null;
  const SHORT = ["CN","T2","T3","T4","T5","T6","T7"];
  const LONG = ["Chủ nhật","Thứ 2","Thứ 3","Thứ 4","Thứ 5","Thứ 6","Thứ 7"];
  const working = empSched.filter(s => s.is_working).sort((a,b) => a.day_of_week - b.day_of_week);
  if (working.length === 0) return { short: "Nghỉ", long: "Không có ngày làm việc" };
  if (working.length === 6 && !working.find(w => w.day_of_week === 0)) return { short: "T2-T7", long: "Toàn thời gian (T2-T7)" };
  return {
    short: working.map(w => SHORT[w.day_of_week]).join("-"),
    long: working.map(w => LONG[w.day_of_week]).join(", "),
  };
}

function monthlyBadgeClass(used: number): string {
  if (used >= MONTHLY_LIMIT) return "bg-destructive/15 text-destructive border-destructive/30";
  if (used === MONTHLY_LIMIT - 1) return "bg-warning/15 text-warning border-warning/30";
  return "bg-success/15 text-success border-success/30";
}

export default function LeaveManagement() {
  const { user, userRole } = useAuth();
  const { hasPermission, getScope } = usePermissions();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [showCancelled, setShowCancelled] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState<{ id: string; name: string } | null>(null);
  const [form, setForm] = useState({
    leave_type: "ANNUAL", start_date: "", end_date: "", reason: "",
  });

  const scope = getScope("leave");
  const canCreate = hasPermission("leave", "create");
  const canApprove = hasPermission("leave", "approve");
  const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";
  const isHrStaff = userRole === "HR_MANAGER" || userRole === "HCNS";
  const canDelete = DELETE_ALLOWED_ROLES.includes(userRole || "");
  const showTeamTab = isAdmin || isHrStaff || scope === "all" || scope === "department";

  const { data: myDeptId } = useMyDepartmentId(scope === "department");

  // Lấy hồ sơ employee của tôi
  const { data: myEmployee } = useQuery({
    queryKey: ["my-employee-info", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("employees")
        .select("id, full_name, position, department_id")
        .eq("profile_id", user?.id ?? "")
        .is("deleted_at", null)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });
  const myEmpId = myEmployee?.id ?? null;

  // Danh sách đơn (RLS filter)
  const { data: allRequests = [], isLoading } = useQuery({
    queryKey: ["all_leave_requests", scope, myDeptId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select("*, employees(full_name, employee_code, position, department_id, profile_id, avatar_url, employment_type, departments(name), profile:profiles(role))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Lịch làm việc tất cả NV (để tính quota chính xác cho intern)
  const { data: schedules = [] } = useQuery({
    queryKey: ["work_schedules_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_schedules" as any)
        .select("employee_id, day_of_week, is_working");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const createLeave = useMutation({
    mutationFn: async () => {
      if (!myEmpId) throw new Error("Bạn chưa có hồ sơ nhân viên. Liên hệ HR để tạo.");
      if (!form.start_date || !form.end_date) throw new Error("Vui lòng chọn ngày bắt đầu và kết thúc");
      const start = new Date(form.start_date);
      const end = new Date(form.end_date);
      const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      if (diff <= 0) throw new Error("Ngày kết thúc phải sau ngày bắt đầu");

      const { error } = await supabase.from("leave_requests").insert({
        employee_id: myEmpId,
        leave_type: form.leave_type,
        start_date: form.start_date,
        end_date: form.end_date,
        total_days: diff,
        reason: form.reason || null,
        status: "PENDING",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Đã gửi đơn nghỉ phép. Quản lý đã được thông báo.");
      queryClient.invalidateQueries({ queryKey: ["all_leave_requests"] });
      setCreateOpen(false);
      setForm({ leave_type: "ANNUAL", start_date: "", end_date: "", reason: "" });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const payload: any = { status };
      if (status === "APPROVED") {
        payload.approved_by = user?.id;
        payload.approved_at = new Date().toISOString();
      }
      const { error } = await supabase.from("leave_requests").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cập nhật thành công");
      queryClient.invalidateQueries({ queryKey: ["all_leave_requests"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Soft delete (cancel) qua RPC: ghi audit log + đổi status CANCELLED
  const cancelRequest = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data, error } = await supabase.rpc("rpc_cancel_leave_request" as any, {
        p_id: id, p_reason: reason,
      });
      if (error) throw error;
      const result = data as { ok: boolean; error?: string } | null;
      if (!result?.ok) throw new Error(result?.error || "Không thể hủy đơn");
    },
    onSuccess: () => {
      toast.success("Đã hủy đơn nghỉ phép");
      queryClient.invalidateQueries({ queryKey: ["all_leave_requests"] });
      setConfirmCancel(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const myRequests = allRequests.filter((r: any) => r.employee_id === myEmpId);
  const teamRequests = allRequests;
  const pendingCount = teamRequests.filter((r: any) => r.status === "PENDING").length;

  // Stats: số ngày tôi đã nghỉ trong tháng hiện tại
  const myMonthlyUsed = myEmpId ? daysInCurrentMonth(allRequests, myEmpId) : 0;
  const myPendingCount = myRequests.filter((r: any) => r.status === "PENDING").length;
  const currentMonthLabel = new Date().toLocaleDateString("vi-VN", { month: "2-digit", year: "numeric" });

  function renderTable(requests: any[], showActions: boolean) {
    let filtered = requests.filter((r: any) => statusFilter === "ALL" || r.status === statusFilter);
    if (!showCancelled && statusFilter !== "CANCELLED" && statusFilter !== "ALL") {
      filtered = filtered.filter((r: any) => r.status !== "CANCELLED");
    }
    if (statusFilter === "ALL" && !showCancelled) {
      filtered = filtered.filter((r: any) => r.status !== "CANCELLED");
    }
    // Sort: cancelled xuống cuối
    filtered = [...filtered].sort((a, b) => {
      if (a.status === "CANCELLED" && b.status !== "CANCELLED") return 1;
      if (b.status === "CANCELLED" && a.status !== "CANCELLED") return -1;
      return 0;
    });

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nhân viên</TableHead>
            <TableHead>Phòng ban</TableHead>
            <TableHead>Cấp</TableHead>
            <TableHead>Tháng {currentMonthLabel}</TableHead>
            <TableHead>Loại</TableHead>
            <TableHead>Từ ngày</TableHead>
            <TableHead>Đến ngày</TableHead>
            <TableHead>Số ngày</TableHead>
            <TableHead>Lý do</TableHead>
            <TableHead>Trạng thái</TableHead>
            {showActions && <TableHead className="text-right">Thao tác</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((r: any) => {
            const emp = r.employees;
            const empRole = emp?.profile?.role;
            const isReqManagerLevel = isManagerLevel(empRole, emp?.position);
            const st = statusConfig[r.status ?? "PENDING"] ?? statusConfig.PENDING;
            const isMyOwn = r.employee_id === myEmpId;
            const isCancelled = r.status === "CANCELLED";
            const monthlyUsed = daysInCurrentMonth(allRequests, r.employee_id);

            const canDeleteThis =
              showActions && !isCancelled && (canDelete || isMyOwn);

            const canApproveThis =
              showActions && r.status === "PENDING" &&
              (
                isMyOwn ? isAdmin :
                isReqManagerLevel ? (isAdmin || userRole === "HR_MANAGER") :
                (canApprove || isAdmin)
              );

            return (
              <TableRow key={r.id} className={isCancelled ? "opacity-60" : ""}>
                <TableCell>
                  <div className={`flex items-center gap-2 ${isCancelled ? "line-through" : ""}`}>
                    <EmployeeAvatar url={(emp as any)?.avatar_url} name={emp?.full_name} size={24} />
                    <div>
                      <p className="font-medium text-sm">{emp?.full_name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{emp?.employee_code}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{emp?.departments?.name ?? "—"}</TableCell>
                <TableCell>
                  {isReqManagerLevel ? (
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-[10px]">Quản lý</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">Nhân viên</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`${monthlyBadgeClass(monthlyUsed)} text-[11px]`}>
                    {monthlyUsed}/{MONTHLY_LIMIT} ngày
                  </Badge>
                </TableCell>
                <TableCell>{leaveTypes[r.leave_type] ?? r.leave_type}</TableCell>
                <TableCell>{r.start_date}</TableCell>
                <TableCell>{r.end_date}</TableCell>
                <TableCell className="font-medium">{r.total_days}</TableCell>
                <TableCell className="max-w-[280px] text-sm align-top">
                  <p className="line-clamp-3 whitespace-pre-wrap break-words leading-snug" title={r.reason ?? ""}>
                    {r.reason ?? "—"}
                  </p>
                  {isCancelled && r.cancel_reason && (
                    <p className="text-[10px] text-destructive mt-1 italic">Hủy: {r.cancel_reason}</p>
                  )}
                </TableCell>
                <TableCell><Badge variant="outline" className={st.className}>{st.label}</Badge></TableCell>
                {showActions && (
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      {canApproveThis && (
                        <>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-success"
                            onClick={() => updateStatus.mutate({ id: r.id, status: "APPROVED" })} title="Duyệt">
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                            onClick={() => updateStatus.mutate({ id: r.id, status: "REJECTED" })} title="Từ chối">
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {showActions && r.status === "PENDING" && !isMyOwn && !canApproveThis && isReqManagerLevel && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-[10px]">
                                Cần ADMIN duyệt
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>Đơn của cấp quản lý — chỉ ADMIN/HR Trưởng mới có quyền duyệt.</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {canDeleteThis && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setConfirmCancel({ id: r.id, name: emp?.full_name ?? "nhân viên" })}
                          title="Hủy đơn">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
          {filtered.length === 0 && (
            <TableRow><TableCell colSpan={showActions ? 11 : 10} className="text-center py-8 text-muted-foreground">Không có dữ liệu</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Quản lý nghỉ phép</h1>
          <p className="text-sm text-muted-foreground">
            {showTeamTab ? `${pendingCount} đơn chờ duyệt` : "Đơn nghỉ phép của bạn"} · Quy định: tối đa {MONTHLY_LIMIT} ngày/tháng
          </p>
        </div>
        {canCreate && (
          myEmpId ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Tạo đơn nghỉ phép
            </Button>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" disabled className="opacity-70">
                    <AlertTriangle className="h-4 w-4 mr-1 text-warning" /> Tạo đơn nghỉ phép
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Tài khoản chưa liên kết hồ sơ nhân viên — liên hệ HCNS</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        )}
      </div>

      {canCreate && !myEmpId && (
        <div className="flex items-start gap-3 p-3 rounded-md bg-warning/10 border border-warning/30 text-sm">
          <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-warning">Chưa có hồ sơ nhân viên</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tài khoản của bạn chưa được liên kết hồ sơ nhân viên. Liên hệ HR/HCNS để tạo hồ sơ trước khi gửi đơn nghỉ phép.
            </p>
          </div>
          {(isAdmin || isHrStaff) && (
            <Button size="sm" variant="outline" onClick={() => window.location.href = "/nhan-su"}>
              Mở Nhân sự
            </Button>
          )}
        </div>
      )}

      {/* Cards thống kê — quy định tối đa 3 ngày/tháng */}
      {canCreate && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Đã nghỉ tháng {currentMonthLabel}</p>
              {myEmpId ? (
                <p className={`text-2xl font-bold ${myMonthlyUsed >= MONTHLY_LIMIT ? "text-destructive" : myMonthlyUsed === MONTHLY_LIMIT - 1 ? "text-warning" : ""}`}>
                  {myMonthlyUsed} / {MONTHLY_LIMIT} ngày
                </p>
              ) : (
                <p className="text-2xl font-bold text-muted-foreground">— / {MONTHLY_LIMIT} ngày</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {myMonthlyUsed >= MONTHLY_LIMIT ? "Đã hết phép tháng này" : `Còn ${MONTHLY_LIMIT - myMonthlyUsed} ngày`}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Đơn của tôi đang chờ</p>
              <p className="text-2xl font-bold">{myEmpId ? myPendingCount : "—"}</p>
              <p className="text-xs text-muted-foreground mt-1">Chờ quản lý/HR duyệt</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Quy định nghỉ phép</p>
              <p className="text-2xl font-bold text-primary">{MONTHLY_LIMIT} ngày/tháng</p>
              <p className="text-xs text-muted-foreground mt-1">Tối đa được duyệt mỗi tháng</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">Danh sách đơn nghỉ phép</CardTitle>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={showCancelled} onCheckedChange={(v) => setShowCancelled(v === true)} />
                <span>Hiện đơn đã hủy</span>
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả</SelectItem>
                  <SelectItem value="PENDING">Chờ duyệt</SelectItem>
                  <SelectItem value="APPROVED">Đã duyệt</SelectItem>
                  <SelectItem value="REJECTED">Từ chối</SelectItem>
                  <SelectItem value="CANCELLED">Đã hủy</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : showTeamTab ? (
            <Tabs defaultValue="team" className="w-full">
              <div className="px-4 pt-2">
                <TabsList>
                  <TabsTrigger value="team">
                    {scope === "department" && !isAdmin && !isHrStaff ? "Đơn phòng tôi" : "Tất cả đơn"}
                    {pendingCount > 0 && <Badge variant="destructive" className="ml-2 text-[10px] h-5">{pendingCount}</Badge>}
                  </TabsTrigger>
                  <TabsTrigger value="mine">
                    Đơn của tôi
                    {myPendingCount > 0 && <Badge variant="secondary" className="ml-2 text-[10px] h-5">{myPendingCount}</Badge>}
                  </TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="team" className="mt-0">
                {renderTable(teamRequests, canApprove || isAdmin || canDelete)}
              </TabsContent>
              <TabsContent value="mine" className="mt-0">
                {renderTable(myRequests, true)}
              </TabsContent>
            </Tabs>
          ) : (
            renderTable(myRequests, true)
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo đơn xin nghỉ phép</DialogTitle>
            <DialogDescription>
              Đơn sẽ được gửi đến quản lý/HR phụ trách để duyệt. Quy định: tối đa {MONTHLY_LIMIT} ngày/tháng.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Loại phép</Label>
              <Select value={form.leave_type} onValueChange={v => setForm(f => ({ ...f, leave_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(leaveTypes).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Từ ngày</Label>
                <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Đến ngày</Label>
                <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
            {form.start_date && form.end_date && (
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Tổng số ngày: {Math.max(0, Math.ceil((new Date(form.end_date).getTime() - new Date(form.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1)}
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Lý do</Label>
              <Textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={2} placeholder="Nêu lý do nghỉ phép..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Hủy</Button>
            <Button onClick={() => createLeave.mutate()} disabled={createLeave.isPending}>
              {createLeave.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Gửi đơn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmCancel} onOpenChange={(o) => !o && setConfirmCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận hủy đơn nghỉ phép</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn hủy đơn nghỉ phép của <span className="font-semibold">{confirmCancel?.name}</span>?
              Hành động này sẽ được ghi lại trong nhật ký hệ thống.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelRequest.isPending}>Không hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={cancelRequest.isPending}
              onClick={() => confirmCancel && cancelRequest.mutate({
                id: confirmCancel.id,
                reason: `Hủy bởi ${userRole}: ${user?.email ?? "system"}`,
              })}
            >
              {cancelRequest.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Xác nhận hủy
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
