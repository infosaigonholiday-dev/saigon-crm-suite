import { useState } from "react";
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

const Field = ({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-medium">{label}{required && <span className="text-destructive ml-0.5">*</span>}</Label>
    {children}
  </div>
);

const genderOptions = [
  { value: "MALE", label: "Nam" },
  { value: "FEMALE", label: "Nữ" },
  { value: "OTHER", label: "Khác" },
];

const employmentTypes = [
  { value: "FULL_TIME", label: "Chính thức" },
  { value: "PROBATION", label: "Thử việc" },
  { value: "INTERN", label: "Thực tập" },
  { value: "PART_TIME", label: "Bán thời gian" },
  { value: "CONTRACT", label: "Hợp đồng" },
];

const statusOptions = [
  { value: "ACTIVE", label: "Đang làm" },
  { value: "PROBATION", label: "Thử việc" },
  { value: "INTERN", label: "Thực tập" },
  { value: "RESIGNED", label: "Đã nghỉ" },
  { value: "ON_LEAVE", label: "Nghỉ phép" },
];

export function EmployeeFormDialog({ open, onOpenChange, onSuccess, employeeId }: Props) {
  const isEdit = !!employeeId;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "", gender: "", date_of_birth: "", id_card: "",
    phone: "", email: "", address: "",
    employee_code: "", department_id: "", position: "", level: "",
    employment_type: "FULL_TIME", status: "PROBATION",
    hire_date: "", probation_end_date: "", contract_expiry: "",
    bank_account: "", bank_name: "", bank_branch: "", tax_code: "",
    emergency_contact: "",
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("id, name").order("name");
      return data ?? [];
    },
  });

  // Load employee data if editing
  useQuery({
    queryKey: ["employee-edit", employeeId],
    enabled: isEdit && open,
    queryFn: async () => {
      const { data, error } = await supabase.from("employees").select("*").eq("id", employeeId!).single();
      if (error) throw error;
      if (data) {
        setForm({
          full_name: data.full_name ?? "",
          gender: data.gender ?? "",
          date_of_birth: data.date_of_birth ?? "",
          id_card: data.id_card ?? "",
          phone: data.phone ?? "",
          email: data.email ?? "",
          address: data.address ?? "",
          employee_code: data.employee_code ?? "",
          department_id: data.department_id ?? "",
          position: data.position ?? "",
          level: data.level ?? "",
          employment_type: data.employment_type ?? "FULL_TIME",
          status: data.status ?? "PROBATION",
          hire_date: data.hire_date ?? "",
          probation_end_date: data.probation_end_date ?? "",
          contract_expiry: data.contract_expiry ?? "",
          bank_account: data.bank_account ?? "",
          bank_name: data.bank_name ?? "",
          bank_branch: data.bank_branch ?? "",
          tax_code: data.tax_code ?? "",
          emergency_contact: data.emergency_contact ?? "",
        });
      }
      return data;
    },
  });

  const generateCode = () => {
    const prefix = "NV";
    const random = Math.floor(1000 + Math.random() * 9000);
    setForm(f => ({ ...f, employee_code: `${prefix}${random}` }));
  };

  const update = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  async function handleSave() {
    if (!form.full_name || !form.employee_code) {
      toast.error("Vui lòng nhập họ tên và mã nhân viên");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        full_name: form.full_name,
        gender: form.gender || null,
        date_of_birth: form.date_of_birth || null,
        id_card: form.id_card || null,
        phone: form.phone || null,
        email: form.email || null,
        address: form.address || null,
        employee_code: form.employee_code,
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
        toast.success("Cập nhật thành công");
      } else {
        const { error } = await supabase.from("employees").insert(payload);
        if (error) throw error;
        toast.success("Thêm nhân viên thành công");
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
              <Field label="Họ tên" required>
                <Input value={form.full_name} onChange={e => update("full_name", e.target.value)} />
              </Field>
              <Field label="Mã nhân viên" required>
                <div className="flex gap-2">
                  <Input value={form.employee_code} onChange={e => update("employee_code", e.target.value)} />
                  {!isEdit && <Button type="button" variant="outline" size="sm" onClick={generateCode}>Tự động</Button>}
                </div>
              </Field>
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
              <Field label="Ngày sinh">
                <Input type="date" value={form.date_of_birth} onChange={e => update("date_of_birth", e.target.value)} />
              </Field>
              <Field label="CCCD/CMND">
                <Input value={form.id_card} onChange={e => update("id_card", e.target.value)} />
              </Field>
              <Field label="Điện thoại">
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
                <Input value={form.position} onChange={e => update("position", e.target.value)} />
              </Field>
              <Field label="Cấp bậc">
                <Input value={form.level} onChange={e => update("level", e.target.value)} placeholder="Junior, Senior, Lead..." />
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
              <Field label="Ngày vào làm">
                <Input type="date" value={form.hire_date} onChange={e => update("hire_date", e.target.value)} />
              </Field>
              <Field label="Ngày kết thúc thử việc">
                <Input type="date" value={form.probation_end_date} onChange={e => update("probation_end_date", e.target.value)} />
              </Field>
              <Field label="Ngày hết hạn hợp đồng">
                <Input type="date" value={form.contract_expiry} onChange={e => update("contract_expiry", e.target.value)} />
              </Field>
            </div>
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
