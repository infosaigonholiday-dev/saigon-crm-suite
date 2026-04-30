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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, AlertCircle, AlertTriangle, Loader2, Printer, Briefcase } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { useMyDepartmentId } from "@/hooks/useScopedQuery";
import { canPrintBookingConfirmation, DEPT_PRINT_ROLES } from "@/lib/bookingPrintAccess";
import { BOOKING_TYPE_LABEL } from "@/lib/tourFileWorkflow";
import TourFileFormDialog from "@/components/tour-files/TourFileFormDialog";

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
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [tourFileFor, setTourFileFor] = useState<{ bookingId: string } | null>(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { getScope } = usePermissions();
  const { user, userRole } = useAuth();

  // Helper: chuyển "DD/MM/YYYY" hoặc "D/M/YYYY" → "YYYY-MM-DD". Nếu đã ISO thì giữ nguyên.
  function ddmmyyyyToISO(s?: string | null): string | null {
    if (!s) return null;
    const str = String(s).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
    const m = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (!m) return null;
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // Đọc prefill_tour từ URL khi từ LKH Tour 2026 chuyển sang
  useEffect(() => {
    const tourCode = searchParams.get("prefill_tour");
    if (tourCode) {
      supabase
        .from("b2b_tours")
        .select("tour_code, destination, departure_date, return_date, price_adl, price_chd, price_inf")
        .eq("tour_code", tourCode)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setPrefillData({
              ...data,
              departure_date: ddmmyyyyToISO(data.departure_date as any),
              return_date: ddmmyyyyToISO(data.return_date as any),
            });
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

  // Lấy department_id cho check quyền in (cần thiết cho MANAGER/GDKD ngay cả khi scope=all).
  const needPrintDept = (DEPT_PRINT_ROLES as readonly string[]).includes(userRole || "") && scope !== "department";
  const { data: myDeptIdForPrint } = useMyDepartmentId(needPrintDept);
  const effectiveMyDeptId = myDeptId ?? myDeptIdForPrint ?? null;

  function applyScopeFilter(q: any) {
    if (scope === "personal" && user?.id) {
      q = q.eq("sale_id", user.id);
    } else if (scope === "department" && myDeptId) {
      q = q.eq("department_id", myDeptId);
    }
    return q;
  }

  const { data: totalCount = 0 } = useQuery({
    queryKey: ["bookings-count", scope, myDeptId, typeFilter],
    queryFn: async () => {
      let q = supabase.from("bookings").select("*", { count: "exact", head: true });
      q = applyScopeFilter(q);
      if (typeFilter !== "all") q = q.eq("booking_type", typeFilter);
      const { count, error } = await q;
      if (error) throw error;
      return count ?? 0;
    },
    enabled: scope === "all" || scope === "personal" || (scope === "department" && !!myDeptId),
  });

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["bookings", page, scope, myDeptId, typeFilter],
    queryFn: async () => {
      let q = supabase
        .from("bookings")
        .select("id, code, customer_id, sale_id, department_id, pax_total, total_value, status, deposit_due_at, remaining_due_at, booking_type, customers(full_name)")
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      q = applyScopeFilter(q);
      if (typeFilter !== "all") q = q.eq("booking_type", typeFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: scope === "all" || scope === "personal" || (scope === "department" && !!myDeptId),
  });

  // Map booking_id -> tour_file (id, code) cho các booking hiện có
  const bookingIds = (bookings || []).map((b: any) => b.id);
  const { data: tourFileMap = {} } = useQuery({
    queryKey: ["bookings-tour-files-map", bookingIds],
    enabled: bookingIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("tour_files")
        .select("id, tour_file_code, booking_id")
        .in("booking_id", bookingIds);
      if (error) throw error;
      const map: Record<string, { id: string; code: string }> = {};
      (data || []).forEach((tf: any) => {
        if (tf.booking_id) map[tf.booking_id] = { id: tf.id, code: tf.tour_file_code };
      });
      return map;
    },
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
        <CardContent className="p-3 flex flex-wrap gap-3 items-center">
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(0); }}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Loại booking" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả loại</SelectItem>
              <SelectItem value="retail">Khách lẻ</SelectItem>
              <SelectItem value="group_tour">Tour đoàn</SelectItem>
              <SelectItem value="mice">MICE</SelectItem>
              <SelectItem value="school_group">Đoàn trường</SelectItem>
              <SelectItem value="company_trip">Đoàn doanh nghiệp</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

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
                  <TableHead>Loại</TableHead>
                  <TableHead>Hồ sơ đoàn</TableHead>
                  <TableHead className="text-center">Số khách</TableHead>
                  <TableHead>Tổng tiền</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Hạn cọc</TableHead>
                  <TableHead>Hạn thanh toán</TableHead>
                  <TableHead className="text-center w-[80px]">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((b) => {
                  const status = (b.status as BookingStatus) ?? "PENDING";
                  const cfg = statusConfig[status] ?? statusConfig.PENDING;
                  const depositOverdue = status === "PENDING" && isOverdue(b.deposit_due_at);
                  const paymentOverdue = status === "DEPOSITED" && isOverdue(b.remaining_due_at);
                  const customerName = (b.customers as any)?.full_name ?? "—";
                  const canPrint = canPrintBookingConfirmation({
                    userRole,
                    userId: user?.id,
                    myDeptId: effectiveMyDeptId,
                    booking: { sale_id: (b as any).sale_id, department_id: (b as any).department_id },
                  });
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
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        {canPrint ? (
                          <DropdownMenu>
                            <TooltipProvider delayDuration={200}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <Printer className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                </TooltipTrigger>
                                <TooltipContent>In phiếu xác nhận</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  window.open(`/dat-tour/${b.id}/in-xac-nhan?type=le`, "_blank", "noopener,noreferrer")
                                }
                              >
                                ✈ Tour lẻ (Cá nhân/Gia đình)
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  window.open(`/dat-tour/${b.id}/in-xac-nhan?type=doan`, "_blank", "noopener,noreferrer")
                                }
                              >
                                🚌 Tour đoàn (Nhóm/Doanh nghiệp)
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {bookings.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Không có dữ liệu</TableCell></TableRow>
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
