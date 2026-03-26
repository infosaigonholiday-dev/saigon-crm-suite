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

const leaveTypes: Record<string, string> = {
  ANNUAL: "Phép năm", SICK: "Ốm đau", COMPENSATORY: "Phép bù",
  UNPAID: "Không lương", MATERNITY: "Thai sản", WEDDING: "Cưới", BEREAVEMENT: "Tang",
};

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Chờ duyệt", className: "bg-warning/15 text-warning" },
  APPROVED: { label: "Đã duyệt", className: "bg-success/15 text-success" },
  REJECTED: { label: "Từ chối", className: "bg-destructive/10 text-destructive" },
};

export default function LeaveManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("PENDING");

  const { data: requests = [], isLoading } = useQuery({
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

  const filtered = requests.filter(r => statusFilter === "ALL" || r.status === statusFilter);

  const pendingCount = requests.filter(r => r.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Quản lý nghỉ phép</h1>
        <p className="text-sm text-muted-foreground">{pendingCount} đơn chờ duyệt</p>
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
          ) : (
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
                  <TableHead>Thao tác</TableHead>
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
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Không có dữ liệu</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
