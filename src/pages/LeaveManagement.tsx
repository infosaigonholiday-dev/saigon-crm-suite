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
import { usePermissions } from "@/hooks/usePermissions";
import { useMyDepartmentId } from "@/hooks/useScopedQuery";

const leaveTypes: Record<string, string> = {
  ANNUAL: "Phép năm", SICK: "Ốm đau", COMPENSATORY: "Phép bù",
  UNPAID: "Không lương", MATERNITY: "Thai sản", PATERNITY: "Phụ sản",
  WEDDING: "Cưới", BEREAVEMENT: "Tang",
};

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Chờ duyệt", className: "bg-warning/15 text-warning" },
  APPROVED: { label: "Đã duyệt", className: "bg-success/15 text-success" },
  REJECTED: { label: "Từ chối", className: "bg-destructive/10 text-destructive" },
  CANCELLED: { label: "Đã hủy", className: "bg-muted text-muted-foreground" },
};

const MANAGER_ROLES = ["ADMIN","SUPER_ADMIN","HR_MANAGER","HCNS","MANAGER","GDKD","DIEUHAN"];
const MANAGER_POSITIONS = ["GIAM_DOC","PHO_GIAM_DOC","TRUONG_PHONG","PHO_PHONG"];

function isManagerLevel(role: string | null | undefined, position: string | null | undefined): boolean {
  return MANAGER_ROLES.includes(role || "") || MANAGER_POSITIONS.includes(position || "");
}

