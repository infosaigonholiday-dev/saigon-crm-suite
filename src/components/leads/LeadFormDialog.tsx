import { useState } from "react";
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
import { CalendarIcon, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const leadChannelOptions = [
  { value: "ZALO", label: "Zalo" },
  { value: "FB", label: "Facebook" },
  { value: "GOOGLE", label: "Google" },
  { value: "REFERRAL", label: "Giới thiệu" },
  { value: "WALKIN", label: "Walk-in" },
  { value: "AGENCY", label: "Đại lý" },
] as const;

type LeadChannel = (typeof leadChannelOptions)[number]["value"];

const legacyLeadChannelMap: Record<string, LeadChannel> = {
  ZALO: "ZALO",
  FACEBOOK: "FB",
  FB: "FB",
  GOOGLE: "GOOGLE",
  WEBSITE: "GOOGLE",
  REFERRAL: "REFERRAL",
  "GIỚI THIỆU": "REFERRAL",
  WALKIN: "WALKIN",
  "WALK-IN": "WALKIN",
  AGENCY: "AGENCY",
  "ĐẠI LÝ": "AGENCY",
};

function normalizeLeadChannel(value: string): LeadChannel | null {
  const normalized = value.trim().toUpperCase();
  if (!normalized) return null;

  return leadChannelOptions.some((option) => option.value === normalized)
    ? (normalized as LeadChannel)
    : legacyLeadChannelMap[normalized] ?? null;
}

const initial = {
  full_name: "",
  phone: "",
  email: "",
  channel: "ZALO",
  interest_type: "",
  company_name: "",
  company_address: "",
  expected_value: "",
  budget: "",
  destination: "",
  pax_count: "",
  temperature: "warm",
  call_notes: "",
  tour_interest: "",
  contact_status: "",
  issue_faced: "",
  result: "",
  assigned_staff_name: "",
  assigned_staff_phone: "",
};

export default function LeadFormDialog({ open, onOpenChange }: Props) {
  const [form, setForm] = useState(initial);
  const [followUpDate, setFollowUpDate] = useState<Date | undefined>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { user } = useAuth();
  
  const qc = useQueryClient();

  const set = (k: string, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    const normalizedChannel = normalizeLeadChannel(form.channel);

    if (!form.full_name.trim()) e.full_name = "Bắt buộc";
    if (!normalizedChannel) e.channel = "Kênh không hợp lệ";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Email không hợp lệ";
    if (form.phone && !/^[0-9+\-\s()]{8,15}$/.test(form.phone))
      e.phone = "Số điện thoại không hợp lệ";
    if (form.pax_count && isNaN(Number(form.pax_count)))
      e.pax_count = "Phải là số";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [pendingSubmit, setPendingSubmit] = useState(false);

  const checkDuplicate = async (): Promise<string | null> => {
    const phone = form.phone.trim();
    const email = form.email.trim();
    if (!phone && !email) return null;

    let q = supabase.from("leads").select("id, full_name, phone, email").limit(1);
    if (phone && email) {
      q = q.or(`phone.eq.${phone},email.eq.${email}`);
    } else if (phone) {
      q = q.eq("phone", phone);
    } else {
      q = q.eq("email", email);
    }
    const { data } = await q;
    if (data && data.length > 0) {
      const match = data[0];
      return `Lead "${match.full_name}" đã tồn tại với ${match.phone === phone ? `SĐT ${phone}` : `email ${email}`}. Bạn vẫn muốn tạo?`;
    }
    return null;
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const normalizedChannel = normalizeLeadChannel(form.channel) ?? "ZALO";

      const { error } = await supabase.from("leads").insert({
        full_name: form.full_name.trim(),
        phone: form.phone || null,
        email: form.email || null,
        channel: normalizedChannel,
        interest_type: form.interest_type || null,
        company_name: form.company_name || null,
        company_address: (form as any).company_address || null,
        expected_value: form.expected_value ? Number(form.expected_value) : null,
        budget: form.budget ? Number(form.budget) : null,
        destination: form.destination || null,
        pax_count: form.pax_count ? Number(form.pax_count) : null,
        temperature: form.temperature || "warm",
        follow_up_date: followUpDate ? format(followUpDate, "yyyy-MM-dd") : null,
        call_notes: form.call_notes || null,
        tour_interest: (form as any).tour_interest || null,
        contact_status: (form as any).contact_status || null,
        issue_faced: (form as any).issue_faced || null,
        result: (form as any).result || null,
        assigned_staff_name: (form as any).assigned_staff_name || null,
        assigned_staff_phone: (form as any).assigned_staff_phone || null,
        assigned_to: user?.id || null,
        status: "NEW",
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Thành công", { description: "Đã thêm lead mới" });
      setForm(initial);
      setFollowUpDate(undefined);
      setDuplicateWarning(null);
      setPendingSubmit(false);
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error("Lỗi", { description: err.message });
    },
  });

  const handleSubmit = async () => {
    if (!validate()) return;

    if (!pendingSubmit) {
      const warning = await checkDuplicate();
      if (warning) {
        setDuplicateWarning(warning);
        setPendingSubmit(true);
        return;
      }
    }

    setDuplicateWarning(null);
    setPendingSubmit(false);
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Thêm lead</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          {/* Row 1: Name + Channel */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Họ tên <span className="text-destructive">*</span></Label>
              <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
              {errors.full_name && <p className="text-xs text-destructive">{errors.full_name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Kênh</Label>
              <Select value={form.channel} onValueChange={(v) => set("channel", v)}>
                <SelectTrigger><SelectValue placeholder="Chọn kênh" /></SelectTrigger>
                <SelectContent>
                  {leadChannelOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.channel && <p className="text-xs text-destructive">{errors.channel}</p>}
            </div>
          </div>

          {/* Row 2: Phone + Email */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Điện thoại</Label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
          </div>

          {/* Row 3: Interest + Destination */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Quan tâm</Label>
              <Select value={form.interest_type} onValueChange={(v) => set("interest_type", v)}>
                <SelectTrigger><SelectValue placeholder="Chọn loại" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MICE">MICE</SelectItem>
                  <SelectItem value="DOMESTIC">Nội địa</SelectItem>
                  <SelectItem value="OUTBOUND">Outbound</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Điểm đến</Label>
              <Input placeholder="VD: Đà Nẵng" value={form.destination} onChange={(e) => set("destination", e.target.value)} />
            </div>
          </div>

          {/* Row 4: Budget + Expected value */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Ngân sách dự kiến</Label>
              <Input type="number" value={form.budget} onChange={(e) => set("budget", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Giá trị dự kiến</Label>
              <Input type="number" value={form.expected_value} onChange={(e) => set("expected_value", e.target.value)} />
            </div>
          </div>

          {/* Row 5: Pax + Temperature */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Số lượng khách</Label>
              <Input type="number" value={form.pax_count} onChange={(e) => set("pax_count", e.target.value)} />
              {errors.pax_count && <p className="text-xs text-destructive">{errors.pax_count}</p>}
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

          {/* Row 6: Company + Follow-up date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Công ty</Label>
              <Input value={form.company_name} onChange={(e) => set("company_name", e.target.value)} />
            </div>
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

          {/* Call notes */}
          <div className="space-y-1.5">
            <Label>Ghi chú cuộc gọi</Label>
            <Textarea rows={2} value={form.call_notes} onChange={(e) => set("call_notes", e.target.value)} />
          </div>

          {/* Business fields */}
          <div className="border-t pt-4 mt-2">
            <p className="text-sm font-semibold text-muted-foreground mb-3">Thông tin doanh nghiệp</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Địa chỉ công ty</Label>
              <Input value={form.company_address} onChange={(e) => set("company_address", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Tour quan tâm</Label>
              <Input placeholder="VD: Tour Nhật 5N4Đ" value={form.tour_interest} onChange={(e) => set("tour_interest", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-1.5">
              <Label>Kết quả</Label>
              <Input placeholder="VD: Đã chốt / Đang cân nhắc" value={form.result} onChange={(e) => set("result", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Vấn đề gặp phải</Label>
            <Textarea rows={2} value={form.issue_faced} onChange={(e) => set("issue_faced", e.target.value)} placeholder="VD: Giá cao, chưa quyết lịch..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nhân sự phụ trách</Label>
              <Input value={form.assigned_staff_name} onChange={(e) => set("assigned_staff_name", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>SĐT nhân sự phụ trách</Label>
              <Input value={form.assigned_staff_phone} onChange={(e) => set("assigned_staff_phone", e.target.value)} />
            </div>
          </div>
        </div>
        {duplicateWarning && (
          <div className="rounded-md border border-orange-300 bg-orange-50 p-3 text-sm text-orange-800">
            <p>{duplicateWarning}</p>
            <div className="flex gap-2 mt-2">
              <Button size="sm" variant="outline" onClick={() => { setDuplicateWarning(null); setPendingSubmit(false); }}>Huỷ</Button>
              <Button size="sm" onClick={handleSubmit} disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Vẫn tạo
              </Button>
            </div>
          </div>
        )}
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
