import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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

const initial = {
  full_name: "",
  phone: "",
  email: "",
  channel: "",
  interest_type: "",
  company_name: "",
  expected_value: "",
  budget: "",
  destination: "",
  pax_count: "",
  temperature: "warm",
  call_notes: "",
};

export default function LeadFormDialog({ open, onOpenChange }: Props) {
  const [form, setForm] = useState(initial);
  const [followUpDate, setFollowUpDate] = useState<Date | undefined>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const qc = useQueryClient();

  const set = (k: string, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.full_name.trim()) e.full_name = "Bắt buộc";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Email không hợp lệ";
    if (form.phone && !/^[0-9+\-\s()]{8,15}$/.test(form.phone))
      e.phone = "Số điện thoại không hợp lệ";
    if (form.pax_count && isNaN(Number(form.pax_count)))
      e.pax_count = "Phải là số";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("leads").insert({
        full_name: form.full_name.trim(),
        phone: form.phone || null,
        email: form.email || null,
        channel: form.channel || null,
        interest_type: form.interest_type || null,
        company_name: form.company_name || null,
        expected_value: form.expected_value ? Number(form.expected_value) : null,
        budget: form.budget ? Number(form.budget) : null,
        destination: form.destination || null,
        pax_count: form.pax_count ? Number(form.pax_count) : null,
        temperature: form.temperature || "warm",
        follow_up_date: followUpDate ? format(followUpDate, "yyyy-MM-dd") : null,
        call_notes: form.call_notes || null,
        status: "NEW",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: "Thành công", description: "Đã thêm lead mới" });
      setForm(initial);
      setFollowUpDate(undefined);
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
                  <SelectItem value="Facebook">Facebook</SelectItem>
                  <SelectItem value="Zalo">Zalo</SelectItem>
                  <SelectItem value="Website">Website</SelectItem>
                  <SelectItem value="Referral">Giới thiệu</SelectItem>
                  <SelectItem value="Other">Khác</SelectItem>
                </SelectContent>
              </Select>
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
              <Input placeholder="VD: Tour Nhật Bản" value={form.interest_type} onChange={(e) => set("interest_type", e.target.value)} />
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
        </div>
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
