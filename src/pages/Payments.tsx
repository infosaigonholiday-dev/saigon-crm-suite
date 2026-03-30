import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PaymentFormDialog from "@/components/payments/PaymentFormDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Loader2 } from "lucide-react";

const formatCurrency = (v: number | null) =>
  v ? v.toLocaleString("vi-VN") + "đ" : "—";

const methodLabels: Record<string, string> = {
  BANK_TRANSFER: "Chuyển khoản",
  CASH: "Tiền mặt",
  CARD: "Thẻ",
};

const typeLabels: Record<string, string> = {
  DEPOSIT: "Đặt cọc",
  REMAINING: "Còn lại",
  FULL: "Toàn bộ",
  REFUND: "Hoàn tiền",
};

export default function Payments() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("id, amount, method, payment_type, paid_at, bank_ref_code, notes, bookings(code, customers(full_name))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Thanh toán</h1>
          <p className="text-sm text-muted-foreground">{payments.length} giao dịch</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />Thêm thanh toán</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking</TableHead>
                  <TableHead>Khách hàng</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Số tiền</TableHead>
                  <TableHead>Phương thức</TableHead>
                  <TableHead>Mã GD</TableHead>
                  <TableHead>Ngày thanh toán</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => {
                  const booking = p.bookings as any;
                  return (
                    <TableRow key={p.id} className="hover:bg-muted/50">
                      <TableCell className="font-mono text-xs">{booking?.code ?? "—"}</TableCell>
                      <TableCell className="font-medium">{booking?.customers?.full_name ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {typeLabels[p.payment_type ?? ""] ?? p.payment_type ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(p.amount)}</TableCell>
                      <TableCell>{methodLabels[p.method ?? ""] ?? p.method ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{p.bank_ref_code ?? "—"}</TableCell>
                      <TableCell className="text-sm">{p.paid_at ? new Date(p.paid_at).toLocaleDateString("vi-VN") : "—"}</TableCell>
                    </TableRow>
                  );
                })}
                {payments.length === 0 && (
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
