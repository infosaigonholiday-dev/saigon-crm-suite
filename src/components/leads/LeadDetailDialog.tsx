import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, Building2, MapPin, Calendar, Users, DollarSign } from "lucide-react";
import { format } from "date-fns";
import CareHistoryTab from "./CareHistoryTab";
import AuditHistoryTab from "./AuditHistoryTab";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: any;
}

const statusLabels: Record<string, string> = {
  NEW: "Mới", NO_ANSWER: "KBM", CONTACTED: "Đã liên hệ",
  INTERESTED: "Quan tâm", PROFILE_SENT: "Đã gửi profile",
  QUOTE_SENT: "Đã báo giá", NEGOTIATING: "Đàm phán",
  WON: "Thành công", LOST: "Thất bại",
  NURTURE: "Chăm sóc dài hạn", DORMANT: "Tạm ngưng",
};

const tempLabels: Record<string, string> = {
  hot: "🔥 Nóng", warm: "🟠 Ấm", cold: "🔵 Lạnh",
};

function formatVND(v: number | null) {
  if (!v) return "—";
  if (v >= 1_000_000) return `${Math.round(v / 1_000_000).toLocaleString("vi-VN")} triệu`;
  return v.toLocaleString("vi-VN") + " đ";
}

function InfoRow({ icon: Icon, label, value }: { icon?: any; label: string; value: any }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 py-1.5">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />}
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm">{value}</p>
      </div>
    </div>
  );
}

export default function LeadDetailDialog({ open, onOpenChange, lead }: Props) {
  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-lg">{lead.full_name}</DialogTitle>
            <Badge variant="outline">{statusLabels[lead.status] ?? lead.status}</Badge>
            <span className="text-sm">{tempLabels[lead.temperature] ?? ""}</span>
          </div>
        </DialogHeader>

        <Tabs defaultValue="info" className="mt-2">
          <TabsList>
            <TabsTrigger value="info">Thông tin</TabsTrigger>
            <TabsTrigger value="history">Lịch sử chăm sóc</TabsTrigger>
            <TabsTrigger value="audit">Lịch sử sửa đổi</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-3">
            {/* Basic */}
            <div className="grid grid-cols-2 gap-x-6">
              <InfoRow icon={Phone} label="Điện thoại" value={lead.phone} />
              <InfoRow icon={Mail} label="Email" value={lead.email} />
              <InfoRow label="Kênh" value={lead.channel} />
              <InfoRow label="Loại quan tâm" value={lead.interest_type} />
            </div>

            {/* Business */}
            {(lead.company_name || lead.contact_person || lead.tax_code) && (
              <div className="border-t pt-3">
                <p className="text-sm font-semibold mb-2">🏢 Doanh nghiệp</p>
                <div className="grid grid-cols-2 gap-x-6">
                  <InfoRow icon={Building2} label="Công ty" value={lead.company_name} />
                  <InfoRow label="Địa chỉ" value={lead.company_address} />
                  <InfoRow label="Người liên hệ" value={lead.contact_person} />
                  <InfoRow label="Chức vụ" value={lead.contact_position} />
                  <InfoRow label="Quy mô" value={lead.company_size ? `${lead.company_size} nhân sự` : null} />
                  <InfoRow label="MST" value={lead.tax_code} />
                </div>
              </div>
            )}

            {/* Tour needs */}
            <div className="border-t pt-3">
              <p className="text-sm font-semibold mb-2">✈️ Nhu cầu tour</p>
              <div className="grid grid-cols-2 gap-x-6">
                <InfoRow icon={MapPin} label="Điểm đến" value={lead.destination} />
                <InfoRow icon={Calendar} label="Ngày dự kiến" value={lead.planned_travel_date ? format(new Date(lead.planned_travel_date), "dd/MM/yyyy") : null} />
                <InfoRow icon={Users} label="Số khách" value={lead.pax_count} />
                <InfoRow icon={DollarSign} label="Ngân sách" value={formatVND(lead.budget)} />
                <InfoRow label="Giá trị kỳ vọng" value={formatVND(lead.expected_value)} />
                <InfoRow label="Follow-up" value={lead.follow_up_date ? format(new Date(lead.follow_up_date), "dd/MM/yyyy") : null} />
                <InfoRow label="Nhắc hẹn" value={lead.reminder_date ? format(new Date(lead.reminder_date), "dd/MM/yyyy") : null} />
                <InfoRow label="Số lần liên hệ" value={lead.contact_count ?? 0} />
              </div>
            </div>

            {/* Notes */}
            {lead.call_notes && (
              <div className="border-t pt-3">
                <p className="text-sm font-semibold mb-1">Ghi chú</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{lead.call_notes}</p>
              </div>
            )}

            {lead.lost_reason && (
              <div className="border-t pt-3">
                <p className="text-sm font-semibold mb-1 text-destructive">Lý do thất bại</p>
                <p className="text-sm">{lead.lost_reason}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-3">
            <CareHistoryTab leadId={lead.id} />
          </TabsContent>

          <TabsContent value="audit" className="mt-3">
            <AuditHistoryTab tableName="leads" recordId={lead.id} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
