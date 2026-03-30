import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

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
};

export default function LeadFormDialog({ open, onOpenChange }: Props) {
  const [form, setForm] = useState(initial);
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
        status: "NEW",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: "Thành công", description: "Đã thêm lead mới" });
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Thêm lead</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Quan tâm</Label>
              <Input placeholder="VD: Tour Nhật Bản" value={form.interest_type} onChange={(e) => set("interest_type", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Giá trị dự kiến</Label>
              <Input type="number" value={form.expected_value} onChange={(e) => set("expected_value", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Công ty</Label>
            <Input value={form.company_name} onChange={(e) => set("company_name", e.target.value)} />
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
