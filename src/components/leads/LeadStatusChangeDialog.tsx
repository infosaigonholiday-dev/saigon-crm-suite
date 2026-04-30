import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const NEXT_ACTIONS = [
  { value: "Gọi lại", label: "📞 Gọi lại" },
  { value: "Gửi email", label: "📧 Gửi email" },
  { value: "Hẹn gặp", label: "🤝 Hẹn gặp" },
  { value: "Gửi báo giá", label: "📄 Gửi báo giá" },
  { value: "Thăm khách", label: "🏢 Thăm khách" },
  { value: "Follow-up", label: "🔁 Follow-up" },
  { value: "Khác", label: "❓ Khác" },
];

const CONTACT_METHODS = [
  { value: "CALL", label: "Gọi điện" },
  { value: "ZALO", label: "Zalo" },
  { value: "EMAIL", label: "Email" },
  { value: "VISIT", label: "Gặp trực tiếp" },
  { value: "SMS", label: "SMS" },
  { value: "OTHER", label: "Khác" },
];

const RESULT_OPTIONS = [
  { value: "NO_ANSWER", label: "Không bắt máy" },
  { value: "BUSY", label: "Khách bận" },
  { value: "NO_NEED", label: "Không nhu cầu" },
  { value: "ALREADY_TRAVELED", label: "Đã đi rồi" },
  { value: "HAS_PARTNER", label: "Có đối tác rồi" },
  { value: "INTERESTED", label: "Quan tâm" },
  { value: "SENT_PROFILE", label: "Đã gửi profile" },
  { value: "CALLBACK", label: "Hẹn gọi lại" },
  { value: "QUOTE_REQUESTED", label: "YC báo giá" },
  { value: "BOOKED", label: "Đã chốt" },
];

function suggestResult(status: string): string {
  switch (status) {
    case "CONTACTED": return "CALLBACK";
    case "INTERESTED": return "INTERESTED";
    case "PROFILE_SENT": return "SENT_PROFILE";
    case "QUOTE_SENT": return "QUOTE_REQUESTED";
    case "WON": return "BOOKED";
    case "LOST": return "NO_NEED";
    case "NO_ANSWER": return "NO_ANSWER";
    default: return "CALLBACK";
  }
}

const TEMPS = [
  { value: "hot", label: "🔥 Nóng", className: "bg-red-500 hover:bg-red-600 text-white border-red-500" },
  { value: "warm", label: "🌤️ Ấm", className: "bg-orange-500 hover:bg-orange-600 text-white border-orange-500" },
  { value: "cold", label: "❄️ Lạnh", className: "bg-blue-500 hover:bg-blue-600 text-white border-blue-500" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  currentTemperature?: string | null;
  targetStatus: string;
  targetStatusLabel: string;
  isLost?: boolean;
  onSuccess?: () => void;
}

export default function LeadStatusChangeDialog({
  open, onOpenChange, leadId, currentTemperature, targetStatus, targetStatusLabel, isLost, onSuccess,
}: Props) {
  const [note, setNote] = useState("");
  const [contactMethod, setContactMethod] = useState("CALL");
  const [result, setResult] = useState<string>(suggestResult(targetStatus));
  const [nextAction, setNextAction] = useState("Gọi lại");
  const [nextDate, setNextDate] = useState<Date | undefined>();
  const [temperature, setTemperature] = useState<string>(currentTemperature || "warm");
  const [lostReason, setLostReason] = useState("");

  useEffect(() => {
    if (open) {
      const d = new Date();
      d.setDate(d.getDate() + 3);
      setNextDate(d);
      setNote("");
      setLostReason("");
      setTemperature(currentTemperature || "warm");
      setNextAction("Gọi lại");
      setContactMethod("CALL");
      setResult(suggestResult(targetStatus));
    }
  }, [open, currentTemperature, targetStatus]);

  const submit = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Chưa đăng nhập");

      // 1. Insert care history (trigger update_lead_from_care will sync last_contact_at, contact_count, follow_up_date)
      const { error: histErr } = await supabase.from("lead_care_history").insert({
        lead_id: leadId,
        contacted_by: user.id,
        contact_method: contactMethod,
        note: note.trim(),
        next_action: nextAction,
        next_contact_date: nextDate ? format(nextDate, "yyyy-MM-dd") : null,
        result,
      });
      if (histErr) throw histErr;

      // 2. Update lead: status + temperature (+ lost_reason if applicable)
      const updates: { status: string; temperature: string; lost_reason?: string } = { status: targetStatus, temperature };
      if (isLost && lostReason.trim()) updates.lost_reason = lostReason.trim();
      const { error: updErr } = await supabase.from("leads").update(updates).eq("id", leadId);
      if (updErr) throw updErr;
    },
    onSuccess: () => {
      toast.success("Đã cập nhật Lead + ghi lịch sử chăm sóc");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err: any) => toast.error("Lỗi cập nhật", { description: err.message }),
  });

  const noteValid = note.trim().length >= 10;
  const dateValid = !!nextDate;
  const resultValid = !!result;
  const lostValid = !isLost || lostReason.trim().length > 0;
  const canSubmit = noteValid && dateValid && resultValid && lostValid && !submit.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cập nhật trạng thái Lead</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Trạng thái mới</Label>
            <div><Badge variant="default" className="text-sm">{targetStatusLabel}</Badge></div>
          </div>

          <div className="space-y-1.5">
            <Label>Nội dung tương tác <span className="text-destructive">*</span></Label>
            <Textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nội dung cuộc gọi / email / meeting... (tối thiểu 10 ký tự)"
            />
            {note.length > 0 && note.trim().length < 10 && (
              <p className="text-xs text-destructive">Cần ít nhất 10 ký tự ({note.trim().length}/10)</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Phương thức</Label>
              <Select value={contactMethod} onValueChange={setContactMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTACT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Hành động tiếp theo <span className="text-destructive">*</span></Label>
              <Select value={nextAction} onValueChange={setNextAction}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NEXT_ACTIONS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Ngày hẹn tiếp theo <span className="text-destructive">*</span></Label>
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

          <div className="space-y-1.5">
            <Label>Mức độ quan tâm</Label>
            <div className="grid grid-cols-3 gap-2">
              {TEMPS.map(t => (
                <Button
                  key={t.value}
                  type="button"
                  variant="outline"
                  onClick={() => setTemperature(t.value)}
                  className={cn("h-9", temperature === t.value && t.className)}
                >
                  {t.label}
                </Button>
              ))}
            </div>
          </div>

          {isLost && (
            <div className="space-y-1.5">
              <Label>Lý do thất bại <span className="text-destructive">*</span></Label>
              <Textarea
                rows={2}
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                placeholder="Tại sao lead thất bại?"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submit.isPending}>Huỷ</Button>
          <Button onClick={() => submit.mutate()} disabled={!canSubmit}>
            {submit.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Xác nhận
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
