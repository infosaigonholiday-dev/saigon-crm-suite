import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultTourPackageId?: string;
}

const MEALS = ["Sáng", "Trưa", "Tối"];

const initial = {
  tour_package_id: "",
  day_number: "1",
  title: "",
  description: "",
  transportation: "",
  accommodation_id: "",
};

export default function ItineraryFormDialog({ open, onOpenChange, defaultTourPackageId }: Props) {
  const [form, setForm] = useState({ ...initial, tour_package_id: defaultTourPackageId ?? "" });
  const [meals, setMeals] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const qc = useQueryClient();

  const { data: tourPackages } = useQuery({
    queryKey: ["tour-packages-select"],
    queryFn: async () => {
      const { data } = await supabase.from("tour_packages" as any).select("id, name, code").order("name");
      return (data ?? []) as any[];
    },
    enabled: open,
  });

  const { data: accommodations } = useQuery({
    queryKey: ["accommodations-select"],
    queryFn: async () => {
      const { data } = await supabase.from("accommodations" as any).select("id, name, city").eq("status", "ACTIVE").order("name");
      return (data ?? []) as any[];
    },
    enabled: open,
  });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const toggleMeal = (meal: string) => {
    setMeals((prev) => prev.includes(meal) ? prev.filter((m) => m !== meal) : [...prev, meal]);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.tour_package_id) e.tour_package_id = "Bắt buộc";
    if (!form.title.trim()) e.title = "Bắt buộc";
    if (!form.day_number || Number(form.day_number) < 1) e.day_number = "Phải >= 1";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tour_itineraries" as any).insert({
        tour_package_id: form.tour_package_id,
        day_number: Number(form.day_number),
        title: form.title.trim(),
        description: form.description || null,
        meals_included: meals,
        transportation: form.transportation || null,
        accommodation_id: form.accommodation_id || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Thêm lịch trình thành công");
      qc.invalidateQueries({ queryKey: ["tour-itineraries"] });
      setForm({ ...initial, tour_package_id: defaultTourPackageId ?? "" });
      setMeals([]);
      onOpenChange(false);
    },
    onError: (e: any) => toast({ title: "Lỗi", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Thêm lịch trình ngày</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          <div>
            <Label>Gói tour *</Label>
            <Select value={form.tour_package_id} onValueChange={(v) => set("tour_package_id", v)}>
              <SelectTrigger><SelectValue placeholder="Chọn gói tour" /></SelectTrigger>
              <SelectContent>
                {tourPackages?.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>{t.code} - {t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.tour_package_id && <p className="text-xs text-destructive mt-1">{errors.tour_package_id}</p>}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Ngày thứ *</Label>
              <Input type="number" min={1} value={form.day_number} onChange={(e) => set("day_number", e.target.value)} />
              {errors.day_number && <p className="text-xs text-destructive mt-1">{errors.day_number}</p>}
            </div>
            <div className="col-span-2">
              <Label>Tiêu đề *</Label>
              <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Ngày 1: Khởi hành Tokyo" />
              {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
            </div>
          </div>

          <div>
            <Label>Mô tả chi tiết</Label>
            <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} />
          </div>

          <div>
            <Label>Bữa ăn bao gồm</Label>
            <div className="flex gap-4 mt-1">
              {MEALS.map((meal) => (
                <label key={meal} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={meals.includes(meal)} onCheckedChange={() => toggleMeal(meal)} />
                  {meal}
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label>Phương tiện di chuyển</Label>
            <Input value={form.transportation} onChange={(e) => set("transportation", e.target.value)} placeholder="Xe bus, Tàu cao tốc..." />
          </div>

          <div>
            <Label>Điểm lưu trú</Label>
            <Select value={form.accommodation_id} onValueChange={(v) => set("accommodation_id", v)}>
              <SelectTrigger><SelectValue placeholder="Chọn khách sạn (tuỳ chọn)" /></SelectTrigger>
              <SelectContent>
                {accommodations?.map((a: any) => (
                  <SelectItem key={a.id} value={a.id}>{a.name} {a.city ? `(${a.city})` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Huỷ</Button>
          <Button onClick={() => { if (validate()) mutation.mutate(); }} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Thêm lịch trình
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
