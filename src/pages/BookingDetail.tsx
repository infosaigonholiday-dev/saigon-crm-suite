import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import BookingItineraryTab from "@/components/bookings/BookingItineraryTab";
import BookingServicesTab from "@/components/bookings/BookingServicesTab";
import BookingSpecialNotesTab from "@/components/bookings/BookingSpecialNotesTab";
import BookingGuestsTab from "@/components/bookings/BookingGuestsTab";
import BookingTourGuideSection from "@/components/bookings/BookingTourGuideSection";
import { PrintConfirmationButton } from "@/components/bookings/PrintConfirmationButton";
import InternalNotes from "@/components/shared/InternalNotes";
import { NotesCountBadge } from "@/components/shared/NotesCountBadge";
import { useAutoMarkNotificationsRead } from "@/hooks/useAutoMarkNotificationsRead";

type BookingStatus = "PENDING" | "DEPOSITED" | "PAID" | "COMPLETED" | "CANCELLED";

const statusConfig: Record<BookingStatus, { label: string; className: string }> = {
  PENDING: { label: "Chờ cọc", className: "bg-warning/15 text-warning border-warning/30" },
  DEPOSITED: { label: "Đã cọc", className: "bg-accent/15 text-accent border-accent/30" },
  PAID: { label: "Đã thanh toán", className: "bg-success/15 text-success border-success/30" },
  COMPLETED: { label: "Hoàn thành", className: "bg-primary/10 text-primary border-primary/20" },
  CANCELLED: { label: "Đã huỷ", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

const formatCurrency = (v: number | null) =>
  v ? new Intl.NumberFormat("vi-VN").format(v) + "đ" : "—";

export default function BookingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { userRole } = useAuth();
  const { hasPermission } = usePermissions();
  useAutoMarkNotificationsRead("booking", id);

  const { data: booking, isLoading } = useQuery({
    queryKey: ["booking", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, customers(full_name, phone, email)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // High priority notes for banner
  const { data: highNotes = [] } = useQuery({
    queryKey: ["booking-high-notes", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_special_notes")
        .select("content, note_type")
        .eq("booking_id", id!)
        .eq("priority", "high");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Không tìm thấy booking</p>
        <Button variant="link" onClick={() => navigate("/dat-tour")}>Quay lại</Button>
      </div>
    );
  }

  const status = (booking.status as BookingStatus) ?? "PENDING";
  const cfg = statusConfig[status] ?? statusConfig.PENDING;
  const customer = booking.customers as any;

  const canEditNotes = hasPermission("bookings", "edit");
  const canDeleteNotes = hasPermission("bookings", "delete");
  const isLocked = status === "COMPLETED" || status === "CANCELLED";

  // HDV assignment: chỉ DIEUHAN + ADMIN
  const canAssignGuide =
    !isLocked &&
    ["ADMIN", "SUPER_ADMIN", "DIEUHAN"].includes(String(userRole ?? ""));

  // Edit guests: SALE phụ trách + DIEUHAN + ADMIN
  const isOwner = booking.sale_id && user?.id === booking.sale_id;
  const canEditGuests =
    !isLocked &&
    (["ADMIN", "SUPER_ADMIN", "DIEUHAN", "GDKD", "MANAGER"].includes(String(userRole ?? "")) ||
      isOwner);


  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dat-tour")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{booking.code}</h1>
            <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {customer?.full_name ?? "Không có KH"} • {booking.pax_total ?? 0} khách • {formatCurrency(booking.total_value)}
          </p>
        </div>
        <PrintConfirmationButton booking={{ id: booking.id, sale_id: booking.sale_id, department_id: booking.department_id }} />
      </div>

      {/* Locked booking banner */}
      {isLocked && (
        <Alert className="border-warning/40 bg-warning/10">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription className="flex items-center gap-2 flex-wrap">
            <span>
              Booking đã <strong>{status === "COMPLETED" ? "hoàn thành/đóng" : "huỷ"}</strong> — không thể chỉnh sửa.
            </span>
            <Badge variant="outline" className="bg-warning/15 text-warning border-warning/30">
              Chỉ CEO/ADMIN có thể mở lại
            </Badge>
          </AlertDescription>
        </Alert>
      )}

      {/* Cảnh báo deposit > total */}
      {Number(booking.deposit_amount ?? 0) > Number(booking.total_value ?? 0) && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            ⚠️ Cảnh báo: Số tiền đặt cọc ({Number(booking.deposit_amount ?? 0).toLocaleString("vi-VN")}đ)
            lớn hơn tổng tiền booking ({Number(booking.total_value ?? 0).toLocaleString("vi-VN")}đ).
            Vui lòng kiểm tra lại.
          </AlertDescription>
        </Alert>
      )}

      {/* High priority notes banner */}
      {highNotes.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <span className="font-medium">Lưu ý quan trọng:</span>{" "}
            {highNotes.map((n: any) => n.content).join(" • ")}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Thông tin</TabsTrigger>
          <TabsTrigger value="itinerary">Lịch trình</TabsTrigger>
          <TabsTrigger value="services">Dự toán chi</TabsTrigger>
          <TabsTrigger value="notes">
            Lưu ý
            {highNotes.length > 0 && (
              <span className="ml-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {highNotes.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="internal-notes">
            Ghi chú <NotesCountBadge entityType="booking" entityId={booking.id} />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground">Khách hàng</p>
                  <p className="font-medium">{customer?.full_name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">SĐT</p>
                  <p className="font-medium">{customer?.phone ?? "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{customer?.email ?? "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Số khách</p>
                  <p className="font-medium">{booking.pax_total ?? 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tổng tiền</p>
                  <p className="font-medium">{formatCurrency(booking.total_value)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Đặt cọc</p>
                  <p className="font-medium">{formatCurrency(booking.deposit_amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Hạn cọc</p>
                  <p className="font-medium">{booking.deposit_due_at ?? "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Hạn thanh toán</p>
                  <p className="font-medium">{booking.remaining_due_at ?? "—"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="itinerary" className="mt-4">
          <BookingItineraryTab bookingId={booking.id} readOnly={isLocked} />
        </TabsContent>

        <TabsContent value="services" className="mt-4">
          <BookingServicesTab bookingId={booking.id} readOnly={isLocked} />
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <BookingSpecialNotesTab bookingId={booking.id} canEdit={canEditNotes && !isLocked} canDelete={canDeleteNotes && !isLocked} />
        </TabsContent>

        <TabsContent value="internal-notes" className="mt-4">
          <InternalNotes entityType="booking" entityId={booking.id} entityName={booking.code} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
