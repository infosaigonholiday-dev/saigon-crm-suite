import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableName: "office_expenses" | "marketing_expenses" | "other_expenses";
  categories: { value: string; label: string }[];
  queryKey: string;
}

const formatCurrency = (v: number) => new Intl.NumberFormat("vi-VN").format(v) + "đ";

function getMonthRange(offset: number) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return { start, end, label: `${start.getMonth() + 1}/${start.getFullYear()}` };
}

export function CopyFromLastMonthDialog({ open, onOpenChange, tableName, categories, queryKey }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const lastMonth = getMonthRange(-1);
  const thisMonth = getMonthRange(0);

  const { data: lastMonthExpenses = [], isLoading } = useQuery({
    queryKey: [queryKey, "last-month", lastMonth.label],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tableName)
        .select("id, category, description, amount, expense_date, notes, department_id")
        .gte("expense_date", lastMonth.start.toISOString().split("T")[0])
        .lt("expense_date", lastMonth.end.toISOString().split("T")[0])
        .order("expense_date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const { data: thisMonthCount = 0 } = useQuery({
    queryKey: [queryKey, "this-month-count", thisMonth.label],
    queryFn: async () => {
      const { count, error } = await supabase
        .from(tableName)
        .select("*", { count: "exact", head: true })
        .gte("expense_date", thisMonth.start.toISOString().split("T")[0])
        .lt("expense_date", thisMonth.end.toISOString().split("T")[0]);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: open,
  });

  useEffect(() => {
    if (lastMonthExpenses.length > 0) {
      setSelected(new Set(lastMonthExpenses.map((e: any) => e.id)));
    }
  }, [lastMonthExpenses.length]);

  const toggleAll = () => {
    if (selected.size === lastMonthExpenses.length) setSelected(new Set());
    else setSelected(new Set(lastMonthExpenses.map((e: any) => e.id)));
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const copyMutation = useMutation({
    mutationFn: async () => {
      const items = lastMonthExpenses.filter((e: any) => selected.has(e.id));
      if (items.length === 0) throw new Error("Chưa chọn dòng nào");

      const payload = items.map((e: any) => {
        const oldDate = new Date(e.expense_date);
        const day = oldDate.getDate();
        const newDate = new Date(thisMonth.start.getFullYear(), thisMonth.start.getMonth(), day);
        // clamp nếu tháng mới ngắn hơn
        if (newDate.getMonth() !== thisMonth.start.getMonth()) {
          newDate.setDate(0);
        }
        return {
          category: e.category,
          description: e.description,
          amount: e.amount,
          expense_date: newDate.toISOString().split("T")[0],
          notes: e.notes,
          recorded_by: user!.id,
          department_id: e.department_id,
        };
      });

      const { error } = await supabase.from(tableName).insert(payload);
      if (error) throw error;
      return items.length;
    },
    onSuccess: (count) => {
      toast.success(`Đã copy ${count} chi phí sang tháng ${thisMonth.label}. Vui lòng kiểm tra và sửa số tiền.`);
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      setSelected(new Set());
      onOpenChange(false);
    },
    onError: (e: any) => toast.error("Lỗi copy: " + (e.message ?? "")),
  });

  const catLabel = (c: string) => categories.find((x) => x.value === c)?.label ?? c;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Copy chi phí từ tháng {lastMonth.label} → tháng {thisMonth.label}</DialogTitle>
          <DialogDescription>
            Chọn các khoản muốn copy. Ngày sẽ giữ nguyên (cùng ngày trong tháng mới).
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : lastMonthExpenses.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">Tháng trước không có chi phí nào</p>
        ) : (
          <>
            {thisMonthCount > 0 && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
                <AlertTriangle className="h-4 w-4" />
                Tháng này đã có {thisMonthCount} chi phí. Việc copy sẽ THÊM mới (không ghi đè).
              </div>
            )}

            <div className="border rounded-md max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={selected.size === lastMonthExpenses.length && lastMonthExpenses.length > 0}
                        onCheckedChange={toggleAll}
                      />
                    </TableHead>
                    <TableHead>Phân loại</TableHead>
                    <TableHead>Mô tả</TableHead>
                    <TableHead className="text-right">Số tiền</TableHead>
                    <TableHead>Ngày gốc</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lastMonthExpenses.map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell>
                        <Checkbox checked={selected.has(e.id)} onCheckedChange={() => toggleOne(e.id)} />
                      </TableCell>
                      <TableCell><Badge variant="outline">{catLabel(e.category)}</Badge></TableCell>
                      <TableCell className="max-w-[250px] truncate">{e.description || "—"}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(e.amount))}</TableCell>
                      <TableCell>{e.expense_date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Huỷ</Button>
          <Button
            onClick={() => copyMutation.mutate()}
            disabled={copyMutation.isPending || selected.size === 0}
          >
            {copyMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Copy {selected.size} dòng đã chọn
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
