import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "TOUR_REVENUE", label: "Thu tour", type: "INCOME" },
  { value: "TOUR_EXPENSE", label: "Chi tour", type: "EXPENSE" },
  { value: "SALARY", label: "Lương", type: "EXPENSE" },
  { value: "BHXH", label: "BHXH", type: "EXPENSE" },
  { value: "OFFICE_RENT", label: "Tiền nhà/VP", type: "EXPENSE" },
  { value: "UTILITIES", label: "Điện/Nước/Wifi", type: "EXPENSE" },
  { value: "MARKETING", label: "Marketing", type: "EXPENSE" },
  { value: "PHONE", label: "Cước ĐT", type: "EXPENSE" },
  { value: "PARKING", label: "Gửi xe", type: "EXPENSE" },
  { value: "OTHER", label: "Khác", type: "EXPENSE" },
];

const TOUR_CATEGORIES = ["TOUR_REVENUE", "TOUR_EXPENSE"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: any;
}

export function TransactionFormDialog({ open, onOpenChange, transaction }: Props) {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();
  const isEdit = !!transaction;
  const isSubmitter = hasPermission("finance.submit") && !hasPermission("finance.view");

  const [form, setForm] = useState({
    transaction_date: new Date().toISOString().split("T")[0],
    type: "EXPENSE" as string,
    category: "OTHER",
    amount: "",
    booking_id: "",
    vendor_id: "",
    description: "",
    payment_method: "BANK_TRANSFER",
    reference_code: "",
    notes: "",
  });

  useEffect(() => {
    if (transaction) {
      setForm({
        transaction_date: transaction.transaction_date || new Date().toISOString().split("T")[0],
        type: transaction.type || "EXPENSE",
        category: transaction.category || "OTHER",
        amount: String(transaction.amount || ""),
        booking_id: transaction.booking_id || "",
        vendor_id: transaction.vendor_id || "",
        description: transaction.description || "",
        payment_method: transaction.payment_method || "BANK_TRANSFER",
        reference_code: transaction.reference_code || "",
        notes: transaction.notes || "",
      });
    } else {
      setForm({
        transaction_date: new Date().toISOString().split("T")[0],
        type: "EXPENSE",
        category: "OTHER",
        amount: "",
        booking_id: "",
        vendor_id: "",
        description: "",
        payment_method: "BANK_TRANSFER",
        reference_code: "",
        notes: "",
      });
    }
  }, [transaction, open]);

  const isTourRelated = TOUR_CATEGORIES.includes(form.category);

  const { data: bookings = [] } = useQuery({
    queryKey: ["bookings-dropdown"],
    queryFn: async () => {
      const { data } = await supabase.from("bookings").select("id, code").order("created_at", { ascending: false }).limit(100);
      return data || [];
    },
    enabled: open,
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors-dropdown"],
    queryFn: async () => {
      const { data } = await supabase.from("vendors").select("id, name").order("name");
      return data || [];
    },
    enabled: open && form.category === "TOUR_EXPENSE",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        transaction_date: form.transaction_date,
        type: form.type,
        category: form.category,
        amount: Number(form.amount) || 0,
        booking_id: isTourRelated && form.booking_id ? form.booking_id : null,
        vendor_id: form.category === "TOUR_EXPENSE" && form.vendor_id ? form.vendor_id : null,
        description: form.description,
        payment_method: form.payment_method,
        reference_code: form.reference_code,
        notes: form.notes,
        recorded_by: user?.id,
      };

      if (isSubmitter) {
        payload.submitted_by = user?.id;
        payload.approval_status = "PENDING_REVIEW";
      } else if (isEdit && transaction?.approval_status === "REJECTED" && transaction?.submitted_by === user?.id) {
        // Resubmit rejected record
        payload.approval_status = "PENDING_REVIEW";
      } else {
        payload.approval_status = "DRAFT";
      }

      if (isEdit) {
        const { error } = await supabase.from("transactions").update(payload).eq("id", transaction.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("transactions").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["pending-approval-count"] });
      queryClient.invalidateQueries({ queryKey: ["approval-transactions"] });
      const isResubmit = isEdit && transaction?.approval_status === "REJECTED";
      toast.success(isResubmit ? "Đã gửi lại chờ duyệt" : isSubmitter ? "Đã gửi chi phí chờ duyệt" : isEdit ? "Đã cập nhật phiếu" : "Đã tạo phiếu");
      onOpenChange(false);
    },
    onError: () => toast.error("Lỗi khi lưu"),
  });

  const handleCategoryChange = (cat: string) => {
    const catDef = CATEGORIES.find((c) => c.value === cat);
    setForm({ ...form, category: cat, type: catDef?.type || "EXPENSE" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isSubmitter ? "Nhập chi phí" : isEdit ? "Sửa phiếu" : "Lập phiếu Thu/Chi"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nhóm chi phí *</Label>
              <Select value={form.category} onValueChange={handleCategoryChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Loại</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCOME">Thu</SelectItem>
                  <SelectItem value="EXPENSE">Chi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ngày giao dịch *</Label>
              <Input type="date" value={form.transaction_date} onChange={(e) => setForm({ ...form, transaction_date: e.target.value })} />
            </div>
            <div>
              <Label>Số tiền *</Label>
              <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>

            {isTourRelated && (
              <div className="col-span-2">
                <Label>Mã Tour</Label>
                <Select value={form.booking_id} onValueChange={(v) => setForm({ ...form, booking_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Chọn tour" /></SelectTrigger>
                  <SelectContent>{bookings.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.code}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}

            {form.category === "TOUR_EXPENSE" && (
              <div className="col-span-2">
                <Label>NCC</Label>
                <Select value={form.vendor_id} onValueChange={(v) => setForm({ ...form, vendor_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Chọn NCC" /></SelectTrigger>
                  <SelectContent>{vendors.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}

            <div className="col-span-2">
              <Label>Nội dung</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <Label>Phương thức TT</Label>
              <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BANK_TRANSFER">Chuyển khoản</SelectItem>
                  <SelectItem value="CASH">Tiền mặt</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Mã chứng từ</Label>
              <Input value={form.reference_code} onChange={(e) => setForm({ ...form, reference_code: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Ghi chú</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Huỷ</Button>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? "Đang lưu..." : isSubmitter ? "Gửi duyệt" : isEdit ? "Cập nhật" : "Tạo phiếu"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
