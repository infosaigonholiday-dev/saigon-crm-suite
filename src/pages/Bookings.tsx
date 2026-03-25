import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, AlertCircle } from "lucide-react";

type BookingStatus = "pending" | "deposited" | "paid" | "completed" | "cancelled";

const statusConfig: Record<BookingStatus, { label: string; className: string }> = {
  pending: { label: "Chờ cọc", className: "bg-warning/15 text-warning border-warning/30" },
  deposited: { label: "Đã cọc", className: "bg-accent/15 text-accent border-accent/30" },
  paid: { label: "Đã thanh toán", className: "bg-success/15 text-success border-success/30" },
  completed: { label: "Hoàn thành", className: "bg-primary/10 text-primary border-primary/20" },
  cancelled: { label: "Đã huỷ", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

const bookings = [
  { id: "BK001", customer: "Nguyễn Văn A", tour: "Phú Quốc 4N3Đ", pax: 4, total: "24,000,000đ", status: "pending" as BookingStatus, depositDue: "2026-03-26", paymentDue: "2026-04-01", sale: "Trần Hải" },
  { id: "BK002", customer: "Trần Thị B", tour: "Đà Nẵng 3N2Đ", pax: 2, total: "12,000,000đ", status: "deposited" as BookingStatus, depositDue: "2026-03-20", paymentDue: "2026-03-28", sale: "Lê Mai" },
  { id: "BK003", customer: "Lê Hoàng C", tour: "Nha Trang 5N4Đ", pax: 6, total: "42,000,000đ", status: "paid" as BookingStatus, depositDue: "2026-03-15", paymentDue: "2026-03-22", sale: "Trần Hải" },
  { id: "BK004", customer: "Phạm Minh D", tour: "Sapa 4N3Đ", pax: 3, total: "18,000,000đ", status: "pending" as BookingStatus, depositDue: "2026-03-25", paymentDue: "2026-04-05", sale: "Nguyễn Lan" },
  { id: "BK005", customer: "Hoàng Thị E", tour: "Hạ Long 3N2Đ", pax: 5, total: "30,000,000đ", status: "completed" as BookingStatus, depositDue: "2026-03-10", paymentDue: "2026-03-18", sale: "Lê Mai" },
  { id: "BK006", customer: "Vũ Đức F", tour: "Côn Đảo 4N3Đ", pax: 2, total: "28,000,000đ", status: "cancelled" as BookingStatus, depositDue: "2026-03-12", paymentDue: "2026-03-20", sale: "Trần Hải" },
];

function isOverdue(dateStr: string) {
  return new Date(dateStr) <= new Date("2026-03-25");
}

export default function Bookings() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Đặt tour</h1>
          <p className="text-sm text-muted-foreground">{bookings.length} booking</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />Tạo booking</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã</TableHead>
                <TableHead>Khách hàng</TableHead>
                <TableHead>Tour</TableHead>
                <TableHead className="text-center">Số khách</TableHead>
                <TableHead>Tổng tiền</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Hạn cọc</TableHead>
                <TableHead>Hạn thanh toán</TableHead>
                <TableHead>Sale</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((b) => {
                const cfg = statusConfig[b.status];
                const depositOverdue = b.status === "pending" && isOverdue(b.depositDue);
                const paymentOverdue = b.status === "deposited" && isOverdue(b.paymentDue);
                return (
                  <TableRow key={b.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-mono text-xs">{b.id}</TableCell>
                    <TableCell className="font-medium">{b.customer}</TableCell>
                    <TableCell>{b.tour}</TableCell>
                    <TableCell className="text-center">{b.pax}</TableCell>
                    <TableCell className="font-medium">{b.total}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`text-sm flex items-center gap-1 ${depositOverdue ? "text-destructive font-medium" : ""}`}>
                        {depositOverdue && <AlertCircle className="h-3.5 w-3.5" />}
                        {b.depositDue}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`text-sm flex items-center gap-1 ${paymentOverdue ? "text-destructive font-medium" : ""}`}>
                        {paymentOverdue && <AlertCircle className="h-3.5 w-3.5" />}
                        {b.paymentDue}
                      </span>
                    </TableCell>
                    <TableCell>{b.sale}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
