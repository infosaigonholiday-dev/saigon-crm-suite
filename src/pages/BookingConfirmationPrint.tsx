import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Loader2, Printer, ArrowLeft, Pencil } from "lucide-react";
import { toast } from "sonner";
import { canPrintBookingConfirmation } from "@/lib/bookingPrintAccess";
import { useCompanyInfo, parseBank } from "@/hooks/useCompanyInfo";

const fmtVnd = (v: number | null | undefined) =>
  v && v > 0 ? new Intl.NumberFormat("vi-VN").format(v) + " ₫" : "";

const fmtDate = (s: string | null | undefined) => {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("vi-VN");
};

const fmtDateTime = (s: string | null | undefined) => {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return `${d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} – ${d.toLocaleDateString("vi-VN")}`;
};

export default function BookingConfirmationPrint() {
  const { id } = useParams<{ id: string }>();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [iframeReady, setIframeReady] = useState(false);
  const [editOn, setEditOn] = useState(false);

  const printType = (search.get("type") === "doan" ? "doan" : "le") as "le" | "doan";

  const { data: booking, isLoading: loadingBk } = useQuery({
    queryKey: ["print-booking", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, customers(*)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: sale } = useQuery({
    queryKey: ["print-sale", booking?.sale_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", booking!.sale_id!)
        .maybeSingle();
      return data;
    },
    enabled: !!booking?.sale_id,
  });

  const { data: quote } = useQuery({
    queryKey: ["print-quote", booking?.quote_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("quotations")
        .select("*, tour_packages(name, code, duration_days, duration_nights)")
        .eq("id", booking!.quote_id!)
        .maybeSingle();
      return data;
    },
    enabled: !!booking?.quote_id,
  });

  // Fallback: tour_package_id linked directly (no quote)
  const { data: directPackage } = useQuery({
    queryKey: ["print-tour-package", (booking as any)?.tour_package_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("tour_packages")
        .select("name, code, duration_days, duration_nights")
        .eq("id", (booking as any).tour_package_id)
        .maybeSingle();
      return data;
    },
    enabled: !!(booking as any)?.tour_package_id && !booking?.quote_id,
  });

  const { data: myProfile } = useQuery({
    queryKey: ["print-my-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("department_id")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Permission check
  const canPrint = useMemo(
    () =>
      canPrintBookingConfirmation({
        userRole,
        userId: user?.id,
        myDeptId: myProfile?.department_id,
        booking,
      }),
    [booking, user, userRole, myProfile]
  );

  useEffect(() => {
    if (!loadingBk && booking && user && userRole && myProfile !== undefined && !canPrint) {
      toast.error("Bạn không có quyền in phiếu xác nhận booking này");
      navigate(-1);
    }
  }, [canPrint, booking, loadingBk, user, userRole, myProfile, navigate]);

  // Build data map
  const dataMap = useMemo(() => {
    if (!booking) return null;
    const c: any = booking.customers || {};
    const tp: any = quote?.tour_packages || directPackage || {};
    const manualName = (booking as any).tour_name_manual as string | null | undefined;

    const isB2B = c.type === "B2B" || c.type === "CORPORATE";
    const cust_name = isB2B ? (c.contact_person || c.full_name || "") : (c.full_name || "");
    const cust_phone = isB2B ? (c.contact_person_phone || c.phone || "") : (c.phone || "");

    // pax_details: { adults, children, infants } or similar
    const pd = (booking.pax_details as any) || {};
    const adl = pd.adults ?? pd.adult ?? pd.adl ?? null;
    const chd = pd.children ?? pd.child ?? pd.chd ?? null;
    const inf = pd.infants ?? pd.infant ?? pd.inf ?? null;
    const paxParts: string[] = [];
    if (adl != null && Number(adl) > 0) paxParts.push(`${adl} NL`);
    if (chd != null && Number(chd) > 0) paxParts.push(`${chd} TE`);
    if (inf != null && Number(inf) > 0) paxParts.push(`${inf} EB`);
    const cust_pax = paxParts.length ? paxParts.join(" + ") : `${booking.pax_total ?? 0} khách`;

    const dur = tp.duration_days
      ? `${tp.duration_days}N${tp.duration_nights ?? Math.max(0, tp.duration_days - 1)}Đ`
      : "";

    const created = booking.created_at ? new Date(booking.created_at) : null;
    const holdDeadline = created
      ? new Date(created.getTime() + 48 * 3600 * 1000).toLocaleString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "";

    return {
      booking_code: booking.code || "",
      grp_booking_code: booking.code || "",
      booking_date: fmtDate(booking.created_at),
      hold_deadline: holdDeadline,
      staff_name_sb: sale?.full_name || "",
      cust_staff: sale?.full_name || "",
      staff_phone: sale?.phone || "",
      customer_name: cust_name,
      grp_leader: cust_name,
      grp_leader_v: cust_name,
      grp_company: c.company_name || "",
      cust_name,
      cust_phone,
      cust_email: c.email || c.company_email || "",
      cust_id: c.id_number || "",
      cust_pax,
      grp_pax_count: cust_pax,
      tour_name: tp.name || manualName || "[Chưa có thông tin tour]",
      tour_name_v: tp.name || manualName || "[Chưa có thông tin tour]",
      grp_tour_name: tp.name || manualName || "[Chưa có thông tin tour]",
      tour_code: tp.code || "—",
      tour_start: fmtDate(quote?.valid_from),
      tour_end: fmtDate(quote?.valid_until),
      tour_duration: dur,
      total: fmtVnd(booking.total_value as number),
      deposit: fmtVnd(booking.deposit_amount as number),
      remaining: fmtVnd(booking.remaining_amount as number),
      remaining_due: fmtDate(booking.remaining_due_at),
    };
  }, [booking, quote, sale, directPackage]);

  // Send to iframe
  const handleIframeLoad = () => {
    if (!iframeRef.current?.contentWindow || !dataMap) return;
    iframeRef.current.contentWindow.postMessage(
      { type: "fill", data: dataMap, printType },
      "*"
    );
    setIframeReady(true);
  };

  // Re-send if data updates after iframe already loaded
  useEffect(() => {
    if (iframeReady && iframeRef.current?.contentWindow && dataMap) {
      iframeRef.current.contentWindow.postMessage(
        { type: "fill", data: dataMap, printType },
        "*"
      );
    }
  }, [dataMap, iframeReady, printType]);

  const doPrint = () => {
    iframeRef.current?.contentWindow?.focus();
    iframeRef.current?.contentWindow?.postMessage({ type: "print" }, "*");
  };

  const toggleEdit = () => {
    iframeRef.current?.contentWindow?.postMessage({ type: "toggleEdit" }, "*");
    setEditOn((v) => !v);
  };

  if (loadingBk || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="sticky top-0 z-10 bg-card border-b shadow-sm print:hidden">
        <div className="max-w-[900px] mx-auto px-4 py-3 flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Quay lại
          </Button>
          <div className="flex-1 text-sm font-medium">
            Phiếu xác nhận booking{" "}
            <span className="text-primary">{booking.code}</span>{" "}
            <span className="text-muted-foreground">
              ({printType === "le" ? "Tour lẻ" : "Tour đoàn"})
            </span>
          </div>
          <Button variant={editOn ? "default" : "outline"} size="sm" onClick={toggleEdit}>
            <Pencil className="h-4 w-4 mr-2" /> {editOn ? "Đang chỉnh sửa" : "Chỉnh sửa"}
          </Button>
          <Button size="sm" onClick={doPrint}>
            <Printer className="h-4 w-4 mr-2" /> In PDF
          </Button>
        </div>
      </div>

      <div className="py-4 print:py-0">
        <iframe
          ref={iframeRef}
          src={`/print/booking-confirmation.html?type=${printType}`}
          onLoad={handleIframeLoad}
          title="Phiếu xác nhận booking"
          className="w-full border-0 mx-auto block bg-white"
          style={{ maxWidth: 860, height: "calc(100vh - 80px)" }}
        />
      </div>
    </div>
  );
}
