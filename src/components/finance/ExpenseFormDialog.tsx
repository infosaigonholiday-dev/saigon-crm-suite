import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: any;
  tableName: "office_expenses" | "marketing_expenses" | "other_expenses";
  categories: { value: string; label: string }[];
  queryKey: string;
}

export function ExpenseFormDialog({ open, onOpenChange, expense, tableName, categories, queryKey }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEdit = !!expense;

  const [form, setForm] = useState({
    category: categories[0]?.value || "",
    description: "",
    amount: "",
    expense_date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  useEffect(() => {
    if (expense) {
      setForm({
        category: expense.category || categories[0]?.value || "",
        description: expense.description || "",
        amount: String(expense.amount || ""),
        expense_date: expense.expense_date || new Date().toISOString().split("T")[0],
        notes: expense.notes || "",
      });
    } else {
      setForm({ category: categories[0]?.value || "", description: "", amount: "", expense_date: new Date().toISOString().split("T")[0], notes: "" });
    }
  }, [expense, open]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        category: form.category,
        description: form.description,
        amount: Number(form.amount) || 0,
        expense_date: form.expense_date,
        notes: form.notes,
        recorded_by: user?.id,
      };
      if (isEdit) {
        const { error } = await supabase.from(tableName).update(payload).eq("id", expense.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(tableName).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      toast.success(isEdit ? "Đã cập nhật" : "Đã thêm chi phí");
      onOpenChange(false);
    },
    onError: () => toast.error("Lỗi khi lưu"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{isEdit ? "Sửa chi phí" : "Thêm chi phí"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Phân loại</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{categories.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Mô tả *</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Số tiền *</Label>
              <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <Label>Ngày</Label>
              <Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Ghi chú</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Huỷ</Button>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? "Đang lưu..." : isEdit ? "Cập nhật" : "Thêm"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
