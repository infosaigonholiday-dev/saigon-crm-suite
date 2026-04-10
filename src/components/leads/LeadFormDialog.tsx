import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, Loader2, Info, User, Building2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editData?: any;
}

type LeadType = "INDIVIDUAL" | "CORPORATE";

const channelOptions = [
  { value: "ZALO", label: "Zalo" },
  { value: "FB", label: "Facebook" },
  { value: "GOOGLE", label: "Google" },
  { value: "REFERRAL", label: "Giới thiệu" },
  { value: "WALKIN", label: "Walk-in" },
  { value: "AGENCY", label: "Đại lý" },
  { value: "TRANG_VANG", label: "Trang vàng" },
  { value: "GOOGLE_MAPS", label: "Google Maps" },
  { value: "COLD_CALL", label: "Gọi lạnh" },
  { value: "EVENT", label: "Sự kiện / Hội chợ" },
  { value: "WEBSITE", label: "Website" },
  { value: "OTHER", label: "Khác" },
];

const interestOptions = [
  { value: "MICE", label: "MICE" },
  { value: "DOMESTIC", label: "Nội địa" },
  { value: "OUTBOUND", label: "Outbound" },
  { value: "INBOUND", label: "Inbound" },
];

const initial = {
  full_name: "",
  phone: "",
  email: "",
  channel: "ZALO",
  interest_type: "",
  temperature: "warm",
  company_name: "",
  company_address: "",
  contact_person: "",
  contact_position: "",
  company_size: "",
  tax_code: "",
  destination: "",
  pax_count: "",
  budget: "",
  expected_value: "",
  call_notes: "",
};

