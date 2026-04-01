import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
  code: "",
  customer_id: "",
  pax_total: "",
  total_value: "",
  deposit_amount: "",
  deposit_due_at: "",
  remaining_due_at: "",
};

export default function BookingFormDialog({ open, onOpenChange }: Props) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const qc = useQueryClient();

  const { data: customers = [] } = useQuery({
    queryKey: ["customers-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, full_name")
        .order("full_name");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const set = (k: string, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.code.trim()) e.code = "Bắt buộc";
    if (!form.customer_id) e.customer_id = "Bắt buộc";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("bookings").insert({
        code: form.code.trim(),
        customer_id: form.customer_id,
        pax_total: form.pax_total ? Number(form.pax_total) : 0,
        total_value: form.total_value ? Number(form.total_value) : 0,
        deposit_amount: form.deposit_amount ? Number(form.deposit_amount) : 0,
        deposit_due_at: form.deposit_due_at || null,
        remaining_due_at: form.remaining_due_at || null,
        status: "PENDING",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      toast({ title: "Thành công", description: "Đã tạo booking mới" });
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
          <DialogTitle>Tạo booking</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Mã booking <span className="text-destructive">*</span></Label>
              <Input value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="VD: BK-001" />
              {errors.code && <p className="text-xs text-destructive">{errors.code}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Khách hàng <span className="text-destructive">*</span></Label>
              <Select value={form.customer_id} onValueChange={(v) => set("customer_id", v)}>
                <SelectTrigger><SelectValue placeholder="Chọn khách hàng" /></SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.customer_id && <p className="text-xs text-destructive">{errors.customer_id}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Số khách</Label>
              <Input type="number" value={form.pax_total} onChange={(e) => set("pax_total", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Tổng giá trị</Label>
              <Input type="number" value={form.total_value} onChange={(e) => set("total_value", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Tiền cọc</Label>
              <Input type="number" value={form.deposit_amount} onChange={(e) => set("deposit_amount", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Hạn cọc</Label>
              <Input type="date" value={form.deposit_due_at} onChange={(e) => set("deposit_due_at", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Hạn thanh toán</Label>
              <Input type="date" value={form.remaining_due_at} onChange={(e) => set("remaining_due_at", e.target.value)} />
            </div>
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
