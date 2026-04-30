import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, DollarSign, Users, TrendingUp, Calculator, Printer, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import { useMyDepartmentId, useMyEmployeeId } from "@/hooks/useScopedQuery";
import { useAuth } from "@/contexts/AuthContext";
import InternalNotes from "@/components/shared/InternalNotes";
import { notifyUsersByRole, notifyUser } from "@/lib/notifyByRole";

const formatVND = (v: number | null | undefined) =>
  v != null && v !== 0 ? Number(v).toLocaleString("vi-VN") + "đ" : "—";
const formatShort = (v: number | null | undefined) => {
  if (!v) return "0";
  if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(1) + "tr";
  return Number(v).toLocaleString("vi-VN");
};

type PayrollStatus = "draft" | "hr_reviewed" | "kt_confirmed" | "ceo_approved" | "paid";

const statusConfig: Record<PayrollStatus, { label: string; className: string }> = {
  draft: { label: "Nháp", className: "bg-muted text-muted-foreground" },
  hr_reviewed: { label: "HR đã duyệt", className: "bg-blue-100 text-blue-700 border-blue-200" },
  kt_confirmed: { label: "KT xác nhận", className: "bg-purple-100 text-purple-700 border-purple-200" },
  ceo_approved: { label: "CEO duyệt", className: "bg-green-100 text-green-700 border-green-200" },
  paid: { label: "Đã trả lương", className: "bg-blue-600 text-white border-blue-600" },
};

const months = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `Tháng ${i + 1}` }));

const PAYROLL_COLS = "id, employee_id, month, year, base_fixed, base_kpi, target_kpi, actual_performance, kpi_achievement_pct, kpi_earned, bonus_amount, overtime_amount, allowance_amount, unpaid_leave_days, unpaid_leave_deduction, bhxh_employee, bhyt_employee, bhtn_employee, bhxh_employer, bhyt_employer, bhtn_employer, pit_amount, gross_salary, net_salary, total_employer_cost, status, hr_reviewed_at, kt_confirmed_at, ceo_approved_at, paid_at, notes, employees(full_name, employee_code, department_id, departments(name))";

