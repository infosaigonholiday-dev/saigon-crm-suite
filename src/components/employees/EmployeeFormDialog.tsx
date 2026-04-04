import { useState, useEffect } from "react";
import { positionOptions, suggestRole } from "@/lib/positionRoleMapping";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  employeeId?: string;
}

const Field = ({ label, children, required, error }: { label: string; children: React.ReactNode; required?: boolean; error?: string }) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-medium">{label}{required && <span className="text-destructive ml-0.5">*</span>}</Label>
    {children}
    {error && <p className="text-xs text-destructive">{error}</p>}
  </div>
);

const genderOptions = [
  { value: "MALE", label: "Nam" },
  { value: "FEMALE", label: "Nữ" },
  { value: "OTHER", label: "Khác" },
];

const employmentTypes = [
  { value: "FULLTIME", label: "Toàn thời gian" },
  { value: "PARTTIME", label: "Bán thời gian" },
  { value: "PROBATION", label: "Thử việc" },
  { value: "INTERN", label: "Thực tập sinh" },
  { value: "CONTRACT", label: "Hợp đồng" },
  { value: "SEASONAL", label: "Thời vụ" },
];

const statusOptions = [
  { value: "ACTIVE", label: "Đang làm" },
  { value: "PROBATION", label: "Thử việc" },
  { value: "INTERN", label: "Thực tập" },
  { value: "RESIGNED", label: "Đã nghỉ" },
  { value: "ON_LEAVE", label: "Nghỉ phép" },
];

const roleOptions = [
  { value: "SALE_DOMESTIC", label: "Sale Nội địa" },
  { value: "SALE_INBOUND", label: "Sale Inbound" },
  { value: "SALE_OUTBOUND", label: "Sale Outbound" },
  { value: "HCNS", label: "Nhân sự (HCNS)" },
  { value: "KETOAN", label: "Kế toán" },
  { value: "MANAGER", label: "Trưởng phòng" },
  { value: "GDKD", label: "GĐ Kinh doanh" },
  { value: "DIEUHAN", label: "Điều hành" },
  { value: "TOUR", label: "Hướng dẫn viên" },
  { value: "MKT", label: "Marketing" },
  { value: "INTERN_DIEUHAN", label: "TTS Điều hành" },
  { value: "INTERN_SALE_DOMESTIC", label: "TTS KD Nội địa" },
  { value: "INTERN_SALE_OUTBOUND", label: "TTS KD Outbound" },
  { value: "INTERN_SALE_MICE", label: "TTS KD MICE" },
  { value: "INTERN_SALE_INBOUND", label: "TTS KD Inbound" },
  { value: "INTERN_MKT", label: "TTS Marketing" },
  { value: "INTERN_HCNS", label: "TTS HCNS" },
  { value: "INTERN_KETOAN", label: "TTS Kế toán" },
  { value: "ADMIN", label: "Admin" },
];

interface ValidationErrors {
  full_name?: string;
  phone?: string;
  id_card?: string;
  date_of_birth?: string;
  hire_date?: string;
}

function validate(form: Record<string, string>): ValidationErrors {
  const errors: ValidationErrors = {};
  if (!form.full_name || form.full_name.trim().length < 2) errors.full_name = "Họ tên phải có ít nhất 2 ký tự";
  if (form.phone && !/^0\d{9}$/.test(form.phone)) errors.phone = "Số điện thoại phải 10 số, bắt đầu bằng 0";
  if (form.id_card && !/^\d{12}$/.test(form.id_card)) errors.id_card = "CCCD phải đúng 12 chữ số";
  if (form.date_of_birth) {
    const dob = new Date(form.date_of_birth);
    const min18 = new Date();
    min18.setFullYear(min18.getFullYear() - 18);
    if (dob > min18) errors.date_of_birth = "Nhân viên phải đủ 18 tuổi";
  }
  if (form.hire_date) {
    const hireDate = new Date(form.hire_date);
    const max30 = new Date();
    max30.setDate(max30.getDate() + 30);
    if (hireDate > max30) errors.hire_date = "Ngày vào làm không được quá 30 ngày trong tương lai";
  }
  return errors;
}

const defaultForm = {
  full_name: "", gender: "", date_of_birth: "", id_card: "",
  phone: "", email: "", address: "",
  employee_code: "", department_id: "", position: "", level: "",
  employment_type: "FULLTIME", status: "PROBATION",
  hire_date: "", probation_end_date: "", contract_expiry: "",
  bank_account: "", bank_name: "", bank_branch: "", tax_code: "",
  emergency_contact: "",
  login_email: "", system_role: "SALE_DOMESTIC",
};

