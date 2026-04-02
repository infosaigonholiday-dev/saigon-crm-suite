import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, DollarSign, Users, TrendingUp } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useMyDepartmentId, useMyEmployeeId } from "@/hooks/useScopedQuery";

const formatVND = (v: number | null) => v ? v.toLocaleString("vi-VN") + "đ" : "—";
const formatShort = (v: number | null) => {
  if (!v) return "0";
  if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(1) + "tr";
  return v.toLocaleString("vi-VN");
};

const statusConfig: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Nháp", className: "bg-muted text-muted-foreground" },
  APPROVED: { label: "Đã duyệt", className: "bg-accent/15 text-accent" },
  PAID: { label: "Đã trả", className: "bg-success/15 text-success" },
};

const months = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `Tháng ${i + 1}` }));

export default function Payroll() {
  const now = new Date();
  const { getScope } = usePermissions();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));

  const scope = getScope("payroll");
  const isFullView = scope === "all";
  const isDeptView = scope === "department";
  const isPersonalView = scope === "personal";

  const { data: myDeptId } = useMyDepartmentId(isDeptView);
  const { data: myEmployeeId } = useMyEmployeeId(isPersonalView);

  const { data: payrolls = [], isLoading } = useQuery({
    queryKey: ["payroll_list", month, year, scope, myDeptId, myEmployeeId],
    queryFn: async () => {
      let q = supabase
        .from("payroll")
        .select("*, employees(full_name, employee_code, department_id, departments(name))")
        .eq("month", parseInt(month))
        .eq("year", parseInt(year))
        .order("created_at", { ascending: false });

      if (isPersonalView && myEmployeeId) {
        q = q.eq("employee_id", myEmployeeId);
      } else if (isDeptView && myDeptId) {
        q = q.eq("employees.department_id", myDeptId);
      }

      const { data, error } = await q;
      if (error) throw error;
      // For department scope, filter client-side since nested filter may not work
      if (isDeptView && myDeptId) {
        return (data || []).filter((p: any) => p.employees?.department_id === myDeptId);
      }
      return data;
    },
    enabled: isFullView || (isPersonalView && !!myEmployeeId) || (isDeptView && !!myDeptId),
  });

  const totalNet = payrolls.reduce((s, p) => s + (p.net_salary ?? 0), 0);
  const totalGross = payrolls.reduce((s, p) => s + (p.gross_salary ?? 0), 0);
  const totalEmployerCost = payrolls.reduce((s, p) => s + (p.total_employer_cost ?? 0), 0);

  // Personal payslip view
  if (isPersonalView) {
    const myPayslip = payrolls[0];

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Phiếu lương của tôi</h1>
            <p className="text-sm text-muted-foreground">Tháng {month}/{year}</p>
          </div>
          <div className="flex gap-2">
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : myPayslip ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Chi tiết phiếu lương</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Lương cơ bản</p>
                  <p className="font-semibold">{formatVND(myPayslip.base_salary)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phụ cấp</p>
                  <p className="font-semibold">{formatVND(myPayslip.total_allowance)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tăng ca</p>
                  <p className="font-semibold">{formatVND(myPayslip.ot_pay)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">BHXH (NV)</p>
                  <p className="font-semibold text-destructive">{formatVND((myPayslip.bhxh_employee ?? 0) + (myPayslip.bhyt_employee ?? 0) + (myPayslip.bhtn_employee ?? 0))}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Thuế TNCN</p>
                  <p className="font-semibold text-destructive">{formatVND(myPayslip.pit_amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Khấu trừ</p>
                  <p className="font-semibold text-destructive">{formatVND(myPayslip.deductions)}</p>
                </div>
                <div className="col-span-2 md:col-span-3 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">Thực lĩnh</p>
                  <p className="text-2xl font-bold text-primary">{formatVND(myPayslip.net_salary)}</p>
                </div>
              </div>
              <div className="mt-4">
                <Badge variant="outline" className={statusConfig[myPayslip.status ?? "DRAFT"]?.className}>
                  {statusConfig[myPayslip.status ?? "DRAFT"]?.label ?? myPayslip.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Chưa có phiếu lương cho tháng {month}/{year}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Full/department view for HR/Admin/Ketoan/GDKD
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bảng lương</h1>
          <p className="text-sm text-muted-foreground">Tháng {month}/{year}</p>
        </div>
        <div className="flex gap-2">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Số nhân viên</p>
                <p className="text-2xl font-bold">{payrolls.length}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tổng lương gross</p>
                <p className="text-2xl font-bold">{formatShort(totalGross)}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tổng thực lĩnh</p>
                <p className="text-2xl font-bold">{formatShort(totalNet)}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Chi phí NV (cty)</p>
                <p className="text-2xl font-bold">{formatShort(totalEmployerCost)}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã NV</TableHead>
                    <TableHead>Họ tên</TableHead>
                    <TableHead>Phòng ban</TableHead>
                    <TableHead className="text-right">Lương CB</TableHead>
                    <TableHead className="text-right">Phụ cấp</TableHead>
                    <TableHead className="text-right">Tăng ca</TableHead>
                    <TableHead className="text-right">BHXH NV</TableHead>
                    <TableHead className="text-right">Thuế TNCN</TableHead>
                    <TableHead className="text-right">Khấu trừ</TableHead>
                    <TableHead className="text-right">Thực lĩnh</TableHead>
                    <TableHead>Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrolls.map((p) => {
                    const emp = p.employees as any;
                    const st = statusConfig[p.status ?? "DRAFT"] ?? statusConfig.DRAFT;
                    const totalInsurance = (p.bhxh_employee ?? 0) + (p.bhyt_employee ?? 0) + (p.bhtn_employee ?? 0);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">{emp?.employee_code ?? "—"}</TableCell>
                        <TableCell className="font-medium">{emp?.full_name ?? "—"}</TableCell>
                        <TableCell className="text-sm">{emp?.departments?.name ?? "—"}</TableCell>
                        <TableCell className="text-right">{formatVND(p.base_salary)}</TableCell>
                        <TableCell className="text-right">{formatVND(p.total_allowance)}</TableCell>
                        <TableCell className="text-right">{formatVND(p.ot_pay)}</TableCell>
                        <TableCell className="text-right text-destructive">{formatVND(totalInsurance)}</TableCell>
                        <TableCell className="text-right text-destructive">{formatVND(p.pit_amount)}</TableCell>
                        <TableCell className="text-right text-destructive">{formatVND(p.deductions)}</TableCell>
                        <TableCell className="text-right font-bold">{formatVND(p.net_salary)}</TableCell>
                        <TableCell><Badge variant="outline" className={st.className}>{st.label}</Badge></TableCell>
                      </TableRow>
                    );
                  })}
                  {payrolls.length === 0 && (
                    <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">Chưa có dữ liệu bảng lương</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
