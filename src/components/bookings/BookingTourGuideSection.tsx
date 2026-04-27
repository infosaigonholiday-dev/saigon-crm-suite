import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { UserCog, Save } from "lucide-react";
import { toast } from "sonner";

interface Props {
  bookingId: string;
  customerName?: string;
  bookingCode?: string;
  initial: {
    tour_guide_id: string | null;
    tour_guide_note: string | null;
    departure_date: string | null;
    return_date: string | null;
    pax_total: number | null;
  };
  canAssign: boolean;
}

export default function BookingTourGuideSection({ bookingId, customerName, bookingCode, initial, canAssign }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    tour_guide_id: initial.tour_guide_id ?? "",
    tour_guide_note: initial.tour_guide_note ?? "",
    departure_date: initial.departure_date ?? "",
    return_date: initial.return_date ?? "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      tour_guide_id: initial.tour_guide_id ?? "",
      tour_guide_note: initial.tour_guide_note ?? "",
      departure_date: initial.departure_date ?? "",
      return_date: initial.return_date ?? "",
    });
  }, [initial.tour_guide_id, initial.tour_guide_note, initial.departure_date, initial.return_date]);

  const { data: guides = [] } = useQuery({
    queryKey: ["available-tour-guides"],
    queryFn: async () => {
      // Lấy NV active có position liên quan HDV hoặc profile.role=TOUR
      const { data, error } = await supabase
        .from("employees")
        .select("id, full_name, position, profile_id, profiles:profile_id(role)")
        .eq("status", "ACTIVE")
        .order("full_name");
      if (error) throw error;
      return (data ?? []).filter((e: any) => {
        const pos = (e.position ?? "").toLowerCase();
        const role = e.profiles?.role ?? "";
        return role === "TOUR" || pos.includes("hdv") || pos.includes("hướng dẫn") || pos.includes("guide");
      });
    },
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const prevGuide = initial.tour_guide_id;
      const newGuide = form.tour_guide_id || null;

      const { error } = await supabase
        .from("bookings")
        .update({
          tour_guide_id: newGuide,
          tour_guide_note: form.tour_guide_note || null,
          departure_date: form.departure_date || null,
          return_date: form.return_date || null,
        })
        .eq("id", bookingId);
      if (error) throw error;

      // Notify HDV nếu được phân công mới
      if (newGuide && newGuide !== prevGuide) {
        const guide = guides.find((g: any) => g.id === newGuide);
        if (guide?.profile_id) {
          await supabase.from("notifications").insert({
            user_id: guide.profile_id,
            type: "TOUR_ASSIGNMENT",
            title: `🎒 Bạn được phân công tour: ${bookingCode ?? bookingId.slice(0, 8)}`,
            message: `KH: ${customerName ?? "—"} — Khởi hành: ${form.departure_date || "chưa rõ"} — ${initial.pax_total ?? 0} khách`,
            entity_type: "booking",
            entity_id: bookingId,
            priority: "high",
          });
        }
      }

      toast.success("Đã lưu phân công HDV");
      qc.invalidateQueries({ queryKey: ["booking", bookingId] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-2">
          <UserCog className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Hướng dẫn viên & Lịch khởi hành</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>HDV phụ trách</Label>
            <Select
              value={form.tour_guide_id || "none"}
              onValueChange={(v) => setForm({ ...form, tour_guide_id: v === "none" ? "" : v })}
              disabled={!canAssign}
            >
              <SelectTrigger><SelectValue placeholder="Chọn HDV..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Chưa phân công —</SelectItem>
                {guides.map((g: any) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.full_name} {g.position ? `(${g.position})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {guides.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">Chưa có nhân viên HDV trong hệ thống</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Ngày khởi hành</Label>
              <Input
                type="date"
                value={form.departure_date}
                onChange={(e) => setForm({ ...form, departure_date: e.target.value })}
                disabled={!canAssign}
              />
            </div>
            <div>
              <Label>Ngày về</Label>
              <Input
                type="date"
                value={form.return_date}
                onChange={(e) => setForm({ ...form, return_date: e.target.value })}
                disabled={!canAssign}
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <Label>Ghi chú bàn giao HDV</Label>
            <Textarea
              value={form.tour_guide_note}
              onChange={(e) => setForm({ ...form, tour_guide_note: e.target.value })}
              rows={3}
              placeholder="Thông tin đặc biệt cần bàn giao cho HDV..."
              disabled={!canAssign}
            />
          </div>
        </div>

        {canAssign ? (
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-1" /> Lưu phân công
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Chỉ Điều hành / ADMIN mới được phân công HDV.</p>
        )}
      </CardContent>
    </Card>
  );
}
