import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Edit, Loader2, Phone, Mail, MapPin, Calendar, Building, User, Trash2 } from "lucide-react";
import { EmployeeFormDialog } from "@/components/employees/EmployeeFormDialog";
import { EmployeeSalaryTab } from "@/components/employees/EmployeeSalaryTab";
import { EmployeeLeaveTab } from "@/components/employees/EmployeeLeaveTab";
import { EmployeeOvertimeTab } from "@/components/employees/EmployeeOvertimeTab";
import { EmployeeInsuranceTab } from "@/components/employees/EmployeeInsuranceTab";
import { EmployeeRoleTab } from "@/components/employees/EmployeeRoleTab";
import { EmployeeKpiTab } from "@/components/employees/EmployeeKpiTab";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";

const statusLabels: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "Đang làm", className: "bg-success/15 text-success border-success/30" },
  PROBATION: { label: "Thử việc", className: "bg-warning/15 text-warning border-warning/30" },
  INTERN: { label: "Thực tập", className: "bg-accent/15 text-accent border-accent/30" },
  RESIGNED: { label: "Đã nghỉ", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

const InfoItem = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | null }) => (
  <div className="flex items-start gap-3">
    <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || "—"}</p>
    </div>
  </div>
);

export default function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { hasPermission } = usePermissions();

  const { data: employee, isLoading, refetch } = useQuery({
    queryKey: ["employee", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*, departments(name)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const handleSoftDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("employees")
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
      toast.success("Đã xóa nhân viên");
      navigate("/nhan-su");
    } catch (err: any) {
      toast.error(err.message || "Lỗi xóa nhân viên");
    } finally {
      setDeleting(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!employee) {
    return <div className="text-center py-20 text-muted-foreground">Không tìm thấy nhân viên</div>;
  }

  const st = statusLabels[employee.status ?? "ACTIVE"] ?? statusLabels.ACTIVE;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/nhan-su")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{employee.full_name}</h1>
            <Badge variant="outline" className={st.className}>{st.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{employee.employee_code} • {employee.position ?? "Chưa có chức vụ"}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />Sửa
          </Button>
          {hasPermission("employees.delete") && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4 mr-2" />Xóa
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Xác nhận xóa nhân viên</AlertDialogTitle>
                  <AlertDialogDescription>
                    Bạn có chắc muốn xóa nhân viên <strong>{employee.full_name}</strong>?
                    Dữ liệu sẽ bị ẩn khỏi hệ thống nhưng vẫn lưu trong database để đối soát.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Hủy</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleSoftDelete}
                    disabled={deleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                    Xóa nhân viên
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Thông tin</TabsTrigger>
          <TabsTrigger value="salary">Lương</TabsTrigger>
          <TabsTrigger value="leave">Nghỉ phép</TabsTrigger>
          <TabsTrigger value="overtime">Tăng ca</TabsTrigger>
          <TabsTrigger value="insurance">Bảo hiểm</TabsTrigger>
          <TabsTrigger value="role">Phân quyền</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Thông tin cá nhân</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <InfoItem icon={User} label="Giới tính" value={employee.gender === "MALE" ? "Nam" : employee.gender === "FEMALE" ? "Nữ" : employee.gender} />
                <InfoItem icon={Calendar} label="Ngày sinh" value={employee.date_of_birth} />
                <InfoItem icon={Phone} label="Điện thoại" value={employee.phone} />
                <InfoItem icon={Mail} label="Email" value={employee.email} />
                <InfoItem icon={MapPin} label="Địa chỉ" value={employee.address} />
                <InfoItem icon={User} label="CCCD" value={employee.id_card} />
                <InfoItem icon={Phone} label="Liên hệ khẩn cấp" value={employee.emergency_contact} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Thông tin công việc</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <InfoItem icon={Building} label="Phòng ban" value={(employee.departments as any)?.name} />
                <InfoItem icon={User} label="Chức vụ" value={employee.position} />
                <InfoItem icon={User} label="Cấp bậc" value={employee.level} />
                <InfoItem icon={Calendar} label="Ngày vào làm" value={employee.hire_date} />
                <InfoItem icon={Calendar} label="Hết hạn thử việc" value={employee.probation_end_date} />
                <InfoItem icon={Calendar} label="Hết hạn hợp đồng" value={employee.contract_expiry} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Thông tin ngân hàng</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <InfoItem icon={Building} label="Ngân hàng" value={employee.bank_name} />
                <InfoItem icon={User} label="Số tài khoản" value={employee.bank_account} />
                <InfoItem icon={Building} label="Chi nhánh" value={employee.bank_branch} />
                <InfoItem icon={User} label="Mã số thuế" value={employee.tax_code} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="salary" className="mt-4">
          <EmployeeSalaryTab employeeId={id!} />
        </TabsContent>

        <TabsContent value="leave" className="mt-4">
          <EmployeeLeaveTab employeeId={id!} />
        </TabsContent>

        <TabsContent value="overtime" className="mt-4">
          <EmployeeOvertimeTab employeeId={id!} />
        </TabsContent>

        <TabsContent value="insurance" className="mt-4">
          <EmployeeInsuranceTab employeeId={id!} />
        </TabsContent>

        <TabsContent value="role" className="mt-4">
          <EmployeeRoleTab
            employeeId={id!}
            profileId={employee.profile_id}
            employeeName={employee.full_name}
            employeeEmail={employee.email}
            departmentId={employee.department_id}
            onProfileLinked={() => refetch()}
          />
        </TabsContent>
      </Tabs>

      <EmployeeFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        employeeId={id}
        onSuccess={() => { refetch(); setEditOpen(false); }}
      />
    </div>
  );
}
