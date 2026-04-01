import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const initial = {
  code: "",
  customer_id: "",
  lead_id: "",
  tour_package_id: "",
  valid_from: "",
  valid_until: "",
  total_amount: "",
  currency: "VND",
  status: "DRAFT",
  notes: "",
};

export default function QuotationFormDialog({ open, onOpenChange }: Props) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const qc = useQueryClient();
  const { session } = useAuth();

  const { data: customers } = useQuery({
    queryKey: ["customers-select"],
    queryFn: async () => {
      const { data } = await supabase.from("customers").select("id, full_name").order("full_name");
      return data ?? [];
    },
    enabled: open,
  });

  const { data: tourPackages } = useQuery({
    queryKey: ["tour-packages-select"],
    queryFn: async () => {
      const { data } = await supabase.from("tour_packages" as any).select("id, name, code").eq("status", "ACTIVE").order("name");
      return (data ?? []) as any[];
    },
    enabled: open,
  });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.code.trim()) e.code = "Bắt buộc";
    if (!form.customer_id) e.customer_id = "Bắt buộc";
    if (!form.valid_from) e.valid_from = "Bắt buộc";
    if (!form.valid_until) e.valid_until = "Bắt buộc";
    if (form.valid_from && form.valid_until && form.valid_until < form.valid_from)
      e.valid_until = "Phải sau ngày bắt đầu";
    if (!form.total_amount || Number(form.total_amount) <= 0) e.total_amount = "Phải > 0";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("quotations" as any).insert({
        code: form.code.trim(),
        customer_id: form.customer_id,
        lead_id: form.lead_id || null,
        tour_package_id: form.tour_package_id || null,
        valid_from: form.valid_from,
        valid_until: form.valid_until,
        total_amount: Number(form.total_amount),
        currency: form.currency,
        status: form.status,
        notes: form.notes || null,
        created_by: session?.user?.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tạo báo giá thành công");
      qc.invalidateQueries({ queryKey: ["quotations"] });
      setForm(initial);
      onOpenChange(false);
    },
    onError: (e: any) => toast({ title: "Lỗi", description: e.message, variant: "destructive" }),
  });

  const submit = () => {
    if (validate()) mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tạo báo giá mới</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          <div>
            <Label>Mã báo giá *</Label>
            <Input value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="QT-2026-001" />
            {errors.code && <p className="text-xs text-destructive mt-1">{errors.code}</p>}
          </div>

          <div>
            <Label>Khách hàng *</Label>
            <Select value={form.customer_id} onValueChange={(v) => set("customer_id", v)}>
              <SelectTrigger><SelectValue placeholder="Chọn khách hàng" /></SelectTrigger>
              <SelectContent>
                {customers?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.customer_id && <p className="text-xs text-destructive mt-1">{errors.customer_id}</p>}
          </div>

          <div>
            <Label>Gói tour</Label>
            <Select value={form.tour_package_id} onValueChange={(v) => set("tour_package_id", v)}>
              <SelectTrigger><SelectValue placeholder="Chọn gói tour (tuỳ chọn)" /></SelectTrigger>
              <SelectContent>
                {tourPackages?.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>{t.code} - {t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Hiệu lực từ *</Label>
              <Input type="date" value={form.valid_from} onChange={(e) => set("valid_from", e.target.value)} />
              {errors.valid_from && <p className="text-xs text-destructive mt-1">{errors.valid_from}</p>}
            </div>
            <div>
              <Label>Hiệu lực đến *</Label>
              <Input type="date" value={form.valid_until} onChange={(e) => set("valid_until", e.target.value)} />
              {errors.valid_until && <p className="text-xs text-destructive mt-1">{errors.valid_until}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tổng tiền *</Label>
              <Input type="number" value={form.total_amount} onChange={(e) => set("total_amount", e.target.value)} placeholder="0" />
              {errors.total_amount && <p className="text-xs text-destructive mt-1">{errors.total_amount}</p>}
            </div>
            <div>
              <Label>Tiền tệ</Label>
              <Select value={form.currency} onValueChange={(v) => set("currency", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="VND">VND</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Trạng thái</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DRAFT">Nháp</SelectItem>
                <SelectItem value="SENT">Đã gửi</SelectItem>
                <SelectItem value="ACCEPTED">Chấp nhận</SelectItem>
                <SelectItem value="REJECTED">Từ chối</SelectItem>
                <SelectItem value="EXPIRED">Hết hạn</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Ghi chú</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Huỷ</Button>
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Tạo báo giá
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
