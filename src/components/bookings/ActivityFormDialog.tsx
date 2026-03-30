import { useState } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export interface Activity {
  time: string;
  description: string;
  type: "DiChuyen" | "ThamQuan" | "AnUong" | "NhanPhong" | "TuDo";
  supplier: string | null;
  status: "DaDat" | "ChoXacNhan" | "CoVanDe";
  notes: string | null;
}

const activityTypes = [
  { value: "DiChuyen", label: "🚌 Di chuyển" },
  { value: "ThamQuan", label: "🏛️ Tham quan" },
  { value: "AnUong", label: "🍽️ Ăn uống" },
  { value: "NhanPhong", label: "🏨 Nhận phòng" },
  { value: "TuDo", label: "⏱️ Tự do" },
];

const statusOptions = [
  { value: "DaDat", label: "✅ Đã đặt" },
  { value: "ChoXacNhan", label: "⏳ Chờ xác nhận" },
  { value: "CoVanDe", label: "⚠️ Có vấn đề" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (activity: Activity) => void;
  initial?: Activity;
}

const defaultActivity: Activity = {
  time: "08:00",
  description: "",
  type: "ThamQuan",
  supplier: null,
  status: "ChoXacNhan",
  notes: null,
};

export default function ActivityFormDialog({ open, onOpenChange, onSave, initial }: Props) {
  const [form, setForm] = useState<Activity>(initial ?? defaultActivity);
  const [error, setError] = useState("");

  const set = (k: keyof Activity, v: any) => {
    setForm((p) => ({ ...p, [k]: v }));
    setError("");
  };

  const handleSave = () => {
    if (!form.description.trim()) {
      setError("Mô tả là bắt buộc");
      return;
    }
    onSave({ ...form, description: form.description.trim() });
    setForm(defaultActivity);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Sửa hoạt động" : "Thêm hoạt động"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Giờ</Label>
              <Input type="time" value={form.time} onChange={(e) => set("time", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Loại</Label>
              <Select value={form.type} onValueChange={(v) => set("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {activityTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Mô tả <span className="text-destructive">*</span></Label>
            <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Nhà cung cấp</Label>
            <Input value={form.supplier ?? ""} onChange={(e) => set("supplier", e.target.value || null)} />
          </div>

          <div className="space-y-1.5">
            <Label>Trạng thái</Label>
            <RadioGroup value={form.status} onValueChange={(v) => set("status", v)} className="flex gap-4">
              {statusOptions.map((s) => (
                <div key={s.value} className="flex items-center space-x-1.5">
                  <RadioGroupItem value={s.value} id={`status-${s.value}`} />
                  <Label htmlFor={`status-${s.value}`} className="font-normal text-sm">{s.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-1.5">
            <Label>Ghi chú</Label>
            <Textarea value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value || null)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Huỷ</Button>
          <Button onClick={handleSave}>Lưu</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