export default function Payroll() {
  const queryClient = useQueryClient();
  const now = new Date();
  const { getScope } = usePermissions();
  const { user, userRole } = useAuth();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [detailRow, setDetailRow] = useState<any>(null);

  const scope = getScope("payroll");
  const isFullView = scope === "all";
  const isPersonalView = scope === "personal";
  const isDeptView = scope === "department";

  const { data: myDeptId } = useMyDepartmentId(isDeptView);
  const { data: myEmployeeId } = useMyEmployeeId(isPersonalView);

  const isHR = userRole === "HR_MANAGER" || userRole === "HCNS";
  const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";
  const isKT = userRole === "KETOAN";
  const canGenerate = isHR || isAdmin;

  const { data: payrolls = [], isLoading } = useQuery({
    queryKey: ["payroll_list_v2", month, year, scope, myDeptId, myEmployeeId],
    queryFn: async () => {
      let q = supabase
        .from("payroll")
        .select(PAYROLL_COLS)
        .eq("month", parseInt(month))
        .eq("year", parseInt(year))
        .order("created_at", { ascending: false });

      if (isPersonalView && myEmployeeId) {
        q = q.eq("employee_id", myEmployeeId);
      }

      const { data, error } = await q;
      if (error) throw error;
      let rows = data || [];
      if (isDeptView && myDeptId) {
        rows = rows.filter((p: any) => p.employees?.department_id === myDeptId);
      }
      if (isPersonalView) {
        rows = rows.filter((p: any) => ["ceo_approved", "paid"].includes(p.status));
      }
      return rows;
    },
    enabled: isFullView || (isPersonalView && !!myEmployeeId) || (isDeptView && !!myDeptId),
    staleTime: 30_000,
  });

  // Generate payroll for the month
  const generateMutation = useMutation({
    mutationFn: async () => {
      // Fetch active employees + their salaries
      const { data: emps, error: empErr } = await supabase
        .from("employees")
        .select("id, full_name, department_id, status")
        .in("status", ["ACTIVE", "PROBATION", "INTERN"]);
      if (empErr) throw empErr;
      if (!emps || emps.length === 0) throw new Error("Không có nhân viên đang làm việc");

      const empIds = emps.map((e) => e.id);

      // Fetch latest active salary per employee
      const { data: salaries } = await supabase
        .from("employee_salaries")
        .select("employee_id, base_salary, phone_allowance, transport_allowance, meal_allowance, housing_allowance, other_allowance")
        .in("employee_id", empIds)
        .order("effective_from", { ascending: false });

      const salaryMap = new Map<string, any>();
      (salaries || []).forEach((s: any) => {
        if (!salaryMap.has(s.employee_id)) salaryMap.set(s.employee_id, s);
      });

      // Existing payrolls for the month
      const { data: existing } = await supabase
        .from("payroll")
        .select("employee_id")
        .eq("month", parseInt(month))
        .eq("year", parseInt(year));
      const existingSet = new Set((existing || []).map((p: any) => p.employee_id));

      const toInsert = emps
        .filter((e) => !existingSet.has(e.id))
        .map((e) => {
          const sal = salaryMap.get(e.id);
          const base = Number(sal?.base_salary ?? 0);
          const allowance =
            Number(sal?.phone_allowance ?? 0) +
            Number(sal?.transport_allowance ?? 0) +
            Number(sal?.meal_allowance ?? 0) +
            Number(sal?.housing_allowance ?? 0) +
            Number(sal?.other_allowance ?? 0);
          return {
            employee_id: e.id,
            month: parseInt(month),
            year: parseInt(year),
            base_salary: base,
            base_fixed: Math.round(base * 0.8),
            base_kpi: Math.round(base * 0.2),
            standard_working_days: 26,
            actual_working_days: 26,
            allowance_amount: allowance,
            total_allowance: allowance,
            status: "draft",
          };
        });

      if (toInsert.length === 0) {
        return { inserted: 0, skipped: emps.length };
      }

      const { error: insErr } = await supabase.from("payroll").insert(toInsert as any);
      if (insErr) throw insErr;
      return { inserted: toInsert.length, skipped: existingSet.size };
    },
    onSuccess: async (r) => {
      toast.success(`Đã tạo ${r.inserted} bản ghi`, {
        description: r.skipped ? `Bỏ qua ${r.skipped} NV đã có dữ liệu` : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["payroll_list_v2"] });
      // Notify HR_MANAGER about drafts
      if (r.inserted > 0) {
        try {
          await notifyUsersByRole(["HR_MANAGER"], {
            type: "PAYROLL_DRAFT",
            title: `Bảng lương tháng ${month}/${year} cần review`,
            message: `${r.inserted} phiếu lương đã tạo, chờ HR duyệt`,
            entity_type: "payroll",
            priority: "high",
          }, user?.id);
        } catch (e) {
          console.error("Notify HR_MANAGER failed:", e);
        }
      }
    },
    onError: (e: any) => toast.error("Lỗi tính lương", { description: e.message }),
  });

  // Approval mutations
  const approveMutation = useMutation({
    mutationFn: async ({ id, nextStatus, row }: { id: string; nextStatus: PayrollStatus; row: any }) => {
      const patch: any = { status: nextStatus };
      if (nextStatus === "hr_reviewed") {
        patch.hr_reviewed_by = user?.id;
        patch.hr_reviewed_at = new Date().toISOString();
      } else if (nextStatus === "kt_confirmed") {
        patch.kt_confirmed_by = user?.id;
        patch.kt_confirmed_at = new Date().toISOString();
      } else if (nextStatus === "ceo_approved") {
        patch.ceo_approved_by = user?.id;
        patch.ceo_approved_at = new Date().toISOString();
      } else if (nextStatus === "paid") {
        patch.paid_at = new Date().toISOString();
      }
      const { error } = await supabase.from("payroll").update(patch).eq("id", id);
      if (error) throw error;
      return { id, nextStatus, row };
    },
    onSuccess: async ({ id, nextStatus, row }) => {
      toast.success("Đã cập nhật trạng thái");
      queryClient.invalidateQueries({ queryKey: ["payroll_list_v2"] });
      const empName = row?.employees?.full_name ?? "Nhân viên";
      try {
        if (nextStatus === "hr_reviewed") {
          await notifyUsersByRole(["KETOAN"], {
            type: "PAYROLL_REVIEW",
            title: `Bảng lương T${row.month} chờ KT xác nhận`,
            message: `${empName} — HR đã duyệt`,
            entity_type: "payroll",
            entity_id: id,
            priority: "high",
          }, user?.id);
        } else if (nextStatus === "kt_confirmed") {
          await notifyUsersByRole(["ADMIN", "SUPER_ADMIN"], {
            type: "PAYROLL_CONFIRM",
            title: `Bảng lương T${row.month} chờ CEO duyệt`,
            message: `${empName} — KT đã xác nhận`,
            entity_type: "payroll",
            entity_id: id,
            priority: "high",
          }, user?.id);
        } else if (nextStatus === "ceo_approved") {
          // Notify owning employee (if linked to a profile)
          const { data: emp } = await supabase
            .from("employees")
            .select("profile_id")
            .eq("id", row.employee_id)
            .maybeSingle();
          if (emp?.profile_id) {
            await notifyUser(emp.profile_id, {
              type: "PAYROLL_READY",
              title: `Phiếu lương T${row.month}/${row.year} đã sẵn sàng`,
              message: "Phiếu lương của bạn đã được CEO duyệt. Xem chi tiết trong mục Bảng lương.",
              entity_type: "payroll",
              entity_id: id,
              priority: "medium",
            });
          }
        }
      } catch (e) {
        console.error("Notify payroll status change failed:", e);
      }
    },
    onError: (e: any) => toast.error("Lỗi", { description: e.message }),
  });

  const renderActionButton = (p: any) => {
    const st = p.status as PayrollStatus;
    if ((isHR || isAdmin) && st === "draft") {
      return <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); approveMutation.mutate({ id: p.id, nextStatus: "hr_reviewed", row: p }); }}>Duyệt HR</Button>;
    }
    if (isKT && st === "hr_reviewed") {
      return <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); approveMutation.mutate({ id: p.id, nextStatus: "kt_confirmed", row: p }); }}>Xác nhận KT</Button>;
    }
    if (isAdmin && st === "kt_confirmed") {
      return <Button size="sm" variant="default" onClick={(e) => { e.stopPropagation(); approveMutation.mutate({ id: p.id, nextStatus: "ceo_approved", row: p }); }}>CEO Duyệt</Button>;
    }
    if ((isHR || isAdmin) && st === "ceo_approved") {
      return <Button size="sm" variant="default" onClick={(e) => { e.stopPropagation(); approveMutation.mutate({ id: p.id, nextStatus: "paid", row: p }); }}>Đã trả lương</Button>;
    }
    return null;
  };

  const totalGross = payrolls.reduce((s: number, p: any) => s + Number(p.gross_salary || (Number(p.base_fixed||0) + Number(p.kpi_earned||0) + Number(p.bonus_amount||0) + Number(p.overtime_amount||0) + Number(p.allowance_amount||0))), 0);
  const totalNet = payrolls.reduce((s: number, p: any) => s + Number(p.net_salary || 0), 0);
  const totalEmployerCost = payrolls.reduce((s: number, p: any) => s + Number(p.total_employer_cost || (Number(p.gross_salary||0) + Number(p.bhxh_employer||0) + Number(p.bhyt_employer||0) + Number(p.bhtn_employer||0))), 0);

  // Personal view
  if (isPersonalView) {
    const slip = payrolls[0];
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
          <div>
            <h1 className="text-2xl font-bold">Phiếu lương của tôi</h1>
            <p className="text-sm text-muted-foreground">Tháng {month}/{year}</p>
          </div>
          <div className="flex gap-2">
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>{months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {slip && (
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-1" />In phiếu
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : slip ? (
          <Card className="print:shadow-none print:border-none">
            <CardHeader>
              <CardTitle className="text-base">Phiếu lương tháng {slip.month}/{slip.year}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Field label="Lương cứng" value={formatVND(slip.base_fixed)} />
                <Field label="KPI thực nhận" value={formatVND(slip.kpi_earned)} />
                <Field label="Hoa hồng/Thưởng" value={formatVND(slip.bonus_amount)} />
                <Field label="Tăng ca" value={formatVND(slip.overtime_amount)} />
                <Field label="Phụ cấp" value={formatVND(slip.allowance_amount)} />
                <Field label="Trừ nghỉ KL" value={formatVND(slip.unpaid_leave_deduction)} negative />
                <Field label="BHXH" value={formatVND((Number(slip.bhxh_employee||0) + Number(slip.bhyt_employee||0) + Number(slip.bhtn_employee||0)))} negative />
                <Field label="Thuế TNCN" value={formatVND(slip.pit_amount)} negative />
                <div className="col-span-2 md:col-span-3 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">Thực nhận</p>
                  <p className="text-2xl font-bold text-primary">{formatVND(slip.net_salary)}</p>
                </div>
              </div>
              <div className="mt-4">
                <Badge variant="outline" className={statusConfig[slip.status as PayrollStatus]?.className}>
                  {statusConfig[slip.status as PayrollStatus]?.label ?? slip.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Chưa có phiếu lương được duyệt cho tháng {month}/{year}</CardContent></Card>
        )}
      </div>
    );
  }

  // Full / department view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Bảng lương</h1>
          <p className="text-sm text-muted-foreground">Tháng {month}/{year} — {payrolls.length} bản ghi</p>
        </div>
        <div className="flex gap-2">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>{months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canGenerate && (
            <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
              {generateMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Calculator className="h-4 w-4 mr-1" />}
              Tính lương tháng
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Số NV" value={String(payrolls.length)} icon={Users} />
        <StatCard label="Tổng Gross" value={formatShort(totalGross)} icon={TrendingUp} />
        <StatCard label="Tổng Net" value={formatShort(totalNet)} icon={DollarSign} />
        <StatCard label="Chi phí Cty" value={formatShort(totalEmployerCost)} icon={DollarSign} />
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
                    <TableHead>Phòng</TableHead>
                    <TableHead className="text-right">Lương cứng</TableHead>
                    <TableHead className="text-right">KPI</TableHead>
                    <TableHead className="text-right">Hoa hồng</TableHead>
                    <TableHead className="text-right">OT</TableHead>
                    <TableHead className="text-right">Phụ cấp</TableHead>
                    <TableHead className="text-right">Nghỉ KL</TableHead>
                    <TableHead className="text-right">BHXH</TableHead>
                    <TableHead className="text-right">Thuế</TableHead>
                    <TableHead className="text-right font-bold">Thực nhận</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrolls.map((p: any) => {
                    const emp = p.employees;
                    const st = statusConfig[p.status as PayrollStatus] ?? statusConfig.draft;
                    const ins = (Number(p.bhxh_employee||0) + Number(p.bhyt_employee||0) + Number(p.bhtn_employee||0));
                    return (
                      <TableRow key={p.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setDetailRow(p)}>
                        <TableCell className="font-mono text-xs">{emp?.employee_code ?? "—"}</TableCell>
                        <TableCell className="font-medium">{emp?.full_name ?? "—"}</TableCell>
                        <TableCell className="text-sm">{emp?.departments?.name ?? "—"}</TableCell>
                        <TableCell className="text-right">{formatVND(p.base_fixed)}</TableCell>
                        <TableCell className="text-right">{formatVND(p.kpi_earned)}</TableCell>
                        <TableCell className="text-right">{formatVND(p.bonus_amount)}</TableCell>
                        <TableCell className="text-right">{formatVND(p.overtime_amount)}</TableCell>
                        <TableCell className="text-right">{formatVND(p.allowance_amount)}</TableCell>
                        <TableCell className="text-right text-destructive">{formatVND(p.unpaid_leave_deduction)}</TableCell>
                        <TableCell className="text-right text-destructive">{formatVND(ins)}</TableCell>
                        <TableCell className="text-right text-destructive">{formatVND(p.pit_amount)}</TableCell>
                        <TableCell className="text-right font-bold">{formatVND(p.net_salary)}</TableCell>
                        <TableCell><Badge variant="outline" className={st.className}>{st.label}</Badge></TableCell>
                        <TableCell>{renderActionButton(p)}</TableCell>
                      </TableRow>
                    );
                  })}
                  {payrolls.length === 0 && (
                    <TableRow><TableCell colSpan={14} className="text-center py-8 text-muted-foreground">Chưa có dữ liệu — Bấm "Tính lương tháng" để khởi tạo</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!detailRow} onOpenChange={(o) => !o && setDetailRow(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Chi tiết phiếu lương — {detailRow?.employees?.full_name} (T{detailRow?.month}/{detailRow?.year})
            </DialogTitle>
          </DialogHeader>
          {detailRow && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Field label="Lương cứng (80%)" value={formatVND(detailRow.base_fixed)} />
                <Field label="KPI base (20%)" value={formatVND(detailRow.base_kpi)} />
                <Field label="Target KPI" value={detailRow.target_kpi ? String(detailRow.target_kpi) : "—"} />
                <Field label="Thực hiện" value={detailRow.actual_performance ? String(detailRow.actual_performance) : "—"} />
                <Field label="% đạt KPI" value={detailRow.kpi_achievement_pct ? `${detailRow.kpi_achievement_pct}%` : "—"} />
                <Field label="KPI nhận được" value={formatVND(detailRow.kpi_earned)} />
                <Field label="Hoa hồng/Thưởng" value={formatVND(detailRow.bonus_amount)} />
                <Field label="Tăng ca" value={formatVND(detailRow.overtime_amount)} />
                <Field label="Phụ cấp" value={formatVND(detailRow.allowance_amount)} />
                <Field label="Ngày nghỉ KL" value={detailRow.unpaid_leave_days ? String(detailRow.unpaid_leave_days) : "—"} />
                <Field label="Trừ nghỉ KL" value={formatVND(detailRow.unpaid_leave_deduction)} negative />
                <Field label="BHXH (NV)" value={formatVND(detailRow.bhxh_employee)} negative />
                <Field label="BHYT (NV)" value={formatVND(detailRow.bhyt_employee)} negative />
                <Field label="BHTN (NV)" value={formatVND(detailRow.bhtn_employee)} negative />
                <Field label="Thuế TNCN" value={formatVND(detailRow.pit_amount)} negative />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-4 border-t">
                <Field label="Tổng Gross" value={formatVND(detailRow.gross_salary)} highlight />
                <Field label="Thực nhận" value={formatVND(detailRow.net_salary)} highlight />
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={statusConfig[detailRow.status as PayrollStatus]?.className}>
                  {statusConfig[detailRow.status as PayrollStatus]?.label}
                </Badge>
                {detailRow.hr_reviewed_at && <span className="text-xs text-muted-foreground"><CheckCircle2 className="inline h-3 w-3 mr-1" />HR: {new Date(detailRow.hr_reviewed_at).toLocaleDateString("vi-VN")}</span>}
                {detailRow.kt_confirmed_at && <span className="text-xs text-muted-foreground"><CheckCircle2 className="inline h-3 w-3 mr-1" />KT: {new Date(detailRow.kt_confirmed_at).toLocaleDateString("vi-VN")}</span>}
                {detailRow.ceo_approved_at && <span className="text-xs text-muted-foreground"><CheckCircle2 className="inline h-3 w-3 mr-1" />CEO: {new Date(detailRow.ceo_approved_at).toLocaleDateString("vi-VN")}</span>}
              </div>
              <div className="pt-4 border-t">
                <h4 className="text-sm font-semibold mb-2">Ghi chú nội bộ</h4>
                <InternalNotes entityType="payroll" entityId={detailRow.id} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value, negative, highlight }: { label: string; value: string; negative?: boolean; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-semibold ${negative ? "text-destructive" : ""} ${highlight ? "text-lg text-primary" : ""}`}>{value}</p>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
