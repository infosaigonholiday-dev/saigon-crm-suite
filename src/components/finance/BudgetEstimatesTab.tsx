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
import { Loader2, Plus, Eye, Check, X, Banknote, Trash2 } from "lucide-react";
import { toast } from "sonner";

const formatCurrency = (v: number) => new Intl.NumberFormat("vi-VN").format(v) + "đ";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: "Nháp", className: "bg-muted text-muted-foreground" },
  pending_review: { label: "Chờ duyệt", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  approved: { label: "Đã duyệt", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  rejected: { label: "Từ chối", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  disbursed: { label: "Đã giải ngân", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  settled: { label: "Đã quyết toán", className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
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

interface EstimateItem {
  id?: string;
  category: string;
  description: string;
  unit_price: number;
  quantity: number;
  vendor_id?: string;
  payment_deadline?: string;
  sort_order: number;
}

export function BudgetEstimatesTab() {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission("finance.edit");
  const canReview = hasPermission("finance.edit");
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedEstimate, setSelectedEstimate] = useState<any>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewAction, setReviewAction] = useState<"approved" | "rejected">("approved");

  // Form state
  const [formBookingId, setFormBookingId] = useState("");
  const [formAdvance, setFormAdvance] = useState(0);
  const [formItems, setFormItems] = useState<EstimateItem[]>([
    { category: "XE", description: "", unit_price: 0, quantity: 1, sort_order: 0 },
  ]);

  const { data: estimates = [], isLoading } = useQuery({
    queryKey: ["budget-estimates", statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("budget_estimates")
        .select("*, bookings(code, customer_id, customers(full_name)), profiles!budget_estimates_created_by_fkey(full_name)")
        .order("created_at", { ascending: false });
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ["bookings-for-estimate"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, code, customer_id, customers(full_name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vendors").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!formBookingId) throw new Error("Chọn booking");
      const { data: est, error: estErr } = await supabase
        .from("budget_estimates")
        .insert({
          booking_id: formBookingId,
          created_by: user!.id,
          advance_amount: formAdvance,
          status: "draft",
        })
        .select()
        .single();
      if (estErr) throw estErr;

      const itemsToInsert = formItems
        .filter((i) => i.category && i.unit_price > 0)
        .map((i, idx) => ({
          estimate_id: est.id,
          category: i.category,
          description: i.description || null,
          unit_price: i.unit_price,
          quantity: i.quantity,
          vendor_id: i.vendor_id || null,
          payment_deadline: i.payment_deadline || null,
          sort_order: idx,
        }));

      if (itemsToInsert.length > 0) {
        const { error: itemErr } = await supabase.from("budget_estimate_items").insert(itemsToInsert);
        if (itemErr) throw itemErr;
      }
      return est;
    },
    onSuccess: () => {
      toast.success("Đã tạo dự toán");
      queryClient.invalidateQueries({ queryKey: ["budget-estimates"] });
      setCreateOpen(false);
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const submitMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("budget_estimates").update({ status: "pending_review" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Đã gửi duyệt");
      queryClient.invalidateQueries({ queryKey: ["budget-estimates"] });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: string; note: string }) => {
      const { error } = await supabase
        .from("budget_estimates")
        .update({ status, reviewed_by: user!.id, reviewed_at: new Date().toISOString(), review_note: note })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(reviewAction === "approved" ? "Đã duyệt dự toán" : "Đã từ chối dự toán");
      queryClient.invalidateQueries({ queryKey: ["budget-estimates"] });
      setReviewOpen(false);
      setDetailOpen(false);
    },
  });

  const disburseMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("budget_estimates").update({ status: "disbursed" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Đã giải ngân tạm ứng");
      queryClient.invalidateQueries({ queryKey: ["budget-estimates"] });
      setDetailOpen(false);
    },
  });

  const resetForm = () => {
    setFormBookingId("");
    setFormAdvance(0);
    setFormItems([{ category: "XE", description: "", unit_price: 0, quantity: 1, sort_order: 0 }]);
  };

  const addItem = () => {
    setFormItems([...formItems, { category: "KS", description: "", unit_price: 0, quantity: 1, sort_order: formItems.length }]);
  };

  const removeItem = (idx: number) => {
    setFormItems(formItems.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof EstimateItem, value: any) => {
    setFormItems(formItems.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  };

  const formTotal = formItems.reduce((s, i) => s + i.unit_price * i.quantity, 0);

  // Detail view
  const { data: detailItems = [] } = useQuery({
    queryKey: ["estimate-items", selectedEstimate?.id],
    queryFn: async () => {
      if (!selectedEstimate) return [];
      const { data, error } = await supabase
        .from("budget_estimate_items")
        .select("*, vendors(name)")
        .eq("estimate_id", selectedEstimate.id)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedEstimate,
  });

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Dự toán tour</CardTitle>
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
                <Button size="sm" onClick={() => { resetForm(); setCreateOpen(true); }}>
                  <Plus className="h-4 w-4 mr-1" /> Tạo dự toán
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã DT</TableHead>
                <TableHead>Booking</TableHead>
                <TableHead>Khách hàng</TableHead>
                <TableHead>Người tạo</TableHead>
                <TableHead className="text-right">Tổng dự toán</TableHead>
                <TableHead className="text-right">Tạm ứng</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {estimates.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Chưa có dự toán</TableCell></TableRow>
              ) : (
                estimates.map((est: any) => {
                  const sc = STATUS_CONFIG[est.status] || STATUS_CONFIG.draft;
                  return (
                    <TableRow key={est.id}>
                      <TableCell className="font-mono text-sm">{est.code}</TableCell>
                      <TableCell>{est.bookings?.code}</TableCell>
                      <TableCell>{est.bookings?.customers?.full_name || "—"}</TableCell>
                      <TableCell>{est.profiles?.full_name}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(est.total_estimated ?? 0)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(est.advance_amount ?? 0)}</TableCell>
                      <TableCell><Badge className={sc.className}>{sc.label}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedEstimate(est); setDetailOpen(true); }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {est.status === "draft" && est.created_by === user?.id && (
                            <Button variant="outline" size="sm" onClick={() => submitMutation.mutate(est.id)}>
                              Gửi duyệt
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tạo dự toán tour</DialogTitle>
            <DialogDescription>Lập dự toán chi phí cho booking</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Booking *</Label>
                <Select value={formBookingId} onValueChange={setFormBookingId}>
                  <SelectTrigger><SelectValue placeholder="Chọn booking" /></SelectTrigger>
                  <SelectContent>
                    {bookings.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.code} — {b.customers?.full_name || "N/A"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Số tiền tạm ứng</Label>
                <Input type="number" value={formAdvance} onChange={(e) => setFormAdvance(Number(e.target.value))} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Hạng mục chi phí</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="h-3 w-3 mr-1" /> Thêm</Button>
              </div>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">Danh mục</TableHead>
                      <TableHead>Mô tả</TableHead>
                      <TableHead className="w-[120px]">Đơn giá</TableHead>
                      <TableHead className="w-[80px]">SL</TableHead>
                      <TableHead className="w-[140px]">NCC</TableHead>
                      <TableHead className="w-[130px]">Hạn TT</TableHead>
                      <TableHead className="w-[100px] text-right">Thành tiền</TableHead>
                      <TableHead className="w-[40px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formItems.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="p-1">
                          <Select value={item.category} onValueChange={(v) => updateItem(idx, "category", v)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {ITEM_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="p-1"><Input className="h-8 text-xs" value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)} /></TableCell>
                        <TableCell className="p-1"><Input className="h-8 text-xs" type="number" value={item.unit_price} onChange={(e) => updateItem(idx, "unit_price", Number(e.target.value))} /></TableCell>
                        <TableCell className="p-1"><Input className="h-8 text-xs" type="number" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))} /></TableCell>
                        <TableCell className="p-1">
                          <Select value={item.vendor_id || ""} onValueChange={(v) => updateItem(idx, "vendor_id", v)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                            <SelectContent>
                              {vendors.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="p-1"><Input className="h-8 text-xs" type="date" value={item.payment_deadline || ""} onChange={(e) => updateItem(idx, "payment_deadline", e.target.value)} /></TableCell>
                        <TableCell className="p-1 text-right text-xs font-medium">{formatCurrency(item.unit_price * item.quantity)}</TableCell>
                        <TableCell className="p-1">
                          {formItems.length > 1 && (
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeItem(idx)}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="text-right font-semibold text-sm">Tổng: {formatCurrency(formTotal)}</div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Hủy</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Tạo dự toán
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dự toán {selectedEstimate?.code}</DialogTitle>
            <DialogDescription>
              Booking: {selectedEstimate?.bookings?.code} — {selectedEstimate?.bookings?.customers?.full_name || "N/A"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Trạng thái:</span>{" "}
                <Badge className={STATUS_CONFIG[selectedEstimate?.status]?.className}>
                  {STATUS_CONFIG[selectedEstimate?.status]?.label}
                </Badge>
              </div>
              <div><span className="text-muted-foreground">Tổng dự toán:</span> <span className="font-semibold">{formatCurrency(selectedEstimate?.total_estimated ?? 0)}</span></div>
              <div><span className="text-muted-foreground">Tạm ứng:</span> <span className="font-semibold">{formatCurrency(selectedEstimate?.advance_amount ?? 0)}</span></div>
            </div>

            {selectedEstimate?.review_note && (
              <div className="rounded-md border p-3 text-sm">
                <span className="text-muted-foreground font-medium">Ghi chú duyệt:</span> {selectedEstimate.review_note}
              </div>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Danh mục</TableHead>
                  <TableHead>Mô tả</TableHead>
                  <TableHead>NCC</TableHead>
                  <TableHead className="text-right">Đơn giá</TableHead>
                  <TableHead className="text-right">SL</TableHead>
                  <TableHead className="text-right">Thành tiền</TableHead>
                  <TableHead>Hạn TT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detailItems.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>{ITEM_CATEGORIES.find((c) => c.value === item.category)?.label || item.category}</TableCell>
                    <TableCell>{item.description || "—"}</TableCell>
                    <TableCell>{item.vendors?.name || "—"}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                    <TableCell>{item.payment_deadline || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            {canReview && selectedEstimate?.status === "pending_review" && (
              <>
                <Button
                  variant="outline"
                  className="text-destructive"
                  onClick={() => { setReviewAction("rejected"); setReviewNote(""); setReviewOpen(true); }}
                >
                  <X className="h-4 w-4 mr-1" /> Từ chối
                </Button>
                <Button onClick={() => { setReviewAction("approved"); setReviewNote(""); setReviewOpen(true); }}>
                  <Check className="h-4 w-4 mr-1" /> Duyệt
                </Button>
              </>
            )}
            {canReview && selectedEstimate?.status === "approved" && (
              <Button onClick={() => disburseMutation.mutate(selectedEstimate.id)} disabled={disburseMutation.isPending}>
                <Banknote className="h-4 w-4 mr-1" /> Giải ngân tạm ứng
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{reviewAction === "approved" ? "Duyệt dự toán" : "Từ chối dự toán"}</DialogTitle>
            <DialogDescription>Nhập ghi chú (nếu có)</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Ghi chú</Label>
            <Textarea value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Ghi chú duyệt..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)}>Hủy</Button>
            <Button
              variant={reviewAction === "rejected" ? "destructive" : "default"}
              onClick={() => reviewMutation.mutate({ id: selectedEstimate.id, status: reviewAction, note: reviewNote })}
              disabled={reviewMutation.isPending}
            >
              {reviewMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {reviewAction === "approved" ? "Xác nhận duyệt" : "Xác nhận từ chối"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