export default function LeaveManagement() {
  const { user, userRole } = useAuth();
  const { hasPermission, getScope } = usePermissions();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    leave_type: "ANNUAL", start_date: "", end_date: "", reason: "",
  });

  const scope = getScope("leave");
  const canCreate = hasPermission("leave", "create");
  const canApprove = hasPermission("leave", "approve");
  const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";
  const isHrStaff = userRole === "HR_MANAGER" || userRole === "HCNS";
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

  // Chính sách nghỉ phép
  const { data: policies = [] } = useQuery({
    queryKey: ["leave-policies"],
    queryFn: async () => {
      const { data } = await supabase
        .from("leave_policies")
        .select("leave_type, days_per_year, paid")
        .order("leave_type");
      return data ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });

  // Danh sách đơn (RLS filter)
  const { data: allRequests = [], isLoading } = useQuery({
    queryKey: ["all_leave_requests", scope, myDeptId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select("*, employees(full_name, employee_code, position, department_id, profile_id, departments(name), profile:profiles(role))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
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

  const cancelOwn = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leave_requests").update({ status: "CANCELLED" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Đã hủy đơn nghỉ phép");
      queryClient.invalidateQueries({ queryKey: ["all_leave_requests"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const myRequests = allRequests.filter((r: any) => r.employee_id === myEmpId);
  const teamRequests = allRequests;
  const pendingCount = teamRequests.filter((r: any) => r.status === "PENDING").length;

  // Cards thống kê (lấy từ leave_policies)
  const currentYear = new Date().getFullYear();
  const myApprovedThisYear = myRequests.filter(
    (r: any) => r.status === "APPROVED" && new Date(r.start_date).getFullYear() === currentYear
  );
  const annualPolicy = policies.find(p => p.leave_type === "ANNUAL");
  const annualUsed = myApprovedThisYear
    .filter((r: any) => r.leave_type === "ANNUAL")
    .reduce((s: number, r: any) => s + Number(r.total_days), 0);
  const annualLimit = annualPolicy?.days_per_year ?? 0;
  const annualRemaining = annualLimit - annualUsed;

  const usageByType: Record<string, number> = {};
  for (const r of myApprovedThisYear) {
    usageByType[r.leave_type] = (usageByType[r.leave_type] || 0) + Number(r.total_days);
  }
  const myPendingCount = myRequests.filter((r: any) => r.status === "PENDING").length;

  function renderTable(requests: any[], showActions: boolean) {
    const filtered = requests.filter((r: any) => statusFilter === "ALL" || r.status === statusFilter);
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nhân viên</TableHead>
            <TableHead>Phòng ban</TableHead>
            <TableHead>Cấp</TableHead>
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

            let actionUI: React.ReactNode = null;
            if (showActions && r.status === "PENDING") {
              if (isMyOwn) {
                actionUI = isAdmin ? (
                  <div className="flex gap-1 justify-end">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-success" onClick={() => updateStatus.mutate({ id: r.id, status: "APPROVED" })}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => updateStatus.mutate({ id: r.id, status: "REJECTED" })}>
                      <X className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => cancelOwn.mutate(r.id)} title="Hủy đơn">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-1 items-center justify-end">
                    <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px]">
                      Chờ cấp trên
                    </Badge>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => cancelOwn.mutate(r.id)} title="Hủy đơn của tôi">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              } else if (isReqManagerLevel && !isAdmin && userRole !== "HR_MANAGER") {
                actionUI = (
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
                );
              } else {
                actionUI = (
                  <div className="flex gap-1 justify-end">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-success" onClick={() => updateStatus.mutate({ id: r.id, status: "APPROVED" })}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => updateStatus.mutate({ id: r.id, status: "REJECTED" })}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              }
            }

            return (
              <TableRow key={r.id}>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{emp?.full_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{emp?.employee_code}</p>
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
                <TableCell>{leaveTypes[r.leave_type] ?? r.leave_type}</TableCell>
                <TableCell>{r.start_date}</TableCell>
                <TableCell>{r.end_date}</TableCell>
                <TableCell className="font-medium">{r.total_days}</TableCell>
                <TableCell className="max-w-[150px] truncate text-sm">{r.reason ?? "—"}</TableCell>
                <TableCell><Badge variant="outline" className={st.className}>{st.label}</Badge></TableCell>
                {showActions && <TableCell className="text-right">{actionUI}</TableCell>}
              </TableRow>
            );
          })}
          {filtered.length === 0 && (
            <TableRow><TableCell colSpan={showActions ? 10 : 9} className="text-center py-8 text-muted-foreground">Không có dữ liệu</TableCell></TableRow>
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
            {showTeamTab ? `${pendingCount} đơn chờ duyệt` : "Đơn nghỉ phép của bạn"}
          </p>
        </div>
        {canCreate && (
          <Button
            onClick={() => setCreateOpen(true)}
            disabled={!myEmpId}
            title={!myEmpId ? "Bạn chưa có hồ sơ nhân viên" : ""}
          >
            <Plus className="h-4 w-4 mr-1" /> Tạo đơn nghỉ phép
          </Button>
        )}
      </div>

      {canCreate && !myEmpId && user && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-warning/10 border border-warning/30 text-sm">
          <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-warning">Chưa có hồ sơ nhân viên</p>
            <p className="text-xs text-muted-foreground">Tài khoản của bạn chưa được liên kết hồ sơ nhân viên. Liên hệ HR/HCNS để tạo hồ sơ trước khi gửi đơn nghỉ phép.</p>
          </div>
        </div>
      )}

      {myEmpId && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Phép năm còn lại</p>
              <p className={`text-2xl font-bold ${annualRemaining < 0 ? "text-destructive" : annualRemaining < 3 ? "text-warning" : ""}`}>
                {annualRemaining} / {annualLimit} ngày
              </p>
              <p className="text-xs text-muted-foreground mt-1">Năm {currentYear}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Đã sử dụng năm nay</p>
              <p className="text-2xl font-bold">{myApprovedThisYear.reduce((s: number, r: any) => s + Number(r.total_days), 0)} ngày</p>
              <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-1.5">
                {Object.entries(usageByType).slice(0, 3).map(([type, days]) => (
                  <span key={type} className="px-1.5 py-0.5 rounded bg-muted">{leaveTypes[type] ?? type}: {days}</span>
                ))}
                {Object.keys(usageByType).length === 0 && <span>Chưa có đơn được duyệt</span>}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Đơn của tôi đang chờ</p>
              <p className="text-2xl font-bold">{myPendingCount}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {policies.length > 0 ? `${policies.length} loại phép có sẵn` : ""}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">Danh sách đơn nghỉ phép</CardTitle>
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
                {renderTable(teamRequests, canApprove || isAdmin)}
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
              Đơn sẽ được gửi đến quản lý/HR phụ trách để duyệt.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Loại phép</Label>
              <Select value={form.leave_type} onValueChange={v => setForm(f => ({ ...f, leave_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {policies.length > 0 ? (
                    policies.map(p => (
                      <SelectItem key={p.leave_type} value={p.leave_type}>
                        {leaveTypes[p.leave_type] ?? p.leave_type} ({p.days_per_year}/năm{!p.paid ? ", không lương" : ""})
                      </SelectItem>
                    ))
                  ) : (
                    Object.entries(leaveTypes).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))
                  )}
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
    </div>
  );
}
