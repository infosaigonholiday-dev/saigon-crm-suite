import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Check, X, CheckCheck } from "lucide-react";
import { toast } from "sonner";

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

interface Props {
  /** 'hr' = HR_MANAGER duyệt lớp 1 (PENDING_HR → PENDING_REVIEW). 'accountant' = KETOAN duyệt lớp 2 (PENDING_REVIEW → APPROVED). */
  stage?: "hr" | "accountant";
}

export function ApprovalTab({ stage = "accountant" }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const sourceStatus = stage === "hr" ? "PENDING_HR" : "PENDING_REVIEW";
  const nextStatus = stage === "hr" ? "PENDING_REVIEW" : "APPROVED";
  const stageLabel = stage === "hr" ? "HR duyệt lớp 1" : "Kế toán duyệt";
  const queryKeyBase = stage === "hr" ? "approval-hr" : "approval-accountant";

  const [filterCategory, setFilterCategory] = useState("ALL");
  const [filterSubmitter, setFilterSubmitter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [rejectTarget, setRejectTarget] = useState<any>(null);
  const [rejectNote, setRejectNote] = useState("");

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: [queryKeyBase, "list", filterCategory, filterSubmitter, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from("transactions")
        .select("*, profiles!transactions_submitted_by_fkey(full_name)")
        .eq("approval_status", sourceStatus)
        .order("created_at", { ascending: false });

      if (filterCategory !== "ALL") query = query.eq("category", filterCategory);
      if (filterSubmitter !== "ALL") query = query.eq("submitted_by", filterSubmitter);
      if (dateFrom) query = query.gte("transaction_date", dateFrom);
      if (dateTo) query = query.lte("transaction_date", dateTo);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: submitters = [] } = useQuery({
    queryKey: [queryKeyBase, "submitters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("submitted_by, profiles!transactions_submitted_by_fkey(full_name)")
        .eq("approval_status", sourceStatus)
        .not("submitted_by", "is", null);
      if (error) throw error;
      const map = new Map<string, string>();
      (data || []).forEach((r: any) => {
        if (r.submitted_by && r.profiles?.full_name) map.set(r.submitted_by, r.profiles.full_name);
      });
      return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const stamp = new Date().toISOString();
      const patch: any = { approval_status: nextStatus };
      if (stage === "hr") {
        patch.hr_reviewed_by = user?.id;
        patch.hr_reviewed_at = stamp;
      } else {
        patch.reviewed_by = user?.id;
        patch.reviewed_at = stamp;
        patch.accountant_reviewed_by = user?.id;
        patch.accountant_reviewed_at = stamp;
      }
      const updates = ids.map((id) => supabase.from("transactions").update(patch).eq("id", id));
      const results = await Promise.all(updates);
      const err = results.find((r) => r.error);
      if (err?.error) throw err.error;
      // Complete action notifications cho người duyệt hiện tại
      if (user?.id && nextStatus === "APPROVED") {
        const { completeActionsForEntity } = await import("@/lib/notificationActions");
        for (const id of ids) {
          await completeActionsForEntity(user.id, "transaction", id, ["TRANSACTION_APPROVAL"]);
        }
      }
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ["approval-hr"] });
      queryClient.invalidateQueries({ queryKey: ["approval-accountant"] });
      queryClient.invalidateQueries({ queryKey: ["pending-approval-count"] });
      queryClient.invalidateQueries({ queryKey: ["pending-hr-count"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success(stage === "hr" ? `Đã chuyển ${ids.length} phiếu sang Kế toán` : `Đã duyệt ${ids.length} phiếu`);
      setSelectedIds([]);
    },
    onError: (e: any) => toast.error("Lỗi khi duyệt: " + (e?.message ?? "")),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      const stamp = new Date().toISOString();
      const patch: any = {
        approval_status: "REJECTED",
        review_note: note || null,
      };
      if (stage === "hr") {
        patch.hr_reviewed_by = user?.id;
        patch.hr_reviewed_at = stamp;
      } else {
        patch.reviewed_by = user?.id;
        patch.reviewed_at = stamp;
        patch.accountant_reviewed_by = user?.id;
        patch.accountant_reviewed_at = stamp;
      }
      const { error } = await supabase.from("transactions").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval-hr"] });
      queryClient.invalidateQueries({ queryKey: ["approval-accountant"] });
      queryClient.invalidateQueries({ queryKey: ["pending-approval-count"] });
      queryClient.invalidateQueries({ queryKey: ["pending-hr-count"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Đã từ chối phiếu");
      setRejectTarget(null);
      setRejectNote("");
    },
    onError: () => toast.error("Lỗi khi từ chối"),
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const toggleAll = () => {
    if (selectedIds.length === transactions.length) setSelectedIds([]);
    else setSelectedIds(transactions.map((t: any) => t.id));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <Label className="text-xs">Danh mục</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả</SelectItem>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Người nhập</Label>
              <Select value={filterSubmitter} onValueChange={setFilterSubmitter}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả</SelectItem>
                  {submitters.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Từ ngày</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[150px]" />
            </div>
            <div>
              <Label className="text-xs">Đến ngày</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[150px]" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">
            {stageLabel} ({transactions.length})
          </CardTitle>
          {selectedIds.length > 0 && (
            <Button size="sm" onClick={() => approveMutation.mutate(selectedIds)} disabled={approveMutation.isPending}>
              <CheckCheck className="h-4 w-4 mr-1" />
              {stage === "hr" ? `Chuyển ${selectedIds.length} sang KT` : `Duyệt ${selectedIds.length} phiếu`}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : transactions.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Không có chi phí nào chờ duyệt</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox checked={selectedIds.length === transactions.length && transactions.length > 0} onCheckedChange={toggleAll} />
                  </TableHead>
                  <TableHead>Ngày</TableHead>
                  <TableHead>Người nhập</TableHead>
                  <TableHead>Danh mục</TableHead>
                  <TableHead>Nội dung</TableHead>
                  <TableHead className="text-right">Số tiền</TableHead>
                  <TableHead>PTTT</TableHead>
                  <TableHead className="w-[120px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <Checkbox checked={selectedIds.includes(t.id)} onCheckedChange={() => toggleSelect(t.id)} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{t.transaction_date}</TableCell>
                    <TableCell>{(t.profiles as any)?.full_name || "—"}</TableCell>
                    <TableCell><Badge variant="outline">{CATEGORY_LABELS[t.category] || t.category}</Badge></TableCell>
                    <TableCell className="max-w-[250px] truncate">{t.description || "—"}</TableCell>
                    <TableCell className="text-right font-medium text-destructive">-{formatCurrency(Number(t.amount))}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.payment_method === "CASH" ? "Tiền mặt" : "CK"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => approveMutation.mutate([t.id])} disabled={approveMutation.isPending} title={stage === "hr" ? "Chuyển KT" : "Duyệt"}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => { setRejectTarget(t); setRejectNote(""); }} title="Từ chối">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!rejectTarget} onOpenChange={(o) => { if (!o) setRejectTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Từ chối chi phí</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {rejectTarget && (
              <div className="text-sm text-muted-foreground">
                <p><strong>Nội dung:</strong> {rejectTarget.description || "—"}</p>
                <p><strong>Số tiền:</strong> {formatCurrency(Number(rejectTarget.amount))}</p>
              </div>
            )}
            <div>
              <Label>Lý do từ chối *</Label>
              <Textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} rows={3} placeholder="Nhập lý do từ chối..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectTarget(null)}>Huỷ</Button>
              <Button variant="destructive" onClick={() => rejectMutation.mutate({ id: rejectTarget.id, note: rejectNote })}
                disabled={rejectMutation.isPending || !rejectNote.trim()}>
                Từ chối
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
