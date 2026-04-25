import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import BookingFormDialog from "@/components/bookings/BookingFormDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, AlertCircle, AlertTriangle, Loader2, Printer } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { useMyDepartmentId } from "@/hooks/useScopedQuery";
import { canPrintBookingConfirmation, DEPT_PRINT_ROLES } from "@/lib/bookingPrintAccess";

const PAGE_SIZE = 20;

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
  const [page, setPage] = useState(0);
  const [prefillData, setPrefillData] = useState<any>(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { getScope } = usePermissions();
  const { user } = useAuth();

  // Đọc prefill_tour từ URL khi từ LKH Tour 2026 chuyển sang
  useEffect(() => {
    const tourCode = searchParams.get("prefill_tour");
    if (tourCode) {
      supabase
        .from("b2b_tours")
        .select("tour_code, destination, departure_date, price_adl")
        .eq("tour_code", tourCode)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setPrefillData(data);
            setDialogOpen(true);
          }
          searchParams.delete("prefill_tour");
          setSearchParams(searchParams, { replace: true });
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scope = getScope("bookings");
  const { data: myDeptId } = useMyDepartmentId(scope === "department");

  function applyScopeFilter(q: any) {
    if (scope === "personal" && user?.id) {
      q = q.eq("sale_id", user.id);
    } else if (scope === "department" && myDeptId) {
      q = q.eq("department_id", myDeptId);
    }
    return q;
  }

  const { data: totalCount = 0 } = useQuery({
    queryKey: ["bookings-count", scope, myDeptId],
    queryFn: async () => {
      let q = supabase.from("bookings").select("*", { count: "exact", head: true });
      q = applyScopeFilter(q);
      const { count, error } = await q;
      if (error) throw error;
      return count ?? 0;
    },
    enabled: scope === "all" || scope === "personal" || (scope === "department" && !!myDeptId),
  });

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["bookings", page, scope, myDeptId],
    queryFn: async () => {
      let q = supabase
        .from("bookings")
        .select("id, code, customer_id, pax_total, total_value, status, deposit_due_at, remaining_due_at, customers(full_name)")
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      q = applyScopeFilter(q);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: scope === "all" || scope === "personal" || (scope === "department" && !!myDeptId),
  });

  const { data: highNoteMap = {} } = useQuery({
    queryKey: ["booking-high-notes-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_special_notes")
        .select("booking_id")
        .eq("priority", "high");
      if (error) throw error;
      const map: Record<string, number> = {};
      (data || []).forEach((n) => { map[n.booking_id] = (map[n.booking_id] || 0) + 1; });
      return map;
    },
  });

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Đặt tour</h1>
          <p className="text-sm text-muted-foreground">{totalCount} booking</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Tạo booking</Button>
      </div>
      <BookingFormDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setPrefillData(null);
        }}
        prefillData={prefillData}
      />

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
                      <TableCell className="font-mono text-xs">
                        <span className="flex items-center gap-1">
                          {(highNoteMap as Record<string, number>)[b.id] > 0 && <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                          {b.code}
                        </span>
                      </TableCell>
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
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-4 border-t">
            <span className="text-sm text-muted-foreground">Trang {page + 1} / {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Trước</Button>
              <Button variant="outline" size="sm" disabled={(page + 1) * PAGE_SIZE >= totalCount} onClick={() => setPage(p => p + 1)}>Sau</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
