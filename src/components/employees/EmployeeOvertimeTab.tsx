import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";

const otTypes = [
  { value: "WEEKDAY", label: "Ngày thường", multiplier: 1.5 },
  { value: "WEEKEND", label: "Cuối tuần", multiplier: 2.0 },
  { value: "HOLIDAY", label: "Ngày lễ", multiplier: 3.0 },
];

const formatVND = (v: number | null) => v ? v.toLocaleString("vi-VN") + "đ" : "—";

export function EmployeeOvertimeTab({ employeeId }: { employeeId: string }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ date: "", hours: "", ot_type: "WEEKDAY", notes: "" });

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["overtime_records", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("overtime_records")
        .select("id, date, hours, ot_type, rate_multiplier, ot_pay, notes")
        .eq("employee_id", employeeId)
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createOT = useMutation({
    mutationFn: async () => {
      if (!form.date || !form.hours) throw new Error("Vui lòng nhập ngày và số giờ");
      const hours = parseFloat(form.hours);
      if (isNaN(hours) || hours <= 0) throw new Error("Số giờ không hợp lệ");
      const multiplier = otTypes.find(t => t.value === form.ot_type)?.multiplier ?? 1.5;

      const { error } = await supabase.from("overtime_records").insert({
        employee_id: employeeId,
        date: form.date,
        hours,
        ot_type: form.ot_type,
        rate_multiplier: multiplier,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Đã ghi nhận tăng ca");
      queryClient.invalidateQueries({ queryKey: ["overtime_records", employeeId] });
      setDialogOpen(false);
      setForm({ date: "", hours: "", ot_type: "WEEKDAY", notes: "" });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const totalHours = records.reduce((s, r) => s + (r.hours ?? 0), 0);
  const totalPay = records.reduce((s, r) => s + (r.ot_pay ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Tổng giờ tăng ca</p>
            <p className="text-2xl font-bold">{totalHours}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Tổng tiền tăng ca</p>
            <p className="text-2xl font-bold">{formatVND(totalPay)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Số lần tăng ca</p>
              <p className="text-2xl font-bold">{records.length}</p>
            </div>
            <Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" />Thêm</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Lịch sử tăng ca</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ngày</TableHead>
                  <TableHead>Số giờ</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Hệ số</TableHead>
                  <TableHead>Tiền OT</TableHead>
                  <TableHead>Ghi chú</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.date}</TableCell>
                    <TableCell>{r.hours}h</TableCell>
                    <TableCell>{otTypes.find(t => t.value === r.ot_type)?.label ?? r.ot_type ?? "—"}</TableCell>
                    <TableCell>{r.rate_multiplier}x</TableCell>
                    <TableCell className="font-medium">{formatVND(r.ot_pay)}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{r.notes ?? "—"}</TableCell>
                  </TableRow>
                ))}
                {records.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Chưa có dữ liệu</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ghi nhận tăng ca</DialogTitle>
            <DialogDescription>Nhập thông tin tăng ca</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Ngày</Label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Số giờ</Label>
                <Input type="number" min="0.5" step="0.5" value={form.hours} onChange={e => setForm(f => ({ ...f, hours: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Loại tăng ca</Label>
              <Select value={form.ot_type} onValueChange={v => setForm(f => ({ ...f, ot_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {otTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label} ({t.multiplier}x)</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Ghi chú</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
            <Button onClick={() => createOT.mutate()} disabled={createOT.isPending}>
              {createOT.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
