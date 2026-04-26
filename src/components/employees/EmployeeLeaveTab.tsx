import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";

const leaveTypes = [
  { value: "ANNUAL", label: "Phép năm" },
  { value: "SICK", label: "Ốm đau" },
  { value: "COMPENSATORY", label: "Phép bù" },
  { value: "UNPAID", label: "Không lương" },
  { value: "MATERNITY", label: "Thai sản" },
  { value: "WEDDING", label: "Cưới" },
  { value: "BEREAVEMENT", label: "Tang" },
];

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Chờ duyệt", className: "bg-warning/15 text-warning" },
  APPROVED: { label: "Đã duyệt", className: "bg-success/15 text-success" },
  REJECTED: { label: "Từ chối", className: "bg-destructive/10 text-destructive" },
};

export function EmployeeLeaveTab({ employeeId }: { employeeId: string }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    leave_type: "ANNUAL", start_date: "", end_date: "", reason: "",
  });

  const { data: leaves = [], isLoading } = useQuery({
    queryKey: ["leave_requests", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select("id, leave_type, start_date, end_date, total_days, reason, status")
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createLeave = useMutation({
    mutationFn: async () => {
      if (!form.start_date || !form.end_date) throw new Error("Vui lòng chọn ngày");
      const start = new Date(form.start_date);
      const end = new Date(form.end_date);
      const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      if (diff <= 0) throw new Error("Ngày kết thúc phải sau ngày bắt đầu");

      const { error } = await supabase.from("leave_requests").insert({
        employee_id: employeeId,
        leave_type: form.leave_type,
        start_date: form.start_date,
        end_date: form.end_date,
        total_days: diff,
        reason: form.reason || null,
        status: "PENDING",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Đã gửi đơn nghỉ phép");
      queryClient.invalidateQueries({ queryKey: ["leave_requests", employeeId] });
      setDialogOpen(false);
      setForm({ leave_type: "ANNUAL", start_date: "", end_date: "", reason: "" });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Calculate remaining days
  const currentYear = new Date().getFullYear();
  const usedDays = leaves
    .filter(l => l.status === "APPROVED" && l.leave_type === "ANNUAL" && new Date(l.start_date).getFullYear() === currentYear)
    .reduce((s, l) => s + l.total_days, 0);
  const remainingDays = 12 - usedDays;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Phép năm còn lại</p>
            <p className={`text-2xl font-bold ${remainingDays < 0 ? "text-destructive" : ""}`}>{remainingDays} ngày</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Đã sử dụng</p>
            <p className="text-2xl font-bold">{usedDays} ngày</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Đơn chờ duyệt</p>
              <p className="text-2xl font-bold">{leaves.filter(l => l.status === "PENDING").length}</p>
            </div>
            <Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" />Tạo đơn</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Lịch sử nghỉ phép</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loại</TableHead>
                  <TableHead>Từ ngày</TableHead>
                  <TableHead>Đến ngày</TableHead>
                  <TableHead>Số ngày</TableHead>
                  <TableHead>Lý do</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaves.map((l) => {
                  const st = statusConfig[l.status ?? "PENDING"] ?? statusConfig.PENDING;
                  const typeLabel = leaveTypes.find(t => t.value === l.leave_type)?.label ?? l.leave_type;
                  return (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{typeLabel}</TableCell>
                      <TableCell>{l.start_date}</TableCell>
                      <TableCell>{l.end_date}</TableCell>
                      <TableCell>{l.total_days}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{l.reason ?? "—"}</TableCell>
                      <TableCell><Badge variant="outline" className={st.className}>{st.label}</Badge></TableCell>
                    </TableRow>
                  );
                })}
                {leaves.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Chưa có đơn nghỉ phép</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo đơn nghỉ phép</DialogTitle>
            <DialogDescription>Chọn loại phép và ngày nghỉ</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Loại phép</Label>
              <Select value={form.leave_type} onValueChange={v => setForm(f => ({ ...f, leave_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {leaveTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Từ ngày</Label>
                <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Đến ngày</Label>
                <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Lý do</Label>
              <Textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
            <Button onClick={() => createLeave.mutate()} disabled={createLeave.isPending}>
              {createLeave.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Gửi đơn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
