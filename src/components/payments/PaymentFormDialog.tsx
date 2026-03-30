import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  booking_id: "",
  amount: "",
  payment_type: "DEPOSIT",
  method: "BANK_TRANSFER",
  paid_at: "",
  bank_ref_code: "",
  notes: "",
};

export default function PaymentFormDialog({ open, onOpenChange }: Props) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: bookings = [] } = useQuery({
    queryKey: ["bookings-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, code, customers(full_name)")
        .order("created_at", { ascending: false });
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
    if (!form.booking_id) e.booking_id = "Bắt buộc";
    if (!form.amount || Number(form.amount) <= 0) e.amount = "Số tiền phải > 0";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("payments").insert({
        booking_id: form.booking_id,
        amount: Number(form.amount),
        payment_type: form.payment_type,
        method: form.method,
        paid_at: form.paid_at || null,
        bank_ref_code: form.bank_ref_code || null,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      toast({ title: "Thành công", description: "Đã thêm thanh toán" });
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
          <DialogTitle>Thêm thanh toán</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label>Booking <span className="text-destructive">*</span></Label>
            <Select value={form.booking_id} onValueChange={(v) => set("booking_id", v)}>
              <SelectTrigger><SelectValue placeholder="Chọn booking" /></SelectTrigger>
              <SelectContent>
                {bookings.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.code} — {(b.customers as any)?.full_name ?? ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.booking_id && <p className="text-xs text-destructive">{errors.booking_id}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Số tiền <span className="text-destructive">*</span></Label>
              <Input type="number" value={form.amount} onChange={(e) => set("amount", e.target.value)} />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Loại</Label>
              <Select value={form.payment_type} onValueChange={(v) => set("payment_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEPOSIT">Đặt cọc</SelectItem>
                  <SelectItem value="REMAINING">Còn lại</SelectItem>
                  <SelectItem value="FULL">Toàn bộ</SelectItem>
                  <SelectItem value="REFUND">Hoàn tiền</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Phương thức</Label>
              <Select value={form.method} onValueChange={(v) => set("method", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BANK_TRANSFER">Chuyển khoản</SelectItem>
                  <SelectItem value="CASH">Tiền mặt</SelectItem>
                  <SelectItem value="CARD">Thẻ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Ngày thanh toán</Label>
              <Input type="datetime-local" value={form.paid_at} onChange={(e) => set("paid_at", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Mã giao dịch ngân hàng</Label>
            <Input value={form.bank_ref_code} onChange={(e) => set("bank_ref_code", e.target.value)} />
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
