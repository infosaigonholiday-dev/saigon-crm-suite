import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import BookingFormDialog from "@/components/bookings/BookingFormDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, AlertCircle, AlertTriangle, Loader2 } from "lucide-react";

type BookingStatus = "PENDING" | "DEPOSITED" | "PAID" | "COMPLETED" | "CANCELLED";

const statusConfig: Record<BookingStatus, { label: string; className: string }> = {
  PENDING: { label: "Chờ cọc", className: "bg-warning/15 text-warning border-warning/30" },
  DEPOSITED: { label: "Đã cọc", className: "bg-accent/15 text-accent border-accent/30" },
  PAID: { label: "Đã thanh toán", className: "bg-success/15 text-success border-success/30" },
  COMPLETED: { label: "Hoàn thành", className: "bg-primary/10 text-primary border-primary/20" },
  CANCELLED: { label: "Đã huỷ", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

function isOverdue(dateStr: string | null) {
  if (!dateStr) return false;
  return new Date(dateStr) <= new Date();
}

const formatCurrency = (v: number | null) =>
  v ? v.toLocaleString("vi-VN") + "đ" : "—";

export default function Bookings() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, code, customer_id, pax_total, total_value, status, deposit_due_at, remaining_due_at, customers(full_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Đặt tour</h1>
          <p className="text-sm text-muted-foreground">{bookings.length} booking</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Tạo booking</Button>
      </div>
      <BookingFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã</TableHead>
                  <TableHead>Khách hàng</TableHead>
                  <TableHead className="text-center">Số khách</TableHead>
                  <TableHead>Tổng tiền</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Hạn cọc</TableHead>
                  <TableHead>Hạn thanh toán</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((b) => {
                  const status = (b.status as BookingStatus) ?? "PENDING";
                  const cfg = statusConfig[status] ?? statusConfig.PENDING;
                  const depositOverdue = status === "PENDING" && isOverdue(b.deposit_due_at);
                  const paymentOverdue = status === "DEPOSITED" && isOverdue(b.remaining_due_at);
                  const customerName = (b.customers as any)?.full_name ?? "—";
                  return (
                    <TableRow key={b.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/dat-tour/${b.id}`)}>
                      <TableCell className="font-mono text-xs">{b.code}</TableCell>
                      <TableCell className="font-medium">{customerName}</TableCell>
                      <TableCell className="text-center">{b.pax_total ?? 0}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(b.total_value)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`text-sm flex items-center gap-1 ${depositOverdue ? "text-destructive font-medium" : ""}`}>
                          {depositOverdue && <AlertCircle className="h-3.5 w-3.5" />}
                          {b.deposit_due_at ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`text-sm flex items-center gap-1 ${paymentOverdue ? "text-destructive font-medium" : ""}`}>
                          {paymentOverdue && <AlertCircle className="h-3.5 w-3.5" />}
                          {b.remaining_due_at ?? "—"}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {bookings.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Không có dữ liệu</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
