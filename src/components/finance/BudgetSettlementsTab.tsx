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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Eye, AlertTriangle, Printer } from "lucide-react";
import { toast } from "sonner";
import InternalNotes from "@/components/shared/InternalNotes";
import { buildSettlementHtml, openPrintWindow } from "@/lib/financePrintTemplates";

const formatCurrency = (v: number) => new Intl.NumberFormat("vi-VN").format(v) + "đ";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: "Nháp", className: "bg-muted text-muted-foreground" },
  pending_accountant: { label: "Chờ KT duyệt", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  accountant_approved: { label: "KT đã duyệt", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  pending_ceo: { label: "Chờ CEO duyệt", className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
  ceo_approved: { label: "CEO đã duyệt", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  closed: { label: "Đã đóng", className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
};

const ITEM_CATEGORIES = [
  { value: "XE", label: "Xe" },
  { value: "KS", label: "Khách sạn" },
  { value: "AN_UONG", label: "Ăn uống" },
  { value: "VE", label: "Vé tham quan" },
  { value: "HDV", label: "Hướng dẫn viên" },
  { value: "BAO_HIEM", label: "Bảo hiểm" },
  { value: "PHAT_SINH", label: "Phát sinh" },
];

const getCategoryLabel = (v: string) => ITEM_CATEGORIES.find((c) => c.value === v)?.label || v;

interface SettlementItemForm {
  category: string;
  description: string;
  estimated_amount: number;
  actual_amount: number;
  receipt_url: string;
  sort_order: number;
}

export function BudgetSettlementsTab() {
  const { user, userRole } = useAuth();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission("finance", "edit");
  const isKetoan = userRole === "KETOAN" || userRole === "ADMIN";
  const isCeo = userRole === "ADMIN";
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState<any>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewAction, setReviewAction] = useState<string>("");

  // Create form state
  const [formEstimateId, setFormEstimateId] = useState("");
  const [formItems, setFormItems] = useState<SettlementItemForm[]>([]);

  // Fetch settlements
  const { data: settlements = [], isLoading } = useQuery({
    queryKey: ["budget-settlements", statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("budget_settlements")
        .select("id, code, status, total_estimated, total_actual, variance, variance_pct, created_by, booking_id, estimate_id, accountant_note, ceo_note, created_at, bookings(code, customer_id, customers(full_name)), budget_estimates(code), profiles!budget_settlements_created_by_fkey(full_name)")
        .order("created_at", { ascending: false });
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  // Fetch disbursed estimates for creating settlements
  const { data: disbursedEstimates = [] } = useQuery({
    queryKey: ["disbursed-estimates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budget_estimates")
        .select("id, code, booking_id, total_estimated, advance_amount, bookings(code, customers(full_name))")
        .eq("status", "disbursed")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: createOpen,
  });

  // Fetch estimate items when estimate selected
  const loadEstimateItems = async (estimateId: string) => {
    const { data, error } = await supabase
      .from("budget_estimate_items")
      .select("category, description, unit_price, quantity, sort_order")
      .eq("estimate_id", estimateId)
      .order("sort_order");
    if (error) { toast.error(error.message); return; }
    setFormItems(
      (data || []).map((item: any, idx: number) => ({
        category: item.category,
        description: item.description || "",
        estimated_amount: (item.unit_price ?? 0) * (item.quantity ?? 1),
        actual_amount: 0,
        receipt_url: "",
        sort_order: idx,
      }))
    );
  };

  // Detail items
  const { data: detailItems = [] } = useQuery({
    queryKey: ["settlement-items", selectedSettlement?.id],
    queryFn: async () => {
      if (!selectedSettlement) return [];
      const { data, error } = await supabase
        .from("settlement_items")
        .select("id, category, description, estimated_amount, actual_amount, receipt_url, sort_order")
        .eq("settlement_id", selectedSettlement.id)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedSettlement,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!formEstimateId) throw new Error("Chọn dự toán");
      const est = disbursedEstimates.find((e: any) => e.id === formEstimateId);
      if (!est) throw new Error("Dự toán không hợp lệ");

      const { data: settlement, error: sErr } = await supabase
        .from("budget_settlements")
        .insert({
          estimate_id: formEstimateId,
          booking_id: est.booking_id,
          created_by: user!.id,
          total_estimated: est.total_estimated ?? 0,
          advance_amount: est.advance_amount ?? 0,
          status: "draft",
        })
        .select()
        .single();
      if (sErr) throw sErr;

      const itemsToInsert = formItems
        .filter((i) => i.category)
        .map((i, idx) => ({
          settlement_id: settlement.id,
          category: i.category,
          description: i.description || null,
          estimated_amount: i.estimated_amount,
          actual_amount: i.actual_amount,
          receipt_url: i.receipt_url || null,
          sort_order: idx,
        }));

      if (itemsToInsert.length > 0) {
        const { error: iErr } = await supabase.from("settlement_items").insert(itemsToInsert);
        if (iErr) throw iErr;
      }

      // Mark estimate as settled
      await supabase.from("budget_estimates").update({ status: "settled" }).eq("id", formEstimateId);

      return settlement;
    },
    onSuccess: () => {
      toast.success("Đã tạo quyết toán");
      queryClient.invalidateQueries({ queryKey: ["budget-settlements"] });
      queryClient.invalidateQueries({ queryKey: ["budget-estimates"] });
      setCreateOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Submit to accountant
  const submitMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("budget_settlements").update({ status: "pending_accountant" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Đã gửi KT duyệt");
      queryClient.invalidateQueries({ queryKey: ["budget-settlements"] });
    },
  });

  // Accountant approve
  const accountantApproveMutation = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      const { error } = await supabase.from("budget_settlements").update({
        status: "pending_ceo",
        accountant_id: user!.id,
        accountant_approved_at: new Date().toISOString(),
        accountant_note: note || null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("KT đã duyệt quyết toán");
      queryClient.invalidateQueries({ queryKey: ["budget-settlements"] });
      setReviewOpen(false);
      setDetailOpen(false);
    },
  });

  // CEO approve & close
  const ceoApproveMutation = useMutation({
    mutationFn: async ({ id, note, bookingId }: { id: string; note: string; bookingId: string }) => {
      const { error } = await supabase.from("budget_settlements").update({
        status: "closed",
        ceo_id: user!.id,
        ceo_approved_at: new Date().toISOString(),
        ceo_note: note || null,
      }).eq("id", id);
      if (error) throw error;

      // Close booking
      const { error: bErr } = await supabase.from("bookings").update({ status: "COMPLETED" }).eq("id", bookingId);
      if (bErr) throw bErr;
    },
    onSuccess: () => {
      toast.success("Đã duyệt & đóng booking");
      queryClient.invalidateQueries({ queryKey: ["budget-settlements"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      setReviewOpen(false);
      setDetailOpen(false);
    },
  });

  // Reject (by accountant or CEO)
  const rejectMutation = useMutation({
    mutationFn: async ({ id, note, step }: { id: string; note: string; step: string }) => {
      const updates: any = { status: "draft" };
      if (step === "accountant") {
        updates.accountant_id = user!.id;
        updates.accountant_note = note;
      } else {
        updates.ceo_id = user!.id;
        updates.ceo_note = note;
      }
      const { error } = await supabase.from("budget_settlements").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Đã từ chối quyết toán");
      queryClient.invalidateQueries({ queryKey: ["budget-settlements"] });
      setReviewOpen(false);
      setDetailOpen(false);
    },
  });

  const handleReviewSubmit = () => {
    if (!selectedSettlement) return;
    if (reviewAction === "accountant_approve") {
      accountantApproveMutation.mutate({ id: selectedSettlement.id, note: reviewNote });
    } else if (reviewAction === "ceo_approve") {
      ceoApproveMutation.mutate({ id: selectedSettlement.id, note: reviewNote, bookingId: selectedSettlement.booking_id });
    } else if (reviewAction === "reject_accountant") {
      rejectMutation.mutate({ id: selectedSettlement.id, note: reviewNote, step: "accountant" });
    } else if (reviewAction === "reject_ceo") {
      rejectMutation.mutate({ id: selectedSettlement.id, note: reviewNote, step: "ceo" });
    }
  };

  const updateFormItem = (idx: number, field: keyof SettlementItemForm, value: any) => {
    setFormItems(formItems.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  };

  const formTotalActual = formItems.reduce((s, i) => s + i.actual_amount, 0);

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Quyết toán tour</CardTitle>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {canCreate && (
                <Button size="sm" onClick={() => { setFormEstimateId(""); setFormItems([]); setCreateOpen(true); }}>
                  <Plus className="h-4 w-4 mr-1" /> Tạo quyết toán
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã QT</TableHead>
                <TableHead>Mã DT</TableHead>
                <TableHead>Booking</TableHead>
                <TableHead>Người tạo</TableHead>
                <TableHead className="text-right">Dự toán</TableHead>
                <TableHead className="text-right">Thực chi</TableHead>
                <TableHead className="text-right">Chênh lệch</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settlements.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Chưa có quyết toán</TableCell></TableRow>
              ) : (
                settlements.map((s: any) => {
                  const sc = STATUS_CONFIG[s.status] || STATUS_CONFIG.draft;
                  const variancePct = s.variance_pct ?? 0;
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-sm">{s.code}</TableCell>
                      <TableCell className="font-mono text-sm">{s.budget_estimates?.code}</TableCell>
                      <TableCell>{s.bookings?.code}</TableCell>
                      <TableCell>{s.profiles?.full_name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(s.total_estimated ?? 0)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(s.total_actual ?? 0)}</TableCell>
                      <TableCell className={`text-right font-medium ${Math.abs(variancePct) > 10 ? "text-destructive" : ""}`}>
                        {formatCurrency(s.variance ?? 0)} ({variancePct.toFixed(1)}%)
                      </TableCell>
                      <TableCell><Badge className={sc.className}>{sc.label}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedSettlement(s); setDetailOpen(true); }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {s.status === "draft" && s.created_by === user?.id && (
                            <Button variant="outline" size="sm" onClick={() => submitMutation.mutate(s.id)}>
                              Gửi KT duyệt
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tạo quyết toán tour</DialogTitle>
            <DialogDescription>Chọn dự toán đã giải ngân và nhập chi phí thực tế</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Dự toán đã giải ngân *</Label>
              <Select value={formEstimateId} onValueChange={(v) => { setFormEstimateId(v); loadEstimateItems(v); }}>
                <SelectTrigger><SelectValue placeholder="Chọn dự toán" /></SelectTrigger>
                <SelectContent>
                  {disbursedEstimates.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.code} — {e.bookings?.code} — {e.bookings?.customers?.full_name || "N/A"} — {formatCurrency(e.total_estimated ?? 0)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formItems.length > 0 && (
              <div className="space-y-2">
                <Label className="text-base font-semibold">So sánh dự toán & thực chi</Label>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Hạng mục</TableHead>
                        <TableHead>Mô tả</TableHead>
                        <TableHead className="text-right w-[130px]">Dự toán</TableHead>
                        <TableHead className="w-[140px]">Thực chi</TableHead>
                        <TableHead className="text-right w-[110px]">Chênh lệch</TableHead>
                        <TableHead className="w-[200px]">Link chứng từ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formItems.map((item, idx) => {
                        const variance = item.actual_amount - item.estimated_amount;
                        const variancePct = item.estimated_amount > 0 ? (variance / item.estimated_amount) * 100 : 0;
                        return (
                          <TableRow key={idx}>
                            <TableCell className="text-sm">{getCategoryLabel(item.category)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{item.description || "—"}</TableCell>
                            <TableCell className="text-right text-sm">{formatCurrency(item.estimated_amount)}</TableCell>
                            <TableCell className="p-1">
                              <Input className="h-8 text-xs" type="number" value={item.actual_amount} onChange={(e) => updateFormItem(idx, "actual_amount", Number(e.target.value))} />
                            </TableCell>
                            <TableCell className={`text-right text-sm font-medium ${Math.abs(variancePct) > 10 ? "text-destructive" : ""}`}>
                              {formatCurrency(variance)} ({variancePct.toFixed(0)}%)
                            </TableCell>
                            <TableCell className="p-1">
                              <Input className="h-8 text-xs" placeholder="URL chứng từ" value={item.receipt_url} onChange={(e) => updateFormItem(idx, "receipt_url", e.target.value)} />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-between text-sm font-semibold">
                  <span>Tổng dự toán: {formatCurrency(formItems.reduce((s, i) => s + i.estimated_amount, 0))}</span>
                  <span>Tổng thực chi: {formatCurrency(formTotalActual)}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Hủy</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !formEstimateId}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Tạo quyết toán
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết quyết toán {selectedSettlement?.code}</DialogTitle>
            <DialogDescription>
              Booking: {selectedSettlement?.bookings?.code} — {selectedSettlement?.bookings?.customers?.full_name}
            </DialogDescription>
          </DialogHeader>

          {selectedSettlement && Math.abs(selectedSettlement.variance_pct ?? 0) > 10 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span className="font-medium">Chênh lệch vượt 10% ({(selectedSettlement.variance_pct ?? 0).toFixed(1)}%) — cần CEO review</span>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Tổng dự toán</p>
              <p className="font-semibold">{formatCurrency(selectedSettlement?.total_estimated ?? 0)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Tổng thực chi</p>
              <p className="font-semibold">{formatCurrency(selectedSettlement?.total_actual ?? 0)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Hoàn ứng</p>
              <p className="font-semibold text-green-600">{formatCurrency(selectedSettlement?.refund_amount ?? 0)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Chi bù</p>
              <p className="font-semibold text-destructive">{formatCurrency(selectedSettlement?.additional_amount ?? 0)}</p>
            </div>
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hạng mục</TableHead>
                  <TableHead>Mô tả</TableHead>
                  <TableHead className="text-right">Dự toán</TableHead>
                  <TableHead className="text-right">Thực chi</TableHead>
                  <TableHead className="text-right">Chênh lệch</TableHead>
                  <TableHead>Chứng từ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detailItems.map((item: any) => {
                  const variancePct = item.estimated_amount > 0 ? ((item.variance ?? 0) / item.estimated_amount) * 100 : 0;
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="text-sm font-medium">{getCategoryLabel(item.category)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.description || "—"}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(item.estimated_amount ?? 0)}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{formatCurrency(item.actual_amount ?? 0)}</TableCell>
                      <TableCell className={`text-right text-sm font-medium ${Math.abs(variancePct) > 10 ? "text-destructive" : ""}`}>
                        {formatCurrency(item.variance ?? 0)} ({variancePct.toFixed(0)}%)
                      </TableCell>
                      <TableCell>
                        {item.receipt_url ? (
                          <a href={item.receipt_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">Xem</a>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {selectedSettlement?.accountant_note && (
            <div className="text-sm"><span className="font-medium">Ghi chú KT:</span> {selectedSettlement.accountant_note}</div>
          )}
          {selectedSettlement?.ceo_note && (
            <div className="text-sm"><span className="font-medium">Ghi chú CEO:</span> {selectedSettlement.ceo_note}</div>
          )}

          {selectedSettlement?.id && (
            <div className="border-t pt-4">
              <p className="text-sm font-semibold mb-2">💬 Ghi chú nội bộ</p>
              <InternalNotes entityType="finance" entityId={selectedSettlement.id} entityName={selectedSettlement.code} />
            </div>
          )}

          <DialogFooter className="flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (!selectedSettlement) return;
                const html = buildSettlementHtml({
                  code: selectedSettlement.code,
                  created_at: selectedSettlement.created_at,
                  estimate_code: selectedSettlement.budget_estimates?.code,
                  booking_code: selectedSettlement.bookings?.code,
                  customer_name: selectedSettlement.bookings?.customers?.full_name,
                  created_by_name: selectedSettlement.profiles?.full_name,
                  total_estimated: selectedSettlement.total_estimated,
                  total_actual: selectedSettlement.total_actual,
                  variance: selectedSettlement.variance,
                  variance_pct: selectedSettlement.variance_pct,
                  advance_amount: selectedSettlement.advance_amount,
                  refund_amount: selectedSettlement.refund_amount,
                  additional_amount: selectedSettlement.additional_amount,
                  refund_status: selectedSettlement.refund_status,
                  topup_status: selectedSettlement.topup_status,
                  items: detailItems.map((it: any) => ({
                    category: getCategoryLabel(it.category),
                    description: it.description,
                    estimated_amount: it.estimated_amount,
                    actual_amount: it.actual_amount,
                    receipt_url: it.receipt_url,
                  })),
                });
                openPrintWindow(html);
              }}
            >
              <Printer className="h-4 w-4 mr-1" /> In phiếu QT
            </Button>
            {/* Operator: submit to accountant */}
            {selectedSettlement?.status === "draft" && selectedSettlement?.created_by === user?.id && (
              <Button onClick={() => submitMutation.mutate(selectedSettlement.id)}>Gửi KT duyệt</Button>
            )}

            {/* Accountant: approve or reject */}
            {selectedSettlement?.status === "pending_accountant" && isKetoan && (
              <>
                <Button variant="outline" className="text-destructive" onClick={() => { setReviewAction("reject_accountant"); setReviewNote(""); setReviewOpen(true); }}>
                  Từ chối
                </Button>
                <Button onClick={() => { setReviewAction("accountant_approve"); setReviewNote(""); setReviewOpen(true); }}>
                  Duyệt KT
                </Button>
              </>
            )}

            {/* CEO: approve & close or reject */}
            {selectedSettlement?.status === "pending_ceo" && isCeo && (
              <>
                <Button variant="outline" className="text-destructive" onClick={() => { setReviewAction("reject_ceo"); setReviewNote(""); setReviewOpen(true); }}>
                  Từ chối
                </Button>
                <Button onClick={() => { setReviewAction("ceo_approve"); setReviewNote(""); setReviewOpen(true); }}>
                  Duyệt & Đóng Booking
                </Button>
              </>
            )}

            <Button variant="outline" onClick={() => setDetailOpen(false)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Note Dialog */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction.includes("reject") ? "Từ chối quyết toán" : reviewAction === "accountant_approve" ? "Duyệt KT" : "Duyệt & Đóng Booking"}
            </DialogTitle>
            <DialogDescription>Nhập ghi chú (nếu có)</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Ghi chú</Label>
            <Textarea value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Nhập ghi chú..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)}>Hủy</Button>
            <Button
              variant={reviewAction.includes("reject") ? "destructive" : "default"}
              onClick={handleReviewSubmit}
              disabled={accountantApproveMutation.isPending || ceoApproveMutation.isPending || rejectMutation.isPending}
            >
              {(accountantApproveMutation.isPending || ceoApproveMutation.isPending || rejectMutation.isPending) && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
