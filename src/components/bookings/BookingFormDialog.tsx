import { useState, useEffect, useMemo } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface PrefillData {
  tour_code: string;
  destination?: string | null;
  departure_date?: string | null;
  return_date?: string | null;
  price_adl?: number | null;
  price_chd?: number | null;
  price_inf?: number | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefillData?: PrefillData | null;
}

type TourSource = "quote" | "package" | "manual";

const initial = {
  code: "",
  customer_id: "",
  tour_source: "manual" as TourSource,
  quote_id: "",
  tour_package_id: "",
  tour_name_manual: "",
  departure_date: "",
  return_date: "",
  adults: "",
  children: "",
  infants: "",
  price_adl: "",
  price_chd: "",
  price_inf: "",
  total_value: "",
  total_value_overridden: false as unknown as string, // placeholder typing
  deposit_amount: "",
  deposit_due_at: "",
  remaining_due_at: "",
};

export default function BookingFormDialog({ open, onOpenChange, prefillData }: Props) {
  const [form, setForm] = useState(initial);
  const [totalOverridden, setTotalOverridden] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { user } = useAuth();
  const qc = useQueryClient();

  // Reset khi dialog đóng
  useEffect(() => {
    if (!open) {
      setForm(initial);
      setTotalOverridden(false);
      setErrors({});
    }
  }, [open]);

  // Pre-fill khi mở dialog từ LKH Tour 2026
  useEffect(() => {
    if (open && prefillData) {
      setForm((p) => ({
        ...p,
        code: p.code || `BK-${prefillData.tour_code}`,
        tour_source: "manual",
        tour_name_manual: p.tour_name_manual || (prefillData.destination ? `${prefillData.destination} (${prefillData.tour_code})` : prefillData.tour_code),
        departure_date: p.departure_date || prefillData.departure_date || "",
        return_date: p.return_date || prefillData.return_date || "",
        price_adl: p.price_adl || (prefillData.price_adl ? String(prefillData.price_adl) : ""),
        price_chd: p.price_chd || (prefillData.price_chd ? String(prefillData.price_chd) : ""),
        price_inf: p.price_inf || (prefillData.price_inf ? String(prefillData.price_inf) : ""),
      }));
    }
  }, [open, prefillData]);

  // Customers
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

  // Quotations: lọc theo customer nếu có chọn
  const { data: quotations = [] } = useQuery({
    queryKey: ["quotations-select", form.customer_id],
    queryFn: async () => {
      let q = supabase
        .from("quotations")
        .select("id, code, tour_package_id, tour_packages(name, code, base_price, duration_days, duration_nights), valid_from, valid_until, total_amount")
        .order("created_at", { ascending: false })
        .limit(50);
      if (form.customer_id) q = q.eq("customer_id", form.customer_id);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: open && form.tour_source === "quote",
  });

  // Tour packages
  const { data: tourPackages = [] } = useQuery({
    queryKey: ["tour-packages-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tour_packages")
        .select("id, name, code, base_price, duration_days, duration_nights")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: open && form.tour_source === "package",
  });

  const set = (k: keyof typeof initial, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: "" }));
  };

  // Auto-fill khi chọn báo giá
  const handleQuoteChange = (quoteId: string) => {
    const q: any = quotations.find((x: any) => x.id === quoteId);
    if (!q) {
      setForm((p) => ({ ...p, quote_id: quoteId }));
      return;
    }
    const tp = q.tour_packages || {};
    setForm((p) => ({
      ...p,
      quote_id: quoteId,
      tour_name_manual: tp.name || p.tour_name_manual,
      departure_date: q.valid_from || p.departure_date,
      return_date: q.valid_until || p.return_date,
      price_adl: tp.base_price ? String(tp.base_price) : p.price_adl,
      total_value: q.total_amount ? String(q.total_amount) : p.total_value,
    }));
    if (q.total_amount) setTotalOverridden(true);
    setErrors((p) => ({ ...p, quote_id: "" }));
  };

  // Auto-fill khi chọn gói tour
  const handlePackageChange = (pkgId: string) => {
    const p: any = tourPackages.find((x: any) => x.id === pkgId);
    setForm((prev) => ({
      ...prev,
      tour_package_id: pkgId,
      tour_name_manual: p?.name || prev.tour_name_manual,
      price_adl: p?.base_price ? String(p.base_price) : prev.price_adl,
    }));
    setErrors((prev) => ({ ...prev, tour_package_id: "" }));
  };

  // Auto-tính pax_total
  const paxTotal = useMemo(() => {
    const a = Number(form.adults || 0);
    const c = Number(form.children || 0);
    const i = Number(form.infants || 0);
    return a + c + i;
  }, [form.adults, form.children, form.infants]);

  // Auto-tính total_value theo công thức
  const computedTotal = useMemo(() => {
    const a = Number(form.adults || 0) * Number(form.price_adl || 0);
    const c = Number(form.children || 0) * Number(form.price_chd || 0);
    const i = Number(form.infants || 0) * Number(form.price_inf || 0);
    return a + c + i;
  }, [form.adults, form.children, form.infants, form.price_adl, form.price_chd, form.price_inf]);

  // Đồng bộ total_value khi chưa bị user/báo giá override hoặc khi computed > 0
  useEffect(() => {
    if (totalOverridden) return;
    if (computedTotal > 0) {
      setForm((p) => ({ ...p, total_value: String(computedTotal) }));
    }
  }, [computedTotal, totalOverridden]);

  // Validation tài chính
  const total = Number(form.total_value || 0);
  const deposit = Number(form.deposit_amount || 0);
  const totalNegative = form.total_value !== "" && total < 0;
  const depositNegative = form.deposit_amount !== "" && deposit < 0;
  const depositOver = deposit > 0 && deposit > total;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.code.trim()) e.code = "Bắt buộc";
    if (!form.customer_id) e.customer_id = "Bắt buộc";
    if (form.tour_source === "quote" && !form.quote_id) e.quote_id = "Vui lòng chọn báo giá";
    if (form.tour_source === "package" && !form.tour_package_id) e.tour_package_id = "Vui lòng chọn gói tour";
    if (form.tour_source === "manual" && !form.tour_name_manual.trim()) e.tour_name_manual = "Bắt buộc";
    if (paxTotal <= 0) e.pax = "Số khách phải lớn hơn 0";
    if (totalNegative) e.total_value = "Tổng giá trị không được âm";
    if (depositNegative) e.deposit_amount = "Tiền cọc không được âm";
    if (depositOver) e.deposit_amount = "Đặt cọc không được lớn hơn tổng tiền";
    if (form.departure_date && form.return_date && form.return_date < form.departure_date) {
      e.return_date = "Ngày về phải sau ngày đi";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        code: form.code.trim(),
        customer_id: form.customer_id,
        sale_id: user?.id ?? null,
        pax_total: paxTotal,
        pax_details: {
          adults: Number(form.adults || 0),
          children: Number(form.children || 0),
          infants: Number(form.infants || 0),
          price_adl: Number(form.price_adl || 0),
          price_chd: Number(form.price_chd || 0),
          price_inf: Number(form.price_inf || 0),
          ...(prefillData?.tour_code ? { tour_code: prefillData.tour_code } : {}),
        },
        total_value: total,
        deposit_amount: deposit,
        deposit_due_at: form.deposit_due_at || null,
        remaining_due_at: form.remaining_due_at || null,
        departure_date: form.departure_date || null,
        return_date: form.return_date || null,
        status: "PENDING",
        tour_name_manual: form.tour_name_manual.trim() || null,
      };

      if (form.tour_source === "quote") payload.quote_id = form.quote_id;
      if (form.tour_source === "package") payload.tour_package_id = form.tour_package_id;

      const { error } = await supabase.from("bookings").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Thành công", { description: "Đã tạo booking mới" });
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

  const fmtVnd = (n: number) => n.toLocaleString("vi-VN") + "đ";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tạo booking</DialogTitle>
        </DialogHeader>
        {prefillData && (
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
            <div className="font-semibold mb-1">Tạo từ LKH Tour 2026</div>
            <div>
              <span className="font-mono">{prefillData.tour_code}</span>
              {prefillData.destination && <> • {prefillData.destination}</>}
              {prefillData.departure_date && <> • Đi {prefillData.departure_date}</>}
              {prefillData.return_date && <> • Về {prefillData.return_date}</>}
              {prefillData.price_adl ? <> • NL {prefillData.price_adl.toLocaleString("vi-VN")}đ</> : null}
            </div>
          </div>
        )}

        <div className="grid gap-4 py-2">
          {/* Mã + Khách hàng */}
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

          {/* Nguồn tour */}
          <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
            <Label className="text-sm font-semibold">Nguồn tour <span className="text-destructive">*</span></Label>
            <RadioGroup
              value={form.tour_source}
              onValueChange={(v) => set("tour_source", v as TourSource)}
              className="grid grid-cols-3 gap-2"
            >
              <label className="flex items-center gap-2 cursor-pointer rounded border border-input bg-background px-3 py-2 text-sm">
                <RadioGroupItem value="quote" id="src-quote" />
                <span>Từ báo giá</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer rounded border border-input bg-background px-3 py-2 text-sm">
                <RadioGroupItem value="package" id="src-package" />
                <span>Từ gói tour</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer rounded border border-input bg-background px-3 py-2 text-sm">
                <RadioGroupItem value="manual" id="src-manual" />
                <span>Nhập tay</span>
              </label>
            </RadioGroup>

            {form.tour_source === "quote" && (
              <div className="space-y-1.5">
                <Label>Báo giá</Label>
                <Select value={form.quote_id} onValueChange={handleQuoteChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={
                      form.customer_id
                        ? (quotations.length === 0 ? "Khách hàng này chưa có báo giá" : "Chọn báo giá")
                        : "Chọn khách hàng trước"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {quotations.map((q: any) => (
                      <SelectItem key={q.id} value={q.id}>
                        {q.code} {q.tour_packages?.name ? `— ${q.tour_packages.name}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.quote_id && <p className="text-xs text-destructive">{errors.quote_id}</p>}
              </div>
            )}

            {form.tour_source === "package" && (
              <div className="space-y-1.5">
                <Label>Gói tour</Label>
                <Select value={form.tour_package_id} onValueChange={handlePackageChange}>
                  <SelectTrigger><SelectValue placeholder="Chọn gói tour" /></SelectTrigger>
                  <SelectContent>
                    {tourPackages.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.code ? `${p.code} — ` : ""}{p.name}
                        {p.duration_days ? ` (${p.duration_days}N${p.duration_nights ?? p.duration_days - 1}Đ)` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.tour_package_id && <p className="text-xs text-destructive">{errors.tour_package_id}</p>}
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Tên tour hiển thị {form.tour_source === "manual" && <span className="text-destructive">*</span>}</Label>
              <Input
                value={form.tour_name_manual}
                onChange={(e) => set("tour_name_manual", e.target.value)}
                placeholder="VD: NHẬT BẢN 6N5Đ · OSAKA – KYOTO – TOKYO"
              />
              <p className="text-xs text-muted-foreground">
                Tự điền khi chọn báo giá/gói tour. Có thể sửa lại để hiển thị trên phiếu xác nhận.
              </p>
              {errors.tour_name_manual && <p className="text-xs text-destructive">{errors.tour_name_manual}</p>}
            </div>

            {/* Ngày đi / Ngày về */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Ngày đi</Label>
                <Input type="date" value={form.departure_date} onChange={(e) => set("departure_date", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Ngày về</Label>
                <Input type="date" value={form.return_date} onChange={(e) => set("return_date", e.target.value)} />
                {errors.return_date && <p className="text-xs text-destructive">{errors.return_date}</p>}
              </div>
            </div>
          </div>

          {/* Bảng giá theo loại khách */}
          <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
            <Label className="text-sm font-semibold">Đơn giá theo loại khách</Label>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Giá NL</Label>
                <Input type="number" min="0" value={form.price_adl} onChange={(e) => { set("price_adl", e.target.value); setTotalOverridden(false); }} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Giá TE</Label>
                <Input type="number" min="0" value={form.price_chd} onChange={(e) => { set("price_chd", e.target.value); setTotalOverridden(false); }} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Giá EB</Label>
                <Input type="number" min="0" value={form.price_inf} onChange={(e) => { set("price_inf", e.target.value); setTotalOverridden(false); }} placeholder="0" />
              </div>
            </div>
          </div>

          {/* Số khách */}
          <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
            <Label className="text-sm font-semibold">Số khách</Label>
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Người lớn (NL)</Label>
                <Input type="number" min="0" value={form.adults} onChange={(e) => { set("adults", e.target.value); setTotalOverridden(false); }} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Trẻ em (TE)</Label>
                <Input type="number" min="0" value={form.children} onChange={(e) => { set("children", e.target.value); setTotalOverridden(false); }} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Em bé (EB)</Label>
                <Input type="number" min="0" value={form.infants} onChange={(e) => { set("infants", e.target.value); setTotalOverridden(false); }} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Tổng (auto)</Label>
                <Input type="number" value={paxTotal} readOnly className="bg-muted font-semibold" />
              </div>
            </div>
            {computedTotal > 0 && (
              <p className="text-xs text-muted-foreground">
                Công thức: {form.adults || 0}×{Number(form.price_adl||0).toLocaleString("vi-VN")} + {form.children || 0}×{Number(form.price_chd||0).toLocaleString("vi-VN")} + {form.infants || 0}×{Number(form.price_inf||0).toLocaleString("vi-VN")} = <strong>{fmtVnd(computedTotal)}</strong>
              </p>
            )}
            {errors.pax && <p className="text-xs text-destructive">{errors.pax}</p>}
          </div>

          {/* Tài chính */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tổng giá trị {!totalOverridden && computedTotal > 0 && <span className="text-xs text-muted-foreground font-normal">(auto)</span>}</Label>
              <Input
                type="number"
                min="0"
                value={form.total_value}
                onChange={(e) => { set("total_value", e.target.value); setTotalOverridden(true); }}
                className={totalNegative ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {totalOverridden && computedTotal > 0 && Number(form.total_value || 0) !== computedTotal && (
                <p className="text-xs text-muted-foreground">
                  Đã sửa tay. Auto = {fmtVnd(computedTotal)}.{" "}
                  <button type="button" className="underline text-primary" onClick={() => { setTotalOverridden(false); set("total_value", String(computedTotal)); }}>
                    Khôi phục
                  </button>
                </p>
              )}
              {errors.total_value && <p className="text-xs text-destructive">{errors.total_value}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Tiền cọc</Label>
              <Input
                type="number"
                min="0"
                value={form.deposit_amount}
                onChange={(e) => set("deposit_amount", e.target.value)}
                className={(depositOver || depositNegative) ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {depositOver && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>Đặt cọc ({deposit.toLocaleString("vi-VN")}đ) không được lớn hơn tổng tiền ({total.toLocaleString("vi-VN")}đ).</span>
                </div>
              )}
              {!depositOver && errors.deposit_amount && <p className="text-xs text-destructive">{errors.deposit_amount}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
          <Button onClick={handleSubmit} disabled={mutation.isPending || depositOver || depositNegative || totalNegative || paxTotal <= 0}>
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
