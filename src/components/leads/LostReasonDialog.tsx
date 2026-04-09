import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetStatus: string;
  onConfirm: (data: { lost_reason?: string; next_contact_date?: string }) => void;
}

export default function LostReasonDialog({ open, onOpenChange, targetStatus, onConfirm }: Props) {
  const [reason, setReason] = useState("");
  const [nextDate, setNextDate] = useState<Date | undefined>();

  const isLost = targetStatus === "LOST";
  const needsDate = targetStatus === "NURTURE" || targetStatus === "DORMANT";

  const handleConfirm = () => {
    if (isLost && !reason.trim()) return;
    if (needsDate && !nextDate) return;
    onConfirm({
      lost_reason: isLost ? reason : undefined,
      next_contact_date: nextDate ? format(nextDate, "yyyy-MM-dd") : undefined,
    });
    setReason("");
    setNextDate(undefined);
    onOpenChange(false);
  };

  const title = isLost ? "Lý do thất bại" : targetStatus === "NURTURE" ? "Chăm sóc dài hạn" : "Tạm ngưng";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {isLost && (
            <div className="space-y-1.5">
              <Label>Lý do <span className="text-destructive">*</span></Label>
              <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Tại sao lead thất bại?" />
            </div>
          )}
          {needsDate && (
            <div className="space-y-1.5">
              <Label>Ngày gọi lại <span className="text-destructive">*</span></Label>
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
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Huỷ</Button>
          <Button onClick={handleConfirm} disabled={isLost ? !reason.trim() : needsDate ? !nextDate : false}>
            Xác nhận
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