export function EmployeeFormDialog({ open, onOpenChange, onSuccess, employeeId }: Props) {
  const isEdit = !!employeeId;
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [form, setForm] = useState({ ...defaultForm });

  useEffect(() => {
    if (open && !isEdit) {
      setForm({ ...defaultForm });
      setErrors({});
    }
  }, [open, isEdit]);

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("id, name").order("name");
      return data ?? [];
    },
  });

  const levelOptions = [
    { value: "C-LEVEL", label: "C-Level" },
    { value: "DIRECTOR", label: "Giám đốc" },
    { value: "MANAGER", label: "Trưởng phòng" },
    { value: "STAFF", label: "Nhân viên" },
    { value: "INTERN", label: "Thực tập sinh" },
  ];

  useQuery({
    queryKey: ["employee-edit", employeeId],
    enabled: isEdit && open,
    queryFn: async () => {
      const { data, error } = await supabase.from("employees").select("*").eq("id", employeeId!).single();
      if (error) throw error;
      if (data) {
        setForm({
          full_name: data.full_name ?? "", gender: data.gender ?? "", date_of_birth: data.date_of_birth ?? "",
          id_card: data.id_card ?? "", phone: data.phone ?? "", email: data.email ?? "", address: data.address ?? "",
          employee_code: data.employee_code ?? "", department_id: data.department_id ?? "",
          position: data.position ?? "", level: data.level ?? "",
          employment_type: data.employment_type ?? "FULLTIME", status: data.status ?? "PROBATION",
          hire_date: data.hire_date ?? "", probation_end_date: data.probation_end_date ?? "",
          contract_expiry: data.contract_expiry ?? "",
          bank_account: data.bank_account ?? "", bank_name: data.bank_name ?? "",
          bank_branch: data.bank_branch ?? "", tax_code: data.tax_code ?? "",
          emergency_contact: data.emergency_contact ?? "",
          login_email: "", system_role: "SALE_DOMESTIC",
        });
      }
      return data;
    },
  });

  const update = (key: string, value: string) => {
    setForm(f => {
      const next = { ...f, [key]: value };
      // Auto-suggest system_role when position or department changes (new employee only)
      if (!isEdit && (key === "position" || key === "department_id")) {
        const dept = departments.find(d => d.id === (key === "department_id" ? value : f.department_id));
        const pos = key === "position" ? value : f.position;
        if (dept && pos) {
          const deptCode = (dept as any).code ?? "";
          const suggested = suggestRole(pos, deptCode);
          if (suggested) next.system_role = suggested;
        }
      }
      return next;
    });
    if (errors[key as keyof ValidationErrors]) setErrors(e => ({ ...e, [key]: undefined }));
  };

  async function handleSave() {
    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      toast.error("Vui lòng kiểm tra lại thông tin");
      return;
    }

    // Validate duplicate email
    const emailToCheck = form.email?.trim() || form.login_email?.trim();
    if (emailToCheck) {
      const query = supabase.from("employees").select("id, full_name").eq("email", emailToCheck).is("deleted_at", null);
      if (isEdit) query.neq("id", employeeId!);
      const { data: dupEmps } = await query;
      if (dupEmps && dupEmps.length > 0) {
        toast.error(`Email "${emailToCheck}" đã được sử dụng bởi nhân viên "${dupEmps[0].full_name}"`);
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        full_name: form.full_name.trim(),
        gender: form.gender || null,
        date_of_birth: form.date_of_birth || null,
        id_card: form.id_card || null,
        phone: form.phone || null,
        email: form.email || (form.login_email.trim() ? form.login_email.trim() : null),
        address: form.address || null,
        employee_code: isEdit ? form.employee_code : (form.employee_code || null),
        department_id: form.department_id || null,
        position: form.position || null,
        level: form.level || null,
        employment_type: form.employment_type || null,
        status: form.status || "PROBATION",
        hire_date: form.hire_date || null,
        probation_end_date: form.probation_end_date || null,
        contract_expiry: form.contract_expiry || null,
        bank_account: form.bank_account || null,
        bank_name: form.bank_name || null,
        bank_branch: form.bank_branch || null,
        tax_code: form.tax_code || null,
        emergency_contact: form.emergency_contact || null,
      };

      if (isEdit) {
        const { error } = await supabase.from("employees").update(payload).eq("id", employeeId!);
        if (error) throw error;

        // Sync profiles.department_id if employee has a linked profile
        if (form.department_id) {
          const { data: emp } = await supabase.from("employees").select("profile_id").eq("id", employeeId!).single();
          if (emp?.profile_id) {
            await supabase.from("profiles").update({ department_id: form.department_id }).eq("id", emp.profile_id);
          }
        }

        toast.success("Cập nhật thành công");
      } else {
        const { data: emp, error } = await supabase.from("employees").insert(payload).select("id").single();
        if (error) throw error;
        toast.success("Thêm nhân viên thành công");

        // Auto-create account if login_email provided
        if (form.login_email.trim()) {
          try {
            const { data: accData, error: accError } = await supabase.functions.invoke("manage-employee-accounts", {
              body: {
                action: "create",
                email: form.login_email.trim(),
                full_name: form.full_name.trim(),
                role: form.system_role,
                department_id: form.department_id || null,
                employee_id: emp.id,
              },
            });
            if (accError) throw accError;
            if (accData?.error) throw new Error(accData.error);
            toast.success("Đã tạo tài khoản. Email đặt mật khẩu đã được gửi cho nhân viên.");
          } catch (accErr: any) {
            toast.error(`Tạo tài khoản lỗi: ${accErr.message}`);
          }
        }
      }
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Lỗi lưu dữ liệu");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Sửa nhân viên" : "Thêm nhân viên mới"}</DialogTitle>
          <DialogDescription>Nhập thông tin nhân viên</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="personal">Cá nhân</TabsTrigger>
            <TabsTrigger value="work">Công việc</TabsTrigger>
            <TabsTrigger value="bank">Ngân hàng & Thuế</TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Họ tên" required error={errors.full_name}>
                <Input value={form.full_name} onChange={e => update("full_name", e.target.value)} />
              </Field>
              {isEdit && (
                <Field label="Mã nhân viên">
                  <Input value={form.employee_code} readOnly className="bg-muted" />
                </Field>
              )}
              <Field label="Phòng ban">
                <Select value={form.department_id} onValueChange={v => update("department_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Chọn phòng ban" /></SelectTrigger>
                  <SelectContent>
                    {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Giới tính">
                <Select value={form.gender} onValueChange={v => update("gender", v)}>
                  <SelectTrigger><SelectValue placeholder="Chọn" /></SelectTrigger>
                  <SelectContent>
                    {genderOptions.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Ngày sinh" error={errors.date_of_birth}>
                <Input type="date" value={form.date_of_birth} onChange={e => update("date_of_birth", e.target.value)} />
              </Field>
              <Field label="CCCD/CMND" error={errors.id_card}>
                <Input value={form.id_card} onChange={e => update("id_card", e.target.value)} />
              </Field>
              <Field label="Điện thoại" error={errors.phone}>
                <Input value={form.phone} onChange={e => update("phone", e.target.value)} />
              </Field>
              <Field label="Email">
                <Input type="email" value={form.email} onChange={e => update("email", e.target.value)} />
              </Field>
            </div>
            <Field label="Địa chỉ">
              <Textarea value={form.address} onChange={e => update("address", e.target.value)} rows={2} />
            </Field>
            <Field label="Liên hệ khẩn cấp">
              <Input value={form.emergency_contact} onChange={e => update("emergency_contact", e.target.value)} placeholder="Tên - SĐT - Quan hệ" />
            </Field>
          </TabsContent>

          <TabsContent value="work" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Chức vụ">
                <Select value={form.position} onValueChange={v => update("position", v)}>
                  <SelectTrigger><SelectValue placeholder="Chọn chức vụ" /></SelectTrigger>
                  <SelectContent>
                    {positionOptions.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Cấp bậc">
                <Select value={form.level} onValueChange={v => update("level", v)}>
                  <SelectTrigger><SelectValue placeholder="Chọn cấp bậc" /></SelectTrigger>
                  <SelectContent>
                    {levelOptions.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Loại nhân sự">
                <Select value={form.employment_type} onValueChange={v => update("employment_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {employmentTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Trạng thái">
                <Select value={form.status} onValueChange={v => update("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Ngày vào làm" error={errors.hire_date}>
                <Input type="date" value={form.hire_date} onChange={e => update("hire_date", e.target.value)} />
              </Field>
              <Field label="Ngày kết thúc thử việc">
                <Input type="date" value={form.probation_end_date} onChange={e => update("probation_end_date", e.target.value)} />
              </Field>
              <Field label="Ngày hết hạn hợp đồng">
                <Input type="date" value={form.contract_expiry} onChange={e => update("contract_expiry", e.target.value)} />
              </Field>
            </div>

            {!isEdit && (
              <div className="border-t pt-4 mt-4 space-y-4">
                <p className="text-sm font-medium text-foreground">Tạo tài khoản đăng nhập (tùy chọn)</p>
                <p className="text-xs text-muted-foreground">Nếu nhập email đăng nhập, hệ thống sẽ tự động tạo tài khoản và gửi email đặt mật khẩu cho nhân viên.</p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Email đăng nhập">
                    <Input type="email" value={form.login_email} onChange={e => update("login_email", e.target.value)} placeholder="email@company.com" />
                  </Field>
                  <Field label="Role hệ thống">
                    <Select value={form.system_role} onValueChange={v => update("system_role", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {roleOptions.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="bank" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Số tài khoản">
                <Input value={form.bank_account} onChange={e => update("bank_account", e.target.value)} />
              </Field>
              <Field label="Ngân hàng">
                <Input value={form.bank_name} onChange={e => update("bank_name", e.target.value)} />
              </Field>
              <Field label="Chi nhánh">
                <Input value={form.bank_branch} onChange={e => update("bank_branch", e.target.value)} />
              </Field>
              <Field label="Mã số thuế">
                <Input value={form.tax_code} onChange={e => update("tax_code", e.target.value)} />
              </Field>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            {isEdit ? "Cập nhật" : "Thêm nhân viên"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
