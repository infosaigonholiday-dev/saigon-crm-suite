import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Plus, Pencil, Trash2, Loader2, Sparkles, Repeat } from "lucide-react";
import { toast } from "sonner";

interface Props {
  tableName: "office_expenses" | "marketing_expenses" | "other_expenses";
  categories: { value: string; label: string }[];
  queryKey: string;
}

const RECURRENCE_LABEL: Record<string, string> = {
  monthly: "Hàng tháng",
  quarterly: "Hàng quý",
  yearly: "Hàng năm",
};

const formatCurrency = (v: number) => new Intl.NumberFormat("vi-VN").format(v) + "đ";

function getCurrentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function RecurringExpensesSection({ tableName, categories, queryKey }: Props) {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission("finance", "edit");
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["recurring_expenses", tableName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recurring_expenses")
        .select("*")
        .eq("expense_table", tableName)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const currentMonth = getCurrentMonthKey();
  const pendingItems = items.filter(
    (i: any) => i.is_active && i.last_generated_month !== currentMonth
  );

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: any) => {
      const { error } = await supabase.from("recurring_expenses").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["recurring_expenses", tableName] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recurring_expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring_expenses", tableName] });
      toast.success("Đã xoá");
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (pendingItems.length === 0) throw new Error("Không có khoản nào cần tạo");
      const today = new Date();
      const payload = pendingItems.map((it: any) => {
        const day = Math.min(it.day_of_month ?? 1, 28);
        const date = new Date(today.getFullYear(), today.getMonth(), day);
        return {
          category: it.category,
          description: it.description,
          amount: it.amount,
          expense_date: date.toISOString().split("T")[0],
          notes: `[Định kỳ] ${it.notes ?? ""}`.trim(),
          recorded_by: user!.id,
          department_id: it.department_id,
        };
      });
      const { error } = await supabase.from(tableName).insert(payload);
      if (error) throw error;

      // Update last_generated_month
      const ids = pendingItems.map((it: any) => it.id);
      const { error: updErr } = await supabase
        .from("recurring_expenses")
        .update({ last_generated_month: currentMonth })
        .in("id", ids);
      if (updErr) throw updErr;

      return pendingItems.length;
    },
    onSuccess: (count) => {
      toast.success(`Đã tạo ${count} chi phí định kỳ cho tháng này`);
      queryClient.invalidateQueries({ queryKey: ["recurring_expenses", tableName] });
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      setGenerateOpen(false);
    },
    onError: (e: any) => toast.error("Lỗi: " + (e.message ?? "")),
  });

  const catLabel = (c: string) => categories.find((x) => x.value === c)?.label ?? c;

  return (
    <Card>
      <CardContent className="p-0">
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition">
              <div className="flex items-center gap-2">
                <Repeat className="h-4 w-4 text-primary" />
                <span className="font-medium">Chi phí định kỳ</span>
                <Badge variant="outline">{items.length} khoản</Badge>
                {pendingItems.length > 0 && (
                  <Badge className="bg-blue-600 text-white">{pendingItems.length} chờ tạo tháng này</Badge>
                )}
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-4 pt-0 space-y-3">
              {canManage && (
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => { setEditing(null); setDialogOpen(true); }}>
                    <Plus className="h-4 w-4 mr-1" /> Thêm định kỳ
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setGenerateOpen(true)}
                    disabled={pendingItems.length === 0}
                  >
                    <Sparkles className="h-4 w-4 mr-1" /> Tạo chi phí tháng này ({pendingItems.length})
                  </Button>
                </div>
              )}

              {isLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : items.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Chưa có khoản chi phí định kỳ nào</p>
              ) : (
                <div className="space-y-1.5">
                  {items.map((it: any) => (
                    <div key={it.id} className="flex items-center gap-3 p-2 border rounded-md text-sm hover:bg-muted/30">
                      <Badge variant="outline" className="shrink-0">{catLabel(it.category)}</Badge>
                      <span className="flex-1 truncate">{it.description}</span>
                      <span className="font-medium shrink-0">{formatCurrency(Number(it.amount))}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {RECURRENCE_LABEL[it.recurrence]} • Ngày {it.day_of_month}
                      </span>
                      {it.last_generated_month === currentMonth && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs shrink-0">
                          Đã tạo T{currentMonth.split("-")[1]}
                        </Badge>
                      )}
                      {canManage && (
                        <>
                          <Switch
                            checked={it.is_active}
                            onCheckedChange={(v) => toggleActiveMutation.mutate({ id: it.id, is_active: v })}
                          />
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(it); setDialogOpen(true); }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { if (confirm("Xoá khoản định kỳ này?")) deleteMutation.mutate(it.id); }}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>

      <RecurringFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        tableName={tableName}
        categories={categories}
      />

      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo chi phí định kỳ tháng này</DialogTitle>
            <DialogDescription>
              Sẽ tạo {pendingItems.length} chi phí cho tháng {currentMonth.split("-")[1]}/{currentMonth.split("-")[0]}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {pendingItems.map((it: any) => (
              <div key={it.id} className="flex justify-between text-sm p-2 border rounded">
                <span>{catLabel(it.category)} — {it.description}</span>
                <span className="font-medium">{formatCurrency(Number(it.amount))}</span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateOpen(false)}>Huỷ</Button>
            <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
              {generateMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Xác nhận tạo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function RecurringFormDialog({ open, onOpenChange, editing, tableName, categories }: any) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEdit = !!editing;

  const [form, setForm] = useState<any>({
    category: categories[0]?.value || "",
    description: "",
    amount: "",
    day_of_month: 1,
    recurrence: "monthly",
    is_active: true,
    notes: "",
  });

  // sync khi mở
  useState(() => {
    if (editing) setForm({ ...editing, amount: String(editing.amount ?? "") });
  });

  // reset
  const reset = () => setForm({
    category: categories[0]?.value || "",
    description: "",
    amount: "",
    day_of_month: 1,
    recurrence: "monthly",
    is_active: true,
    notes: "",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.description.trim()) throw new Error("Thiếu mô tả");
      if (!Number(form.amount) || Number(form.amount) <= 0) throw new Error("Số tiền phải > 0");

      const { data: prof } = await supabase
        .from("profiles")
        .select("department_id")
        .eq("id", user!.id)
        .single();

      const payload = {
        category: form.category,
        description: form.description,
        amount: Number(form.amount),
        day_of_month: Number(form.day_of_month),
        recurrence: form.recurrence,
        is_active: form.is_active,
        notes: form.notes || null,
        expense_table: tableName,
        created_by: user!.id,
        department_id: prof?.department_id ?? null,
      };

      if (isEdit) {
        const { error } = await supabase.from("recurring_expenses").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("recurring_expenses").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Đã cập nhật" : "Đã thêm khoản định kỳ");
      queryClient.invalidateQueries({ queryKey: ["recurring_expenses", tableName] });
      onOpenChange(false);
      reset();
    },
    onError: (e: any) => toast.error("Lỗi: " + (e.message ?? "")),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Sửa khoản định kỳ" : "Thêm chi phí định kỳ"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Phân loại</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map((c: any) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Mô tả *</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Số tiền *</Label>
              <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <Label>Ngày trong tháng (1-28)</Label>
              <Input type="number" min={1} max={28} value={form.day_of_month} onChange={(e) => setForm({ ...form, day_of_month: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Chu kỳ</Label>
            <Select value={form.recurrence} onValueChange={(v) => setForm({ ...form, recurrence: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Hàng tháng</SelectItem>
                <SelectItem value="quarterly">Hàng quý</SelectItem>
                <SelectItem value="yearly">Hàng năm</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            <Label>Đang kích hoạt</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Huỷ</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {isEdit ? "Cập nhật" : "Thêm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
