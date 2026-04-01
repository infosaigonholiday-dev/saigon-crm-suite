import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays, setYear } from "date-fns";
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
  type: "CÁ NHÂN",
  phone: "",
  email: "",
  date_of_birth: null as Date | null,
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
  company_email: "",
  founded_date: null as Date | null,
  company_size: "",
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
  // Also check next year wrap
  const nextYearBday = setYear(dob, today.getFullYear() + 1);
  const diff2 = differenceInDays(nextYearBday, today);
  return diff2 >= 0 && diff2 <= 7;
}

export default function CustomerFormDialog({ open, onOpenChange }: Props) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
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
    if (form.tax_code && !/^\d{10}$/.test(form.tax_code))
      e.tax_code = "MST phải là 10 chữ số";
    if (form.company_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.company_email))
      e.company_email = "Email không hợp lệ";
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
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast({ title: "Thành công", description: "Đã thêm khách hàng mới" });
      setForm(initial);
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: "Lỗi", description: err.message, variant: "destructive" });
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

        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="personal">Thông tin cá nhân</TabsTrigger>
            <TabsTrigger value="company">Thông tin doanh nghiệp</TabsTrigger>
          </TabsList>

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
                    <SelectItem value="CÁ NHÂN">Cá nhân</SelectItem>
                    <SelectItem value="DOANH NGHIỆP">Doanh nghiệp</SelectItem>
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
              <div className="space-y-1.5">
                <Label className="flex items-center gap-2">
                  Ngày sinh
                  {form.date_of_birth && isBirthdayUpcoming(form.date_of_birth) && (
                    <Badge variant="default" className="text-[10px] px-1.5 py-0">🎂 Sinh nhật sắp tới</Badge>
                  )}
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.date_of_birth && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.date_of_birth ? format(form.date_of_birth, "dd/MM/yyyy") : "Chọn ngày"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.date_of_birth ?? undefined}
                      onSelect={(d) => set("date_of_birth", d ?? null)}
                      disabled={(date) => date > new Date()}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                {errors.date_of_birth && <p className="text-xs text-destructive">{errors.date_of_birth}</p>}
              </div>
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
              <div className="space-y-1.5">
                <Label>Ngày sinh người liên hệ</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.contact_birthday && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.contact_birthday ? format(form.contact_birthday, "dd/MM/yyyy") : "Chọn ngày"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.contact_birthday ?? undefined}
                      onSelect={(d) => set("contact_birthday", d ?? null)}
                      disabled={(date) => date > new Date()}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label>Email công ty</Label>
                <Input type="email" value={form.company_email} onChange={(e) => set("company_email", e.target.value)} />
                {errors.company_email && <p className="text-xs text-destructive">{errors.company_email}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Ngày thành lập</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.founded_date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.founded_date ? format(form.founded_date, "dd/MM/yyyy") : "Chọn ngày"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.founded_date ?? undefined}
                      onSelect={(d) => set("founded_date", d ?? null)}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label>Quy mô nhân sự</Label>
                <Input type="number" value={form.company_size} onChange={(e) => set("company_size", e.target.value)} placeholder="Số nhân viên" />
              </div>
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
