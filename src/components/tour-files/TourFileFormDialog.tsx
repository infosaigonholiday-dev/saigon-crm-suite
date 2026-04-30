import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (id: string) => void;
  bookingId?: string | null;
}

export default function TourFileFormDialog({ open, onOpenChange, onCreated, bookingId }: Props) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [form, setForm] = useState({
    booking_type: "group_tour",
    tour_name: "",
    route: "",
    destination: "",
    departure_date: "",
    return_date: "",
    group_size_estimated: "",
    notes: "",
    sale_owner_id: user?.id || "",
    operation_owner_id: "",
  });

  const { data: profiles } = useQuery({
    queryKey: ["profiles_active_simple"],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, role").eq("is_active", true).order("full_name");
      return data || [];
    },
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const payload: any = {
        booking_type: form.booking_type,
        tour_name: form.tour_name || null,
        route: form.route || null,
        destination: form.destination || null,
        departure_date: form.departure_date || null,
        return_date: form.return_date || null,
        group_size_estimated: form.group_size_estimated ? parseInt(form.group_size_estimated) : null,
        notes: form.notes || null,
        sale_owner_id: form.sale_owner_id || null,
        operation_owner_id: form.operation_owner_id || null,
        booking_id: bookingId || null,
        current_stage: "inquiry",
      };
      if (form.departure_date && form.return_date) {
        const dep = new Date(form.departure_date);
        const ret = new Date(form.return_date);
        const days = Math.max(1, Math.ceil((+ret - +dep) / 86400000) + 1);
        payload.duration_days = days;
        payload.duration_nights = days - 1;
      }
      const { data, error } = await (supabase as any).from("tour_files").insert(payload).select("id").single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      toast.success("Đã tạo hồ sơ tour");
      qc.invalidateQueries({ queryKey: ["tour_files"] });
      onOpenChange(false);
      onCreated?.(id);
    },
    onError: (e: any) => toast.error(e.message || "Không tạo được hồ sơ"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Tạo hồ sơ tour đoàn / MICE</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Loại đoàn *</Label>
            <Select value={form.booking_type} onValueChange={(v) => setForm(f => ({ ...f, booking_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="group_tour">Tour đoàn</SelectItem>
                <SelectItem value="mice">MICE</SelectItem>
                <SelectItem value="school_group">Đoàn trường</SelectItem>
                <SelectItem value="company_trip">Đoàn doanh nghiệp</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Tên tour</Label>
            <Input value={form.tour_name} onChange={(e) => setForm(f => ({ ...f, tour_name: e.target.value }))} placeholder="VD: MICE Vingroup 80 khách Phú Quốc" />
          </div>
          <div>
            <Label>Tuyến</Label>
            <Input value={form.route} onChange={(e) => setForm(f => ({ ...f, route: e.target.value }))} placeholder="HCM - Phú Quốc - HCM" />
          </div>
          <div>
            <Label>Điểm đến chính</Label>
            <Input value={form.destination} onChange={(e) => setForm(f => ({ ...f, destination: e.target.value }))} />
          </div>
          <div>
            <Label>Ngày khởi hành</Label>
            <Input type="date" value={form.departure_date} onChange={(e) => setForm(f => ({ ...f, departure_date: e.target.value }))} />
          </div>
          <div>
            <Label>Ngày về</Label>
            <Input type="date" value={form.return_date} onChange={(e) => setForm(f => ({ ...f, return_date: e.target.value }))} />
          </div>
          <div>
            <Label>Số khách dự kiến</Label>
            <Input type="number" value={form.group_size_estimated} onChange={(e) => setForm(f => ({ ...f, group_size_estimated: e.target.value }))} />
          </div>
          <div />
          <div>
            <Label>Sale phụ trách</Label>
            <Select value={form.sale_owner_id} onValueChange={(v) => setForm(f => ({ ...f, sale_owner_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Chọn..." /></SelectTrigger>
              <SelectContent>
                {(profiles || []).map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Điều hành phụ trách</Label>
            <Select value={form.operation_owner_id} onValueChange={(v) => setForm(f => ({ ...f, operation_owner_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Chọn..." /></SelectTrigger>
              <SelectContent>
                {(profiles || []).map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Ghi chú</Label>
            <Textarea rows={3} value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Huỷ</Button>
          <Button onClick={() => createMut.mutate()} disabled={createMut.isPending || !form.booking_type}>
            {createMut.isPending ? "Đang tạo..." : "Tạo hồ sơ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
