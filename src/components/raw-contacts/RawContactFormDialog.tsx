import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface RawContactFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // form state (controlled by parent for backwards compatibility)
  phone: string;
  setPhone: (v: string) => void;
  name: string;
  setName: (v: string) => void;
  company: string;
  setCompany: (v: string) => void;
  type: string;
  setType: (v: string) => void;
  source: string;
  setSource: (v: string) => void;
  companySize: string;
  setCompanySize: (v: string) => void;
  plannedEventDate: string;
  setPlannedEventDate: (v: string) => void;
  note: string;
  setNote: (v: string) => void;
  checkingPhone?: boolean;
  phoneWarning?: string | null;
  isSubmitting?: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  title?: string;
}

/**
 * Form dialog cho module Kho Data (raw_contacts).
 * Tách từ trang RawContacts để chuẩn hoá theo pattern các module khác.
 */
export function RawContactFormDialog({
  open,
  onOpenChange,
  phone,
  setPhone,
  name,
  setName,
  company,
  setCompany,
  type,
  setType,
  source,
  setSource,
  companySize,
  setCompanySize,
  plannedEventDate,
  setPlannedEventDate,
  note,
  setNote,
  checkingPhone,
  phoneWarning,
  isSubmitting,
  onSubmit,
  onCancel,
  title = "Thêm data mới",
}: RawContactFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Số điện thoại *</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09xxxxxxxx"
            />
            {checkingPhone && (
              <p className="text-xs text-muted-foreground mt-1">Đang kiểm tra...</p>
            )}
            {phoneWarning && (
              <p className="text-xs text-destructive mt-1">⚠️ {phoneWarning}</p>
            )}
          </div>
          <div>
            <Label>Người phụ trách</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nguyễn Văn A"
            />
          </div>
          <div>
            <Label>Công ty</Label>
            <Input value={company} onChange={(e) => setCompany(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Loại</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Cá nhân</SelectItem>
                  <SelectItem value="b2b">Doanh nghiệp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nguồn</Label>
              <Input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Zalo, FB..."
              />
            </div>
          </div>
          {type === "b2b" && (
            <div>
              <Label>Quy mô nhân sự</Label>
              <Input
                value={companySize}
                onChange={(e) => setCompanySize(e.target.value)}
                placeholder="VD: 50-100 người"
              />
            </div>
          )}
          <div>
            <Label>Thời gian tổ chức dự kiến</Label>
            <Input
              type="date"
              value={plannedEventDate}
              onChange={(e) => setPlannedEventDate(e.target.value)}
            />
          </div>
          <div>
            <Label>Ghi chú</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Hủy
          </Button>
          <Button
            onClick={onSubmit}
            disabled={!phone || isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Thêm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
