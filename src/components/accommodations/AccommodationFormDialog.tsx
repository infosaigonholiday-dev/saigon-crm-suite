import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, X, Star } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const TYPES = [
  { value: "HOTEL", label: "Khách sạn" },
  { value: "RESORT", label: "Resort" },
  { value: "HOSTEL", label: "Hostel" },
  { value: "HOMESTAY", label: "Homestay" },
  { value: "OTHER", label: "Khác" },
];

const initial = {
  name: "",
  type: "HOTEL",
  location: "",
  city: "",
  country: "Việt Nam",
  rating: "3",
  contact_phone: "",
  contact_email: "",
  website: "",
  notes: "",
  status: "ACTIVE",
};

export default function AccommodationFormDialog({ open, onOpenChange }: Props) {
  const [form, setForm] = useState(initial);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [amenInput, setAmenInput] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const qc = useQueryClient();

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const addAmenity = () => {
    const val = amenInput.trim();
    if (val && !amenities.includes(val)) setAmenities([...amenities, val]);
    setAmenInput("");
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Bắt buộc";
    if (!form.location.trim()) e.location = "Bắt buộc";
    if (form.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email))
      e.contact_email = "Email không hợp lệ";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("accommodations" as any).insert({
        name: form.name.trim(),
        type: form.type,
        location: form.location.trim(),
        city: form.city || null,
        country: form.country || null,
        rating: Number(form.rating),
        contact_phone: form.contact_phone || null,
        contact_email: form.contact_email || null,
        website: form.website || null,
        amenities,
        notes: form.notes || null,
        status: form.status,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Thêm điểm lưu trú thành công");
      qc.invalidateQueries({ queryKey: ["accommodations"] });
      setForm(initial);
      setAmenities([]);
      onOpenChange(false);
    },
    onError: (e: any) => toast.error("Lỗi", { description: e.message }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Thêm điểm lưu trú</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tên *</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Tên khách sạn / resort" />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
            </div>
            <div>
              <Label>Loại *</Label>
              <Select value={form.type} onValueChange={(v) => set("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Địa chỉ *</Label>
            <Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Số 123, Đường ABC..." />
            {errors.location && <p className="text-xs text-destructive mt-1">{errors.location}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Thành phố</Label>
              <Input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Đà Nẵng" />
            </div>
            <div>
              <Label>Quốc gia</Label>
              <Input value={form.country} onChange={(e) => set("country", e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Đánh giá ({form.rating} sao)</Label>
            <div className="flex gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} type="button" onClick={() => set("rating", String(s))}>
                  <Star className={`h-5 w-5 ${Number(form.rating) >= s ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`} />
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Điện thoại</Label>
              <Input value={form.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={form.contact_email} onChange={(e) => set("contact_email", e.target.value)} />
              {errors.contact_email && <p className="text-xs text-destructive mt-1">{errors.contact_email}</p>}
            </div>
          </div>

          <div>
            <Label>Website</Label>
            <Input value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://..." />
          </div>

          <div>
            <Label>Tiện nghi</Label>
            <div className="flex gap-2">
              <Input value={amenInput} onChange={(e) => setAmenInput(e.target.value)} placeholder="Wifi, Hồ bơi, Spa..."
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAmenity(); } }} />
              <Button type="button" size="icon" variant="outline" onClick={addAmenity}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {amenities.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {amenities.map((a, i) => (
                  <Badge key={i} variant="secondary" className="gap-1">
                    {a}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setAmenities(amenities.filter((_, idx) => idx !== i))} />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label>Ghi chú</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
          </div>

          <div>
            <Label>Trạng thái</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Hoạt động</SelectItem>
                <SelectItem value="INACTIVE">Tạm ngưng</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Huỷ</Button>
          <Button onClick={() => { if (validate()) mutation.mutate(); }} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Thêm lưu trú
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
