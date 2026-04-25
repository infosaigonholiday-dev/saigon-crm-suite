import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { FileText, CalendarPlus, Plane } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";

export interface B2BTour {
  id: string;
  tour_code: string;
  target_market: string | null;
  destination: string | null;
  thang: string | null;
  departure_date: string | null;
  flight_dep_code: string | null;
  flight_dep_time: string | null;
  return_date: string | null;
  flight_ret_code: string | null;
  flight_ret_time: string | null;
  price_adl: number | null;
  price_chd: number | null;
  price_inf: number | null;
  commission_adl: number | null;
  commission_chd: number | null;
  commission_inf: number | null;
  available_seats: string | null;
  hold_seats: string | null;
  notes: string | null;
  visa_deadline: string | null;
  itinerary_url: string | null;
}

const fmtVnd = (v: number | null | undefined) =>
  v && v > 0 ? `${Math.round(v).toLocaleString("vi-VN")}đ` : "—";

const calcCommission = (raw: number | null | undefined) =>
  Math.max(0, (raw ?? 0) - 200000);

interface Props {
  tour: B2BTour | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function B2BTourDetailSheet({ tour, open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: userName } = useQuery({
    queryKey: ["my-profile-name", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
      return data?.full_name ?? user?.email ?? null;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Log view_detail when sheet opens
  useEffect(() => {
    if (open && tour && user?.id) {
      supabase.from("b2b_tour_logs").insert({
        tour_code: tour.tour_code,
        user_id: user.id,
        user_name: userName ?? user?.email ?? null,
        action: "view_detail",
      }).then(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tour?.id]);

  if (!tour) return null;

  const handleDownloadItinerary = async () => {
    if (!tour.itinerary_url) return;
    await supabase.from("b2b_tour_logs").insert({
      tour_code: tour.tour_code,
      user_id: user!.id,
      user_name: userName ?? user?.email ?? null,
      action: "download_itinerary",
    });
    window.open(tour.itinerary_url, "_blank");
  };

  const handleCreateBooking = async () => {
    await supabase.from("b2b_tour_logs").insert({
      tour_code: tour.tour_code,
      user_id: user!.id,
      user_name: userName ?? user?.email ?? null,
      action: "create_booking",
    });
    navigate(`/dat-tour?prefill_tour=${encodeURIComponent(tour.tour_code)}`);
  };

  const hasItinerary = !!tour.itinerary_url;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pr-6">
          <SheetTitle className="font-mono text-base">{tour.tour_code}</SheetTitle>
          <SheetDescription>
            {tour.destination} {tour.thang ? `• ${tour.thang}` : ""}
            {tour.target_market ? ` • ${tour.target_market}` : ""}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Section 1: Chuyến bay */}
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <Plane className="h-3.5 w-3.5" /> Chuyến bay
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between bg-muted/40 rounded-md p-3">
                <span className="text-muted-foreground">Bay đi</span>
                <span className="font-medium">
                  {tour.flight_dep_code ?? "—"} {tour.flight_dep_time ? `| ${tour.flight_dep_time}` : ""}
                  <span className="text-muted-foreground ml-2">{tour.departure_date}</span>
                </span>
              </div>
              <div className="flex justify-between bg-muted/40 rounded-md p-3">
                <span className="text-muted-foreground">Bay về</span>
                <span className="font-medium">
                  {tour.flight_ret_code ?? "—"} {tour.flight_ret_time ? `| ${tour.flight_ret_time}` : ""}
                  <span className="text-muted-foreground ml-2">{tour.return_date}</span>
                </span>
              </div>
            </div>
          </section>

          <Separator />

          {/* Section 2: Bảng giá */}
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Bảng giá đầy đủ
            </h4>
            <div className="rounded-md border overflow-hidden text-sm">
              <div className="grid grid-cols-3 bg-muted/60 px-3 py-2 font-medium text-xs text-muted-foreground">
                <div>Loại</div>
                <div className="text-right">Giá</div>
                <div className="text-right">HH</div>
              </div>
              {[
                { label: "Người lớn (ADL)", price: tour.price_adl, com: tour.commission_adl },
                { label: "Trẻ em (CHD)", price: tour.price_chd, com: tour.commission_chd },
                { label: "Em bé (INF)", price: tour.price_inf, com: tour.commission_inf },
              ].map((row) => (
                <div key={row.label} className="grid grid-cols-3 px-3 py-2.5 border-t">
                  <div className="text-muted-foreground">{row.label}</div>
                  <div className="text-right font-medium">{fmtVnd(row.price)}</div>
                  <div className="text-right font-medium text-success">{fmtVnd(calcCommission(row.com))}</div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              * Hoa hồng đã trừ 200.000đ phí dịch vụ
            </p>
          </section>

          <Separator />

          {/* Section 3: Thông tin khác */}
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Thông tin khác
            </h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Còn nhận</span>
                <span className="font-medium">{tour.available_seats ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Giữ chỗ</span>
                <span className="font-medium">{tour.hold_seats ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hạn Visa</span>
                {tour.visa_deadline ? (
                  <Badge variant="outline" className="border-orange-500/40 text-orange-700 bg-orange-50">
                    {tour.visa_deadline}
                  </Badge>
                ) : (
                  <span>—</span>
                )}
              </div>
              {tour.notes && (
                <div>
                  <div className="text-muted-foreground mb-1">Ghi chú</div>
                  <div className="bg-muted/40 rounded-md p-3 whitespace-pre-line text-xs">{tour.notes}</div>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-2 sticky bottom-0 bg-background pt-4 border-t">
          {hasItinerary ? (
            <Button onClick={handleDownloadItinerary} className="bg-green-600 hover:bg-green-700 text-white">
              <FileText className="h-4 w-4 mr-2" /> Xem Lịch Trình
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button disabled className="w-full bg-green-600/50 text-white">
                    <FileText className="h-4 w-4 mr-2" /> Xem Lịch Trình
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>Chưa có lịch trình — liên hệ điều hành để cập nhật</TooltipContent>
            </Tooltip>
          )}
          <Button onClick={handleCreateBooking} className="bg-teal-600 hover:bg-teal-700 text-white">
            <CalendarPlus className="h-4 w-4 mr-2" /> Tạo Booking
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
