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
import { Loader2, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const initial = {
  code: "",
  name: "",
  duration_days: "1",
  duration_nights: "0",
  min_pax: "1",
  max_pax: "50",
  base_price: "",
  currency: "VND",
  description: "",
  status: "ACTIVE",
};

export default function TourPackageFormDialog({ open, onOpenChange }: Props) {
  const [form, setForm] = useState(initial);
  const [destinations, setDestinations] = useState<string[]>([]);
  const [destInput, setDestInput] = useState("");
  const [inclusions, setInclusions] = useState<string[]>([]);
  const [inclInput, setInclInput] = useState("");
  const [exclusions, setExclusions] = useState<string[]>([]);
  const [exclInput, setExclInput] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const qc = useQueryClient();

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const addTag = (list: string[], setList: (v: string[]) => void, input: string, setInput: (v: string) => void) => {
    const val = input.trim();
    if (val && !list.includes(val)) {
      setList([...list, val]);
    }
    setInput("");
  };

  const removeTag = (list: string[], setList: (v: string[]) => void, idx: number) => {
    setList(list.filter((_, i) => i !== idx));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.code.trim()) e.code = "Bắt buộc";
    if (!form.name.trim()) e.name = "Bắt buộc";
    if (!form.base_price || Number(form.base_price) <= 0) e.base_price = "Phải > 0";
    if (Number(form.min_pax) > Number(form.max_pax)) e.max_pax = "max_pax phải >= min_pax";
    if (destinations.length === 0) e.destinations = "Cần ít nhất 1 điểm đến";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tour_packages" as any).insert({
        code: form.code.trim(),
        name: form.name.trim(),
        destination: destinations,
        duration_days: Number(form.duration_days),
        duration_nights: Number(form.duration_nights),
        min_pax: Number(form.min_pax),
        max_pax: Number(form.max_pax),
        base_price: Number(form.base_price),
        currency: form.currency,
        description: form.description || null,
        inclusions,
        exclusions,
        status: form.status,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tạo gói tour thành công");
      qc.invalidateQueries({ queryKey: ["tour-packages"] });
      setForm(initial);
      setDestinations([]);
      setInclusions([]);
      setExclusions([]);
      onOpenChange(false);
    },
    onError: (e: any) => toast.error("Lỗi", { description: e.message }),
  });

  const TagInput = ({
    label, list, setList, input, setInput, error, placeholder,
  }: {
    label: string; list: string[]; setList: (v: string[]) => void;
    input: string; setInput: (v: string) => void; error?: string; placeholder: string;
  }) => (
    <div>
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder={placeholder}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(list, setList, input, setInput); } }} />
        <Button type="button" size="icon" variant="outline" onClick={() => addTag(list, setList, input, setInput)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {list.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {list.map((t, i) => (
            <Badge key={i} variant="secondary" className="gap-1">
              {t}
              <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(list, setList, i)} />
            </Badge>
          ))}
        </div>
      )}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Thêm gói tour</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Mã tour *</Label>
              <Input value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="TOUR-JP-001" />
              {errors.code && <p className="text-xs text-destructive mt-1">{errors.code}</p>}
            </div>
            <div>
              <Label>Tên gói *</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Tour Nhật Bản 7N6Đ" />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
            </div>
          </div>

          <TagInput label="Điểm đến *" list={destinations} setList={setDestinations}
            input={destInput} setInput={setDestInput} error={errors.destinations} placeholder="Thêm điểm đến..." />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Số ngày</Label>
              <Input type="number" min={1} value={form.duration_days} onChange={(e) => set("duration_days", e.target.value)} />
            </div>
            <div>
              <Label>Số đêm</Label>
              <Input type="number" min={0} value={form.duration_nights} onChange={(e) => set("duration_nights", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Số khách tối thiểu</Label>
              <Input type="number" min={1} value={form.min_pax} onChange={(e) => set("min_pax", e.target.value)} />
            </div>
            <div>
              <Label>Số khách tối đa</Label>
              <Input type="number" min={1} value={form.max_pax} onChange={(e) => set("max_pax", e.target.value)} />
              {errors.max_pax && <p className="text-xs text-destructive mt-1">{errors.max_pax}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Giá cơ bản *</Label>
              <Input type="number" value={form.base_price} onChange={(e) => set("base_price", e.target.value)} placeholder="0" />
              {errors.base_price && <p className="text-xs text-destructive mt-1">{errors.base_price}</p>}
            </div>
            <div>
              <Label>Tiền tệ</Label>
              <Select value={form.currency} onValueChange={(v) => set("currency", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="VND">VND</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Mô tả</Label>
            <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} />
          </div>

          <TagInput label="Bao gồm" list={inclusions} setList={setInclusions}
            input={inclInput} setInput={setInclInput} placeholder="VD: Vé máy bay, Khách sạn..." />

          <TagInput label="Không bao gồm" list={exclusions} setList={setExclusions}
            input={exclInput} setInput={setExclInput} placeholder="VD: Visa, Bảo hiểm..." />

          <div>
            <Label>Trạng thái</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Đang hoạt động</SelectItem>
                <SelectItem value="INACTIVE">Tạm ngưng</SelectItem>
                <SelectItem value="ARCHIVED">Lưu trữ</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Huỷ</Button>
          <Button onClick={() => { if (validate()) mutation.mutate(); }} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Tạo gói tour
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
