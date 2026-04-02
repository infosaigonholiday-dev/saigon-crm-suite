import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Pencil, Trash2, TrendingUp, TrendingDown, Check, X } from "lucide-react";
import { toast } from "sonner";
import { TransactionFormDialog } from "./TransactionFormDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

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

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Nháp", className: "bg-muted text-muted-foreground" },
  PENDING_REVIEW: { label: "Chờ duyệt", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  APPROVED: { label: "Đã duyệt", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  REJECTED: { label: "Từ chối", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
};

const formatCurrency = (v: number) => new Intl.NumberFormat("vi-VN").format(v) + "đ";

interface Props {
  submitterOnly?: boolean;
}

export function TransactionListTab({ submitterOnly }: Props) {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission("finance", "edit");
  const canDelete = hasPermission("customers", "delete");
  const canReview = hasPermission("finance", "edit");
  const queryClient = useQueryClient();

  const [filterMonth, setFilterMonth] = useState(String(new Date().getMonth() + 1));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [reviewTarget, setReviewTarget] = useState<any>(null);
  const [reviewNote, setReviewNote] = useState("");

  const currentYear = new Date().getFullYear();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions", currentYear, filterMonth, submitterOnly ? "mine" : "all"],
    queryFn: async () => {
      const m = Number(filterMonth);
      const startDate = `${currentYear}-${String(m).padStart(2, "0")}-01`;
      const endMonth = m === 12 ? `${currentYear + 1}-01-01` : `${currentYear}-${String(m + 1).padStart(2, "0")}-01`;

      let query = supabase
        .from("transactions")
        .select("*, bookings(code), vendors(name)")
        .gte("transaction_date", startDate)
        .lt("transaction_date", endMonth)
        .order("transaction_date", { ascending: false });

      if (submitterOnly && user) {
        query = query.eq("submitted_by", user.id);
      }

      const { data, error } = await query;
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

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("transactions").update({
        approval_status: status,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        review_note: reviewNote || null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success(vars.status === "APPROVED" ? "Đã duyệt" : "Đã từ chối");
      setReviewTarget(null);
      setReviewNote("");
    },
  });

  const totalIncome = transactions.filter((t: any) => t.type === "INCOME").reduce((s: number, t: any) => s + Number(t.amount), 0);
  const totalExpense = transactions.filter((t: any) => t.type === "EXPENSE").reduce((s: number, t: any) => s + Number(t.amount), 0);

  const canEditRow = (t: any) => {
    if (canEdit) return true;
    if (submitterOnly && t.submitted_by === user?.id && ["DRAFT", "REJECTED"].includes(t.approval_status)) return true;
    return false;
  };

  return (
    <div className="space-y-4">
      {!submitterOnly && (
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
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">{submitterOnly ? "Chi phí tôi đã nhập" : "Sổ quỹ"}</CardTitle>
          <div className="flex gap-2">
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>Tháng {i + 1}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(canEdit || submitterOnly) && (
              <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" /> {submitterOnly ? "Nhập chi phí" : "Lập phiếu"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : transactions.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">{submitterOnly ? "Chưa có chi phí nào" : "Chưa có giao dịch"}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ngày</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Nhóm</TableHead>
                  {!submitterOnly && <TableHead>Mã Tour</TableHead>}
                  {!submitterOnly && <TableHead>NCC</TableHead>}
                  <TableHead>Nội dung</TableHead>
                  <TableHead className="text-right">Số tiền</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((t: any) => {
                  const statusCfg = STATUS_CONFIG[t.approval_status] || STATUS_CONFIG.DRAFT;
                  return (
                    <TableRow key={t.id}>
                      <TableCell>{t.transaction_date}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={t.type === "INCOME" ? "bg-success/15 text-success border-success/30" : "bg-destructive/10 text-destructive border-destructive/20"}>
                          {t.type === "INCOME" ? "Thu" : "Chi"}
                        </Badge>
                      </TableCell>
                      <TableCell>{CATEGORY_LABELS[t.category] || t.category}</TableCell>
                      {!submitterOnly && <TableCell>{(t.bookings as any)?.code || "—"}</TableCell>}
                      {!submitterOnly && <TableCell>{(t.vendors as any)?.name || "—"}</TableCell>}
                      <TableCell className="max-w-[200px] truncate">{t.description || "—"}</TableCell>
                      <TableCell className={`text-right font-medium ${t.type === "INCOME" ? "text-success" : "text-destructive"}`}>
                        {t.type === "INCOME" ? "+" : "-"}{formatCurrency(Number(t.amount))}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusCfg.className}>
                          {statusCfg.label}
                        </Badge>
                        {t.approval_status === "REJECTED" && t.review_note && (
                          <p className="text-xs text-destructive mt-1 max-w-[200px]" title={t.review_note}>
                            Lý do: {t.review_note}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {canEditRow(t) && (
                            <Button variant="ghost" size="icon" onClick={() => { setEditing(t); setDialogOpen(true); }}><Pencil className="h-3 w-3" /></Button>
                          )}
                          {canReview && t.approval_status === "PENDING_REVIEW" && (
                            <>
                              <Button variant="ghost" size="icon" className="text-green-600" onClick={() => reviewMutation.mutate({ id: t.id, status: "APPROVED" })}>
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-red-600" onClick={() => { setReviewTarget(t); setReviewNote(""); }}>
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                          {canDelete && (
                            <Button variant="ghost" size="icon" onClick={() => { if (confirm("Xoá?")) deleteMutation.mutate(t.id); }}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <TransactionFormDialog open={dialogOpen} onOpenChange={setDialogOpen} transaction={editing} />

      {/* Reject dialog */}
      <Dialog open={!!reviewTarget} onOpenChange={(o) => { if (!o) setReviewTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Từ chối phiếu chi</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Lý do từ chối</Label>
              <Textarea value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} rows={3} placeholder="Nhập lý do..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReviewTarget(null)}>Huỷ</Button>
              <Button variant="destructive" onClick={() => reviewMutation.mutate({ id: reviewTarget.id, status: "REJECTED" })} disabled={reviewMutation.isPending}>
                Từ chối
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
