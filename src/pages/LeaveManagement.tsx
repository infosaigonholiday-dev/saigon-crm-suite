import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const leaveTypes: Record<string, string> = {
  ANNUAL: "Phép năm", SICK: "Ốm đau", COMPENSATORY: "Phép bù",
  UNPAID: "Không lương", MATERNITY: "Thai sản", WEDDING: "Cưới", BEREAVEMENT: "Tang",
};

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Chờ duyệt", className: "bg-warning/15 text-warning" },
  APPROVED: { label: "Đã duyệt", className: "bg-success/15 text-success" },
  REJECTED: { label: "Từ chối", className: "bg-destructive/10 text-destructive" },
};

// Roles that can approve
const APPROVER_ROLES = ["ADMIN", "HR_MANAGER", "HCNS", "MANAGER", "DIEUHAN"];
// Roles that see all requests
const FULL_VIEW_ROLES = ["ADMIN", "HR_MANAGER", "HCNS"];
// Roles that see department-scoped
const DEPT_SCOPED_ROLES = ["MANAGER", "DIEUHAN"];

export default function LeaveManagement() {
  const { user, userRole } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("PENDING");

  const isFullView = FULL_VIEW_ROLES.includes(userRole ?? "");
  const isDeptScoped = DEPT_SCOPED_ROLES.includes(userRole ?? "");
  const canApprove = APPROVER_ROLES.includes(userRole ?? "");
  const showTeamTab = isFullView || isDeptScoped;

  // RLS already filters data appropriately
  const { data: allRequests = [], isLoading } = useQuery({
    queryKey: ["all_leave_requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select("*, employees(full_name, employee_code, departments(name))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Get my employee id
  const { data: myEmpId } = useQuery({
    queryKey: ["my-employee-id-leave"],
    queryFn: async () => {
      const { data } = await supabase
        .from("employees")
        .select("id")
        .eq("profile_id", user?.id ?? "")
        .maybeSingle();
      return data?.id ?? null;
    },
    enabled: !!user?.id,
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

  const myRequests = allRequests.filter(r => r.employee_id === myEmpId);
  const teamRequests = allRequests; // RLS already filters
  const pendingCount = teamRequests.filter(r => r.status === "PENDING").length;

  function renderTable(requests: any[], showApproveButtons: boolean) {
    const filtered = requests.filter(r => statusFilter === "ALL" || r.status === statusFilter);
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nhân viên</TableHead>
            <TableHead>Phòng ban</TableHead>
            <TableHead>Loại</TableHead>
            <TableHead>Từ ngày</TableHead>
            <TableHead>Đến ngày</TableHead>
            <TableHead>Số ngày</TableHead>
            <TableHead>Lý do</TableHead>
            <TableHead>Trạng thái</TableHead>
            {showApproveButtons && <TableHead>Thao tác</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((r) => {
            const emp = r.employees as any;
            const st = statusConfig[r.status ?? "PENDING"] ?? statusConfig.PENDING;
            return (
              <TableRow key={r.id}>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{emp?.full_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{emp?.employee_code}</p>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{emp?.departments?.name ?? "—"}</TableCell>
                <TableCell>{leaveTypes[r.leave_type] ?? r.leave_type}</TableCell>
                <TableCell>{r.start_date}</TableCell>
                <TableCell>{r.end_date}</TableCell>
                <TableCell className="font-medium">{r.total_days}</TableCell>
                <TableCell className="max-w-[150px] truncate text-sm">{r.reason ?? "—"}</TableCell>
                <TableCell><Badge variant="outline" className={st.className}>{st.label}</Badge></TableCell>
                {showApproveButtons && (
                  <TableCell>
                    {r.status === "PENDING" && (
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-success" onClick={() => updateStatus.mutate({ id: r.id, status: "APPROVED" })}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => updateStatus.mutate({ id: r.id, status: "REJECTED" })}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
          {filtered.length === 0 && (
            <TableRow><TableCell colSpan={showApproveButtons ? 9 : 8} className="text-center py-8 text-muted-foreground">Không có dữ liệu</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Quản lý nghỉ phép</h1>
        <p className="text-sm text-muted-foreground">
          {showTeamTab ? `${pendingCount} đơn chờ duyệt` : "Đơn nghỉ phép của bạn"}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Danh sách đơn nghỉ phép</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả</SelectItem>
                <SelectItem value="PENDING">Chờ duyệt</SelectItem>
                <SelectItem value="APPROVED">Đã duyệt</SelectItem>
                <SelectItem value="REJECTED">Từ chối</SelectItem>
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
                    {isDeptScoped ? "Đơn phòng tôi" : "Tất cả đơn"}
                    {pendingCount > 0 && <Badge variant="destructive" className="ml-2 text-[10px] h-5">{pendingCount}</Badge>}
                  </TabsTrigger>
                  <TabsTrigger value="mine">Đơn của tôi</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="team" className="mt-0">
                {renderTable(teamRequests, canApprove)}
              </TabsContent>
              <TabsContent value="mine" className="mt-0">
                {renderTable(myRequests, false)}
              </TabsContent>
            </Tabs>
          ) : (
            renderTable(myRequests, false)
          )}
        </CardContent>
      </Card>
    </div>
  );
}
