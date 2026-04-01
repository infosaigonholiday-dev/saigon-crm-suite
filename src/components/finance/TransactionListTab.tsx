import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Pencil, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { TransactionFormDialog } from "./TransactionFormDialog";

const CATEGORY_LABELS: Record<string, string> = {
  TOUR_REVENUE: "Thu tour",
  TOUR_EXPENSE: "Chi tour",
  SALARY: "Lương",
  BHXH: "BHXH",
  OFFICE_RENT: "Tiền nhà/VP",
  UTILITIES: "Điện/Nước/Wifi",
  MARKETING: "Marketing",
  PHONE: "Cước ĐT",
  PARKING: "Gửi xe",
  OTHER: "Khác",
};

const formatCurrency = (v: number) => new Intl.NumberFormat("vi-VN").format(v) + "đ";

export function TransactionListTab() {
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission("finance.edit");
  const canDelete = hasPermission("customers.delete");
  const queryClient = useQueryClient();

  const [filterMonth, setFilterMonth] = useState(String(new Date().getMonth() + 1));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const currentYear = new Date().getFullYear();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions", currentYear, filterMonth],
    queryFn: async () => {
      const m = Number(filterMonth);
      const startDate = `${currentYear}-${String(m).padStart(2, "0")}-01`;
      const endMonth = m === 12 ? `${currentYear + 1}-01-01` : `${currentYear}-${String(m + 1).padStart(2, "0")}-01`;

      const { data, error } = await supabase
        .from("transactions")
        .select("*, bookings(code), vendors(name)")
        .gte("transaction_date", startDate)
        .lt("transaction_date", endMonth)
        .order("transaction_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Đã xoá phiếu");
    },
  });

  const totalIncome = transactions.filter((t: any) => t.type === "INCOME").reduce((s: number, t: any) => s + Number(t.amount), 0);
  const totalExpense = transactions.filter((t: any) => t.type === "EXPENSE").reduce((s: number, t: any) => s + Number(t.amount), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-success" /></div>
          <div><p className="text-sm text-muted-foreground">Tổng thu tháng {filterMonth}</p><p className="text-xl font-bold">{formatCurrency(totalIncome)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center"><TrendingDown className="h-5 w-5 text-destructive" /></div>
          <div><p className="text-sm text-muted-foreground">Tổng chi tháng {filterMonth}</p><p className="text-xl font-bold">{formatCurrency(totalExpense)}</p></div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Sổ quỹ</CardTitle>
          <div className="flex gap-2">
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>Tháng {i + 1}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canEdit && (
              <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Lập phiếu
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : transactions.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Chưa có giao dịch</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ngày</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Nhóm</TableHead>
                  <TableHead>Mã Tour</TableHead>
                  <TableHead>NCC</TableHead>
                  <TableHead>Nội dung</TableHead>
                  <TableHead className="text-right">Số tiền</TableHead>
                  {canEdit && <TableHead className="w-[80px]" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell>{t.transaction_date}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={t.type === "INCOME" ? "bg-success/15 text-success border-success/30" : "bg-destructive/10 text-destructive border-destructive/20"}>
                        {t.type === "INCOME" ? "Thu" : "Chi"}
                      </Badge>
                    </TableCell>
                    <TableCell>{CATEGORY_LABELS[t.category] || t.category}</TableCell>
                    <TableCell>{(t.bookings as any)?.code || "—"}</TableCell>
                    <TableCell>{(t.vendors as any)?.name || "—"}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{t.description || "—"}</TableCell>
                    <TableCell className={`text-right font-medium ${t.type === "INCOME" ? "text-success" : "text-destructive"}`}>
                      {t.type === "INCOME" ? "+" : "-"}{formatCurrency(Number(t.amount))}
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setEditing(t); setDialogOpen(true); }}><Pencil className="h-3 w-3" /></Button>
                          {canDelete && (
                            <Button variant="ghost" size="icon" onClick={() => { if (confirm("Xoá?")) deleteMutation.mutate(t.id); }}>
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

      <TransactionFormDialog open={dialogOpen} onOpenChange={setDialogOpen} transaction={editing} />
    </div>
  );
}
