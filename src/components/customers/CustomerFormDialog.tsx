import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, parse, isValid, differenceInDays, setYear } from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Loader2, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const initial = {
  full_name: "",
  type: "INDIVIDUAL",
  phone: "",
  email: "",
  date_of_birth: null as Date | null,
  date_of_birth_text: "",
  gender: "",
  id_number: "",
  address: "",
  source_id: "",
  assigned_sale_id: "",
  segment: "NEW",
  notes: "",
  // Company tab
  company_name: "",
  tax_code: "",
  company_address: "",
  contact_person: "",
  contact_position: "",
  contact_birthday: null as Date | null,
  contact_birthday_text: "",
  company_email: "",
  founded_date: null as Date | null,
  founded_date_text: "",
  company_size: "",
  contact_person_phone: "",
  tour_interest: "",
  contact_status: "",
  issue_faced: "",
  result: "",
};

const segmentLabels: Record<string, { label: string; className: string }> = {
  NEW: { label: "Mới", className: "bg-muted text-muted-foreground" },
  SILVER: { label: "Silver", className: "bg-secondary text-secondary-foreground" },
  GOLD: { label: "Gold", className: "bg-primary/20 text-primary" },
  DIAMOND: { label: "Diamond", className: "bg-accent text-accent-foreground" },
};

function isBirthdayUpcoming(dob: Date): boolean {
  const today = new Date();
  const thisYearBday = setYear(dob, today.getFullYear());
  const diff = differenceInDays(thisYearBday, today);
  if (diff >= 0 && diff <= 7) return true;
  const nextYearBday = setYear(dob, today.getFullYear() + 1);
  const diff2 = differenceInDays(nextYearBday, today);
  return diff2 >= 0 && diff2 <= 7;
}

function parseDateText(text: string): Date | null {
  if (!text || text.length < 10) return null;
  const parsed = parse(text, "dd/MM/yyyy", new Date());
  return isValid(parsed) ? parsed : null;
}

