import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  onSuccess: () => void;
}

const methodOptions = [
  { value: "CALL", label: "Gọi điện" },
  { value: "ZALO", label: "Zalo" },
  { value: "EMAIL", label: "Email" },
  { value: "VISIT", label: "Gặp trực tiếp" },
  { value: "SMS", label: "SMS" },
  { value: "OTHER", label: "Khác" },
];

const resultOptions = [
  { value: "NO_ANSWER", label: "Không bắt máy" },
  { value: "BUSY", label: "Khách bận" },
  { value: "NO_NEED", label: "Không nhu cầu" },
  { value: "ALREADY_TRAVELED", label: "Đã đi rồi" },
  { value: "HAS_PARTNER", label: "Có đối tác rồi" },
  { value: "INTERESTED", label: "Quan tâm" },
  { value: "SENT_PROFILE", label: "Đã gửi profile / kết bạn" },
  { value: "CALLBACK", label: "Hẹn gọi lại" },
  { value: "QUOTE_REQUESTED", label: "Yêu cầu báo giá" },
  { value: "BOOKED", label: "Đã chốt tour" },
];

export default function CareHistoryFormDialog({ open, onOpenChange, leadId, onSuccess }: Props) {
  const { user } = useAuth();
  const [method, setMethod] = useState("CALL");
  const [result, setResult] = useState("NO_ANSWER");
  const [note, setNote] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [nextDate, setNextDate] = useState<Date | undefined>();

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("lead_care_history").insert({
        lead_id: leadId,
        contacted_by: user!.id,
        contact_method: method,
        result,
        note: note || null,
        next_action: nextAction || null,
        next_contact_date: nextDate ? format(nextDate, "yyyy-MM-dd") : null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Đã lưu lịch sử chăm sóc");
      setMethod("CALL");
      setResult("NO_ANSWER");
      setNote("");
      setNextAction("");
      setNextDate(undefined);
      onOpenChange(false);
      onSuccess();
    },
    onError: (err: any) => toast.error("Lỗi", { description: err.message }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Thêm lần chăm sóc</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Phương thức</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {methodOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Kết quả</Label>
              <Select value={result} onValueChange={setResult}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {resultOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Ghi chú chi tiết</Label>
            <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nội dung trao đổi..." />
          </div>
          <div className="space-y-1.5">
            <Label>Hành động tiếp theo</Label>
            <Input value={nextAction} onChange={(e) => setNextAction(e.target.value)} placeholder='VD: "Gọi lại thứ 5", "Gửi báo giá Đà Lạt"' />
          </div>
          <div className="space-y-1.5">
            <Label>Ngày liên hệ kế tiếp</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !nextDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {nextDate ? format(nextDate, "dd/MM/yyyy") : "Chọn ngày"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={nextDate} onSelect={setNextDate} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Huỷ</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
