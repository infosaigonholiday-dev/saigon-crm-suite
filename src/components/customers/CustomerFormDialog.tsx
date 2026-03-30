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
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const initial = {
  full_name: "",
  type: "CÁ NHÂN",
  phone: "",
  email: "",
  company_name: "",
  address: "",
  tax_code: "",
  zalo_id: "",
  segment: "NEW",
  notes: "",
};

export default function CustomerFormDialog({ open, onOpenChange }: Props) {
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
      const { error } = await supabase.from("customers").insert({
        full_name: form.full_name.trim(),
        type: form.type,
        phone: form.phone || null,
        email: form.email || null,
        company_name: form.company_name || null,
        address: form.address || null,
        tax_code: form.tax_code || null,
        zalo_id: form.zalo_id || null,
        segment: form.segment,
        notes: form.notes || null,
      });
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Thêm khách hàng</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
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
              <Label>Công ty</Label>
              <Input value={form.company_name} onChange={(e) => set("company_name", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Phân khúc</Label>
              <Select value={form.segment} onValueChange={(v) => set("segment", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NEW">Mới</SelectItem>
                  <SelectItem value="SILVER">Silver</SelectItem>
                  <SelectItem value="GOLD">Gold</SelectItem>
                  <SelectItem value="DIAMOND">Diamond</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Địa chỉ</Label>
            <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Mã số thuế</Label>
              <Input value={form.tax_code} onChange={(e) => set("tax_code", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Zalo ID</Label>
              <Input value={form.zalo_id} onChange={(e) => set("zalo_id", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Ghi chú</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
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