function DateInput({ value, textValue, onChange, onTextChange, label, badge, disabled, error }: {
  value: Date | null;
  textValue: string;
  onChange: (d: Date | null) => void;
  onTextChange: (t: string) => void;
  label: string;
  badge?: React.ReactNode;
  disabled?: (date: Date) => boolean;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-2">
        {label}
        {badge}
      </Label>
      <div className="flex gap-1">
        <Input
          placeholder="dd/MM/yyyy"
          value={textValue}
          onChange={(e) => {
            const t = e.target.value;
            onTextChange(t);
            const parsed = parseDateText(t);
            if (parsed) {
              if (!disabled || !disabled(parsed)) {
                onChange(parsed);
              }
            } else if (t === "") {
              onChange(null);
            }
          }}
          className="flex-1"
        />
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="shrink-0">
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={value ?? undefined}
              onSelect={(d) => {
                onChange(d ?? null);
                onTextChange(d ? format(d, "dd/MM/yyyy") : "");
              }}
              disabled={disabled}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export default function CustomerFormDialog({ open, onOpenChange }: Props) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { user } = useAuth();
  
  const qc = useQueryClient();

  const { data: salesProfiles = [] } = useQuery({
    queryKey: ["profiles-sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .in("role", ["SALE_DOMESTIC", "SALE_INBOUND", "SALE_OUTBOUND", "SALE_MICE", "MANAGER", "DIEUHAN"])
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: leadSources = [] } = useQuery({
    queryKey: ["lead-sources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_sources")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const set = (k: string, v: any) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.full_name.trim()) e.full_name = "Bắt buộc";
    if (!form.phone.trim()) e.phone = "Bắt buộc";
    if (form.phone && !/^\d{10}$/.test(form.phone))
      e.phone = "Số điện thoại phải đúng 10 chữ số";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Email không hợp lệ";
    if (form.date_of_birth && form.date_of_birth >= new Date())
      e.date_of_birth = "Ngày sinh phải nhỏ hơn hôm nay";
    if (form.date_of_birth_text && !form.date_of_birth)
      e.date_of_birth = "Ngày không hợp lệ (dd/MM/yyyy)";
    if (form.tax_code && !/^\d{10}$/.test(form.tax_code))
      e.tax_code = "MST phải là 10 chữ số";
    if (form.company_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.company_email))
      e.company_email = "Email không hợp lệ";
    if (form.contact_birthday_text && !form.contact_birthday)
      e.contact_birthday = "Ngày không hợp lệ (dd/MM/yyyy)";
    if (form.founded_date_text && !form.founded_date)
      e.founded_date = "Ngày không hợp lệ (dd/MM/yyyy)";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("customers").insert({
        full_name: form.full_name.trim(),
        type: form.type,
        phone: form.phone || null,
        email: form.email || null,
        date_of_birth: form.date_of_birth ? format(form.date_of_birth, "yyyy-MM-dd") : null,
        gender: form.gender || null,
        id_number: form.id_number || null,
        address: form.address || null,
        source_id: form.source_id || null,
        assigned_sale_id: form.assigned_sale_id || null,
        segment: form.segment,
        notes: form.notes || null,
        company_name: form.company_name || null,
        tax_code: form.tax_code || null,
        company_address: form.company_address || null,
        contact_person: form.contact_person || null,
        contact_position: form.contact_position || null,
        contact_birthday: form.contact_birthday ? format(form.contact_birthday, "yyyy-MM-dd") : null,
        company_email: form.company_email || null,
        founded_date: form.founded_date ? format(form.founded_date, "yyyy-MM-dd") : null,
        company_size: form.company_size ? parseInt(form.company_size) : null,
        contact_person_phone: form.contact_person_phone || null,
        tour_interest: form.tour_interest || null,
        contact_status: form.contact_status || null,
        issue_faced: form.issue_faced || null,
        result: form.result || null,
        created_by: user?.id || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Thành công", { description: "Đã thêm khách hàng mới" });
      setForm(initial);
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error("Lỗi", { description: err.message });
    },
  });

  const handleSubmit = () => {
    if (!validate()) return;
    mutation.mutate();
  };

  const seg = segmentLabels[form.segment] || segmentLabels.NEW;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Thêm khách hàng</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="company" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="company">Thông tin doanh nghiệp</TabsTrigger>
            <TabsTrigger value="personal">Thông tin cá nhân</TabsTrigger>
          </TabsList>

          {/* === TAB DOANH NGHIỆP (TRƯỚC) === */}
          <TabsContent value="company" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tên công ty</Label>
                <Input value={form.company_name} onChange={(e) => set("company_name", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Mã số thuế</Label>
                <Input value={form.tax_code} onChange={(e) => set("tax_code", e.target.value)} placeholder="10 chữ số" />
                {errors.tax_code && <p className="text-xs text-destructive">{errors.tax_code}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Địa chỉ công ty</Label>
              <Input value={form.company_address} onChange={(e) => set("company_address", e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Người liên hệ chính</Label>
                <Input value={form.contact_person} onChange={(e) => set("contact_person", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Chức vụ</Label>
                <Input value={form.contact_position} onChange={(e) => set("contact_position", e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <DateInput
                label="Ngày sinh người liên hệ"
                value={form.contact_birthday}
                textValue={form.contact_birthday_text}
                onChange={(d) => set("contact_birthday", d)}
                onTextChange={(t) => set("contact_birthday_text", t)}
                disabled={(date) => date > new Date()}
                error={errors.contact_birthday}
              />
              <div className="space-y-1.5">
                <Label>Email công ty</Label>
                <Input type="email" value={form.company_email} onChange={(e) => set("company_email", e.target.value)} />
                {errors.company_email && <p className="text-xs text-destructive">{errors.company_email}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <DateInput
                label="Ngày thành lập"
                value={form.founded_date}
                textValue={form.founded_date_text}
                onChange={(d) => set("founded_date", d)}
                onTextChange={(t) => set("founded_date_text", t)}
                error={errors.founded_date}
              />
              <div className="space-y-1.5">
                <Label>Quy mô nhân sự</Label>
                <Input type="number" value={form.company_size} onChange={(e) => set("company_size", e.target.value)} placeholder="Số nhân viên" />
              </div>
              <div className="space-y-1.5">
                <Label>SĐT người liên hệ</Label>
                <Input value={form.contact_person_phone} onChange={(e) => set("contact_person_phone", e.target.value)} placeholder="10 chữ số" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tour quan tâm</Label>
                <Input value={form.tour_interest} onChange={(e) => set("tour_interest", e.target.value)} placeholder="VD: Tour Nhật 5N4Đ" />
              </div>
              <div className="space-y-1.5">
                <Label>Tình trạng</Label>
                <Select value={form.contact_status} onValueChange={(v) => set("contact_status", v)}>
                  <SelectTrigger><SelectValue placeholder="Chọn tình trạng" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Chưa liên hệ">Chưa liên hệ</SelectItem>
                    <SelectItem value="Đang tư vấn">Đang tư vấn</SelectItem>
                    <SelectItem value="Chốt deal">Chốt deal</SelectItem>
                    <SelectItem value="Từ chối">Từ chối</SelectItem>
                    <SelectItem value="Hẹn gọi lại">Hẹn gọi lại</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Kết quả</Label>
                <Input value={form.result} onChange={(e) => set("result", e.target.value)} placeholder="VD: Đã chốt / Đang cân nhắc" />
              </div>
              <div className="space-y-1.5">
                <Label>Vấn đề gặp phải</Label>
                <Input value={form.issue_faced} onChange={(e) => set("issue_faced", e.target.value)} placeholder="VD: Giá cao, chưa quyết lịch" />
              </div>
            </div>
          </TabsContent>

          {/* === TAB CÁ NHÂN (SAU) === */}
          <TabsContent value="personal" className="space-y-4 mt-4">
            {/* Row 1: Name + Type */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Họ tên <span className="text-destructive">*</span></Label>
                <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
                {errors.full_name && <p className="text-xs text-destructive">{errors.full_name}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Loại <span className="text-destructive">*</span></Label>
                <Select value={form.type} onValueChange={(v) => set("type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INDIVIDUAL">Cá nhân</SelectItem>
                    <SelectItem value="CORPORATE">Doanh nghiệp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: Phone + Email */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Điện thoại <span className="text-destructive">*</span></Label>
                <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="10 chữ số" />
                {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>
            </div>

            {/* Row 3: DOB + Gender */}
            <div className="grid grid-cols-2 gap-4">
              <DateInput
                label="Ngày sinh"
                value={form.date_of_birth}
                textValue={form.date_of_birth_text}
                onChange={(d) => set("date_of_birth", d)}
                onTextChange={(t) => set("date_of_birth_text", t)}
                disabled={(date) => date > new Date()}
                badge={form.date_of_birth && isBirthdayUpcoming(form.date_of_birth) ? (
                  <Badge variant="default" className="text-[10px] px-1.5 py-0">🎂 Sinh nhật sắp tới</Badge>
                ) : undefined}
                error={errors.date_of_birth}
              />
              <div className="space-y-1.5">
                <Label>Giới tính</Label>
                <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
                  <SelectTrigger><SelectValue placeholder="Chọn giới tính" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Nam">Nam</SelectItem>
                    <SelectItem value="Nữ">Nữ</SelectItem>
                    <SelectItem value="Khác">Khác</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 4: ID Number + Address */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>CCCD/Passport</Label>
                <Input value={form.id_number} onChange={(e) => set("id_number", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Địa chỉ</Label>
                <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
              </div>
            </div>

            {/* Row 5: Source + Sale */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nguồn đến</Label>
                <Select value={form.source_id} onValueChange={(v) => set("source_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Chọn nguồn" /></SelectTrigger>
                  <SelectContent>
                    {leadSources.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Sale phụ trách</Label>
                <Select value={form.assigned_sale_id} onValueChange={(v) => set("assigned_sale_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Chọn sale" /></SelectTrigger>
                  <SelectContent>
                    {salesProfiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 6: Segment (read-only) */}
            <div className="space-y-1.5">
              <Label>Phân khúc</Label>
              <div className="pt-1">
                <Badge className={seg.className}>{seg.label}</Badge>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>Ghi chú</Label>
              <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Huỷ</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
