import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const SERVICE_TYPES = [
  { value: "XE", label: "Xe" },
  { value: "KS", label: "Khách sạn" },
  { value: "NHA_HANG", label: "Nhà hàng" },
  { value: "MC", label: "MC" },
  { value: "HDV", label: "Hướng dẫn viên" },
  { value: "VISA", label: "Visa" },
  { value: "VE", label: "Vé tham quan" },
  { value: "EVENT", label: "Sự kiện" },
  { value: "OTHER", label: "Khác" },
];

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Chờ xác nhận", className: "bg-warning/15 text-warning border-warning/30" },
  CONFIRMED: { label: "Đã chốt", className: "bg-success/15 text-success border-success/30" },
  COMPLETED: { label: "Hoàn thành", className: "bg-primary/10 text-primary border-primary/20" },
};

const formatCurrency = (v: number | null) => v ? new Intl.NumberFormat("vi-VN").format(v) + "đ" : "—";

interface Props {
  bookingId: string;
  readOnly?: boolean;
}

export default function BookingServicesTab({ bookingId }: Props) {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission("bookings.edit");
  const canDelete = hasPermission("bookings.delete");
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ vendor_id: "", service_type: "OTHER", description: "", expected_cost: "", due_date: "", notes: "" });

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["tour_services", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tour_services")
        .select("*, vendors(name)")
        .eq("booking_id", bookingId)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors-list"],
    queryFn: async () => {
      const { data } = await supabase.from("vendors").select("id, name, category").order("name");
      return data || [];
    },
  });

  const { data: paidAmounts = {} } = useQuery({
    queryKey: ["tour_services_paid", bookingId],
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("tour_service_id, amount")
        .eq("booking_id", bookingId)
        .eq("type", "EXPENSE")
        .eq("category", "TOUR_EXPENSE");
      const map: Record<string, number> = {};
      (data || []).forEach((t: any) => {
        if (t.tour_service_id) map[t.tour_service_id] = (map[t.tour_service_id] || 0) + Number(t.amount);
      });
      return map;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        booking_id: bookingId,
        vendor_id: form.vendor_id || null,
        service_type: form.service_type,
        description: form.description,
        expected_cost: Number(form.expected_cost) || 0,
        due_date: form.due_date || null,
        notes: form.notes,
        created_by: user?.id,
      };
      if (editing) {
        const { error } = await supabase.from("tour_services").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tour_services").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tour_services", bookingId] });
      toast.success(editing ? "Đã cập nhật" : "Đã thêm dịch vụ");
      setDialogOpen(false);
    },
    onError: () => toast.error("Lỗi khi lưu"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tour_services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tour_services", bookingId] });
      toast.success("Đã xoá");
    },
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ vendor_id: "", service_type: "OTHER", description: "", expected_cost: "", due_date: "", notes: "" });
    setDialogOpen(true);
  };

  const openEdit = (s: any) => {
    setEditing(s);
    setForm({
      vendor_id: s.vendor_id || "",
      service_type: s.service_type || "OTHER",
      description: s.description || "",
      expected_cost: String(s.expected_cost || ""),
      due_date: s.due_date || "",
      notes: s.notes || "",
    });
    setDialogOpen(true);
  };

  const totalExpected = services.reduce((s: number, sv: any) => s + (Number(sv.expected_cost) || 0), 0);
  const totalPaid = Object.values(paidAmounts).reduce((s: number, v: any) => s + v, 0);

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4 text-center">
          <p className="text-sm text-muted-foreground">Tổng dự toán</p>
          <p className="text-xl font-bold text-primary">{formatCurrency(totalExpected)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-sm text-muted-foreground">Đã chi</p>
          <p className="text-xl font-bold text-success">{formatCurrency(totalPaid)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-sm text-muted-foreground">Công nợ NCC</p>
          <p className="text-xl font-bold text-destructive">{formatCurrency(totalExpected - totalPaid)}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Danh sách dịch vụ</CardTitle>
          {canEdit && <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Thêm</Button>}
        </CardHeader>
        <CardContent>
          {services.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">Chưa có dịch vụ nào</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loại DV</TableHead>
                  <TableHead>NCC</TableHead>
                  <TableHead>Mô tả</TableHead>
                  <TableHead className="text-right">Dự toán</TableHead>
                  <TableHead className="text-right">Đã chi</TableHead>
                  <TableHead>Hạn TT</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  {canEdit && <TableHead className="w-[80px]" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((s: any) => {
                  const paid = paidAmounts[s.id] || 0;
                  const st = STATUS_MAP[s.status] || STATUS_MAP.PENDING;
                  return (
                    <TableRow key={s.id}>
                      <TableCell>{SERVICE_TYPES.find((t) => t.value === s.service_type)?.label || s.service_type}</TableCell>
                      <TableCell>{(s.vendors as any)?.name || "—"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{s.description || "—"}</TableCell>
                      <TableCell className="text-right">{formatCurrency(s.expected_cost)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(paid)}</TableCell>
                      <TableCell>{s.due_date || "—"}</TableCell>
                      <TableCell><Badge variant="outline" className={st.className}>{st.label}</Badge></TableCell>
                      {canEdit && (
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="h-3 w-3" /></Button>
                            {canDelete && (
                              <Button variant="ghost" size="icon" onClick={() => { if (confirm("Xoá?")) deleteMutation.mutate(s.id); }}>
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Sửa dịch vụ" : "Thêm dịch vụ"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Loại DV</Label>
                <Select value={form.service_type} onValueChange={(v) => setForm({ ...form, service_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SERVICE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>NCC</Label>
                <Select value={form.vendor_id} onValueChange={(v) => setForm({ ...form, vendor_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Chọn NCC" /></SelectTrigger>
                  <SelectContent>{vendors.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Mô tả</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <Label>Giá trị phải trả</Label>
                <Input type="number" value={form.expected_cost} onChange={(e) => setForm({ ...form, expected_cost: e.target.value })} />
              </div>
              <div>
                <Label>Hạn thanh toán</Label>
                <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Ghi chú</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Huỷ</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Đang lưu..." : editing ? "Cập nhật" : "Thêm"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
