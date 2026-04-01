import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ExpenseFormDialog } from "./ExpenseFormDialog";

const formatCurrency = (v: number) => new Intl.NumberFormat("vi-VN").format(v) + "đ";

interface Props {
  title: string;
  tableName: "office_expenses" | "marketing_expenses" | "other_expenses";
  categories: { value: string; label: string }[];
  queryKey: string;
}

export function ExpenseListTab({ title, tableName, categories, queryKey }: Props) {
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission("finance.edit");
  const canDelete = hasPermission("customers.delete");
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const currentYear = new Date().getFullYear();

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: [queryKey, currentYear],
    queryFn: async () => {
      const startDate = `${currentYear}-01-01`;
      const endDate = `${currentYear + 1}-01-01`;
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .gte("expense_date", startDate)
        .lt("expense_date", endDate)
        .order("expense_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(tableName).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      toast.success("Đã xoá");
    },
  });

  const total = expenses.reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);
  const catLabel = (cat: string) => categories.find((c) => c.value === cat)?.label || cat;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Tổng {title.toLowerCase()} năm {currentYear}</p>
          <p className="text-2xl font-bold">{formatCurrency(total)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
          {canEdit && (
            <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Thêm
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : expenses.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Chưa có dữ liệu</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ngày</TableHead>
                  <TableHead>Phân loại</TableHead>
                  <TableHead>Mô tả</TableHead>
                  <TableHead className="text-right">Số tiền</TableHead>
                  {canEdit && <TableHead className="w-[80px]" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell>{e.expense_date}</TableCell>
                    <TableCell><Badge variant="outline">{catLabel(e.category)}</Badge></TableCell>
                    <TableCell className="max-w-[300px] truncate">{e.description || "—"}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(Number(e.amount))}</TableCell>
                    {canEdit && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setEditing(e); setDialogOpen(true); }}><Pencil className="h-3 w-3" /></Button>
                          {canDelete && (
                            <Button variant="ghost" size="icon" onClick={() => { if (confirm("Xoá?")) deleteMutation.mutate(e.id); }}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ExpenseFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        expense={editing}
        tableName={tableName}
        categories={categories}
        queryKey={queryKey}
      />
    </div>
  );
}