export default function LeadFormDialog({ open, onOpenChange, editData }: Props) {
  const isEdit = !!editData;
  const [leadType, setLeadType] = useState<LeadType>("INDIVIDUAL");
  const [form, setForm] = useState(initial);
  const [followUpDate, setFollowUpDate] = useState<Date | undefined>();
  const [plannedTravelDate, setPlannedTravelDate] = useState<Date | undefined>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const { user } = useAuth();
  const qc = useQueryClient();

  // Populate form when editData changes
  useEffect(() => {
    if (editData && open) {
      setLeadType(editData.company_name ? "CORPORATE" : "INDIVIDUAL");
      setForm({
        full_name: editData.full_name || "",
        phone: editData.phone || "",
        email: editData.email || "",
        channel: editData.channel || "ZALO",
        interest_type: editData.interest_type || "",
        temperature: editData.temperature || "warm",
        company_name: editData.company_name || "",
        company_address: editData.company_address || "",
        contact_person: editData.contact_person || "",
        contact_position: editData.contact_position || "",
        company_size: editData.company_size?.toString() || "",
        tax_code: editData.tax_code || "",
        destination: editData.destination || "",
        pax_count: editData.pax_count?.toString() || "",
        budget: editData.budget?.toString() || "",
        expected_value: editData.expected_value?.toString() || "",
        call_notes: editData.call_notes || "",
      });
      setFollowUpDate(editData.follow_up_date ? new Date(editData.follow_up_date) : undefined);
      setPlannedTravelDate(editData.planned_travel_date ? new Date(editData.planned_travel_date) : undefined);
    } else if (!editData && open) {
      setForm(initial);
      setLeadType("INDIVIDUAL");
      setFollowUpDate(undefined);
      setPlannedTravelDate(undefined);
    }
  }, [editData, open]);

  const set = (k: string, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: "" }));
  };

  const reminderDate = plannedTravelDate
    ? new Date(plannedTravelDate.getTime() - 60 * 24 * 60 * 60 * 1000)
    : null;

  const isB2B = leadType === "CORPORATE";

  const validate = () => {
    const e: Record<string, string> = {};

    if (isB2B) {
      // B2B: company_name + contact_person + phone bắt buộc
      if (!form.company_name.trim()) e.company_name = "Bắt buộc";
      if (!form.contact_person.trim()) e.contact_person = "Bắt buộc";
      if (!form.phone.trim()) e.phone = "Bắt buộc";
    } else {
      // Cá nhân: full_name + phone bắt buộc
      if (!form.full_name.trim()) e.full_name = "Bắt buộc";
      if (!form.phone.trim()) e.phone = "Bắt buộc";
    }

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Email không hợp lệ";
    if (form.phone && !/^[0-9+\-\s()]{8,15}$/.test(form.phone))
      e.phone = "Số điện thoại không hợp lệ";
    if (form.pax_count && isNaN(Number(form.pax_count)))
      e.pax_count = "Phải là số";
    if (form.tax_code && !/^\d{10,13}$/.test(form.tax_code.replace(/[- ]/g, "")))
      e.tax_code = "MST phải 10-13 số";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const checkDuplicate = async (): Promise<string | null> => {
    const phone = form.phone.trim();
    const email = form.email.trim();
    const taxCode = form.tax_code.trim();

    if (isB2B) {
      // B2B: check company_name + contact_person + phone
      if (form.company_name.trim() && form.contact_person.trim() && phone) {
        const { data } = await supabase
          .from("leads")
          .select("id, full_name, company_name, contact_person, phone")
          .eq("company_name", form.company_name.trim())
          .eq("contact_person", form.contact_person.trim())
          .eq("phone", phone)
          .limit(1);
        if (data && data.length > 0) {
          return `Lead doanh nghiệp "${data[0].company_name}" (LH: ${data[0].contact_person}, SĐT: ${phone}) đã tồn tại. Không cho phép tạo trùng.`;
        }
      }
    } else {
      // Cá nhân: check full_name + phone
      if (form.full_name.trim() && phone) {
        const { data } = await supabase
          .from("leads")
          .select("id, full_name, phone")
          .eq("full_name", form.full_name.trim())
          .eq("phone", phone)
          .limit(1);
        if (data && data.length > 0) {
          return `Lead "${data[0].full_name}" với SĐT ${phone} đã tồn tại. Không cho phép tạo trùng.`;
        }
      }
    }

    // Check customers by phone
    if (phone) {
      const { data } = await supabase.from("customers").select("id, full_name, phone").eq("phone", phone).limit(1);
      if (data && data.length > 0) {
        return `Khách hàng "${data[0].full_name}" đã tồn tại với SĐT ${phone}. Không cho phép tạo trùng.`;
      }
    }

    // Check tax_code
    if (taxCode) {
      const { data } = await supabase.from("leads").select("id, full_name, tax_code").eq("tax_code", taxCode).limit(1);
      if (data && data.length > 0) {
        return `Lead "${data[0].full_name}" đã tồn tại với MST ${taxCode}. Không cho phép tạo trùng.`;
      }
    }
    return null;
  };

  const mutation = useMutation({
    mutationFn: async () => {
      // For B2B without full_name, use company_name as full_name
      const fullName = isB2B
        ? (form.full_name.trim() || form.company_name.trim())
        : form.full_name.trim();

      const payload = {
        full_name: fullName,
        phone: form.phone || null,
        email: form.email || null,
        channel: form.channel,
        interest_type: form.interest_type || null,
        temperature: form.temperature || "warm",
        company_name: form.company_name || null,
        company_address: form.company_address || null,
        contact_person: form.contact_person || null,
        contact_position: form.contact_position || null,
        company_size: form.company_size ? Number(form.company_size) : null,
        tax_code: form.tax_code || null,
        destination: form.destination || null,
        pax_count: form.pax_count ? Number(form.pax_count) : null,
        budget: form.budget ? Number(form.budget) : null,
        expected_value: form.expected_value ? Number(form.expected_value) : null,
        planned_travel_date: plannedTravelDate ? format(plannedTravelDate, "yyyy-MM-dd") : null,
        follow_up_date: followUpDate ? format(followUpDate, "yyyy-MM-dd") : null,
        call_notes: form.call_notes || null,
      };

      if (isEdit) {
        const { error } = await supabase.from("leads").update(payload as any).eq("id", editData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("leads").insert({
          ...payload,
          assigned_to: user?.id || null,
          created_by: user?.id || null,
          status: "NEW",
        } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success(isEdit ? "Đã cập nhật lead" : "Đã thêm lead mới");
      if (!isEdit) {
        setForm(initial);
        setLeadType("INDIVIDUAL");
        setFollowUpDate(undefined);
        setPlannedTravelDate(undefined);
      }
      setDuplicateWarning(null);
      setPendingSubmit(false);
      onOpenChange(false);
    },
    onError: (err: any) => toast.error("Lỗi", { description: err.message }),
  });

  const handleSubmit = async () => {
    if (!validate()) return;

    if (!isEdit) {
      const warning = await checkDuplicate();
      if (warning) {
        setDuplicateWarning(warning);
        return;
      }
    }

    setDuplicateWarning(null);
    setPendingSubmit(false);
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Sửa lead" : "Thêm lead mới"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2">
          {/* TYPE SELECTOR */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={leadType === "INDIVIDUAL" ? "default" : "outline"}
              className="flex-1 gap-2"
              onClick={() => { setLeadType("INDIVIDUAL"); setErrors({}); }}
            >
              <User className="h-4 w-4" />
              Khách cá nhân
            </Button>
            <Button
              type="button"
              variant={leadType === "CORPORATE" ? "default" : "outline"}
              className="flex-1 gap-2"
              onClick={() => { setLeadType("CORPORATE"); setErrors({}); }}
            >
              <Building2 className="h-4 w-4" />
              Khách doanh nghiệp
            </Button>
          </div>

          {/* SECTION: Cá nhân */}
          {!isB2B && (
            <div>
              <p className="text-sm font-semibold text-foreground mb-3">👤 Thông tin khách hàng</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Họ tên <span className="text-destructive">*</span></Label>
                  <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
                  {errors.full_name && <p className="text-xs text-destructive">{errors.full_name}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Số điện thoại <span className="text-destructive">*</span></Label>
                  <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                  {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Kênh nguồn</Label>
                  <Select value={form.channel} onValueChange={(v) => set("channel", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {channelOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* SECTION: Doanh nghiệp */}
          {isB2B && (
            <div>
              <p className="text-sm font-semibold text-foreground mb-3">🏢 Thông tin doanh nghiệp</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Tên công ty <span className="text-destructive">*</span></Label>
                  <Input value={form.company_name} onChange={(e) => set("company_name", e.target.value)} />
                  {errors.company_name && <p className="text-xs text-destructive">{errors.company_name}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Địa chỉ công ty</Label>
                  <Input value={form.company_address} onChange={(e) => set("company_address", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div className="space-y-1.5">
                  <Label>Người liên hệ <span className="text-destructive">*</span></Label>
                  <Input value={form.contact_person} onChange={(e) => set("contact_person", e.target.value)} />
                  {errors.contact_person && <p className="text-xs text-destructive">{errors.contact_person}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>SĐT liên hệ <span className="text-destructive">*</span></Label>
                  <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                  {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div className="space-y-1.5">
                  <Label>Chức vụ</Label>
                  <Input value={form.contact_position} onChange={(e) => set("contact_position", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-3">
                <div className="space-y-1.5">
                  <Label>Quy mô nhân sự</Label>
                  <Input type="number" value={form.company_size} onChange={(e) => set("company_size", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Mã số thuế</Label>
                  <Input value={form.tax_code} onChange={(e) => set("tax_code", e.target.value)} />
                  {errors.tax_code && <p className="text-xs text-destructive">{errors.tax_code}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Kênh nguồn</Label>
                  <Select value={form.channel} onValueChange={(v) => set("channel", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {channelOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* SECTION: Chung - Quan tâm & Mức độ */}
          <div className="border-t pt-4">
            <p className="text-sm font-semibold text-foreground mb-3">📋 Phân loại</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Loại quan tâm</Label>
                <Select value={form.interest_type} onValueChange={(v) => set("interest_type", v)}>
                  <SelectTrigger><SelectValue placeholder="Chọn loại" /></SelectTrigger>
                  <SelectContent>
                    {interestOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Mức độ</Label>
                <Select value={form.temperature} onValueChange={(v) => set("temperature", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hot">🔥 Nóng</SelectItem>
                    <SelectItem value="warm">🟠 Ấm</SelectItem>
                    <SelectItem value="cold">🔵 Lạnh</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* SECTION: Nhu cầu tour */}
          <div className="border-t pt-4">
            <p className="text-sm font-semibold text-foreground mb-3">✈️ Nhu cầu tour</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Điểm đến</Label>
                <Input placeholder="VD: Đà Lạt, Nha Trang" value={form.destination} onChange={(e) => set("destination", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Ngày dự kiến đi</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !plannedTravelDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {plannedTravelDate ? format(plannedTravelDate, "dd/MM/yyyy") : "Chọn ngày"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={plannedTravelDate} onSelect={setPlannedTravelDate} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
                {reminderDate && (
                  <p className="text-xs text-primary flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Nhắc hẹn: {format(reminderDate, "dd/MM/yyyy")}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-3">
              <div className="space-y-1.5">
                <Label>Số khách dự kiến</Label>
                <Input type="number" value={form.pax_count} onChange={(e) => set("pax_count", e.target.value)} />
                {errors.pax_count && <p className="text-xs text-destructive">{errors.pax_count}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Ngân sách</Label>
                <Input type="number" value={form.budget} onChange={(e) => set("budget", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Giá trị kỳ vọng</Label>
                <Input type="number" value={form.expected_value} onChange={(e) => set("expected_value", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div className="space-y-1.5">
                <Label>Ngày follow-up</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !followUpDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {followUpDate ? format(followUpDate, "dd/MM/yyyy") : "Chọn ngày"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={followUpDate} onSelect={setFollowUpDate} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              <Label>Ghi chú</Label>
              <Textarea rows={2} value={form.call_notes} onChange={(e) => set("call_notes", e.target.value)} />
            </div>
          </div>
        </div>

        {duplicateWarning && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            <p>{duplicateWarning}</p>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => setDuplicateWarning(null)}>Đóng</Button>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Huỷ</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending || !!duplicateWarning}>
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? "Cập nhật" : "Lưu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
