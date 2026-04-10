import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Phone, Mail, Building2, MapPin, Calendar, Users, DollarSign, Pencil, ExternalLink, UserPlus, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import CareHistoryTab from "./CareHistoryTab";
import AuditHistoryTab from "./AuditHistoryTab";
import LeadFormDialog from "./LeadFormDialog";
import ConvertToCustomerDialog from "./ConvertToCustomerDialog";
import LostReasonDialog from "./LostReasonDialog";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";

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
  const [editOpen, setEditOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [transitionDialog, setTransitionDialog] = useState<{ open: boolean; status: string }>({ open: false, status: "" });
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: async ({ status, extra }: { status: string; extra?: Record<string, any> }) => {
      const { error } = await supabase.from("leads").update({ status, ...extra }).eq("id", lead.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leads"] }),
  });

  const handleStatusSelect = (newStatus: string) => {
    if (newStatus === "LOST" || newStatus === "NURTURE" || newStatus === "DORMANT") {
      setTransitionDialog({ open: true, status: newStatus });
    } else if (newStatus === "WON") {
      updateStatus.mutate({ status: "WON" }, {
        onSuccess: () => {
          toast.success("Đã chuyển sang Thành công");
          if (!lead.converted_customer_id) setConvertOpen(true);
        },
      });
    } else {
      updateStatus.mutate({ status: newStatus }, {
        onSuccess: () => toast.success(`Đã chuyển sang ${statusLabels[newStatus] ?? newStatus}`),
      });
    }
  };

  const handleTransitionConfirm = (data: { lost_reason?: string; next_contact_date?: string }) => {
    const extra: Record<string, any> = {};
    if (data.lost_reason) extra.lost_reason = data.lost_reason;
    if (data.next_contact_date) extra.follow_up_date = data.next_contact_date;
    updateStatus.mutate({ status: transitionDialog.status, extra }, {
      onSuccess: () => toast.success(`Đã chuyển sang ${statusLabels[transitionDialog.status]}`),
    });
  };

  // Query extra info: assigned profile name, created_by name, department name
  const { data: extraInfo } = useQuery({
    queryKey: ["lead-extra-info", lead?.id, lead?.assigned_to, lead?.created_by, lead?.department_id],
    queryFn: async () => {
      const result: { assignedName: string | null; createdByName: string | null; deptName: string | null } = {
        assignedName: null, createdByName: null, deptName: null,
      };
      if (lead.assigned_to) {
        const { data } = await supabase.from("profiles").select("full_name").eq("id", lead.assigned_to).single();
        result.assignedName = data?.full_name ?? null;
      }
      if (lead.created_by && lead.created_by !== lead.assigned_to) {
        const { data } = await supabase.from("profiles").select("full_name").eq("id", lead.created_by).single();
        result.createdByName = data?.full_name ?? null;
      } else if (lead.created_by === lead.assigned_to) {
        result.createdByName = result.assignedName;
      }
      if (lead.department_id) {
        const { data } = await supabase.from("departments").select("name").eq("id", lead.department_id).single();
        result.deptName = data?.name ?? null;
      }
      return result;
    },
    enabled: !!lead && open,
  });

  if (!lead) return null;

  const canEdit = user?.id === lead.assigned_to || user?.id === lead.created_by || hasPermission("leads", "edit");
  const canConvert = ["WON", "NEGOTIATING", "QUOTE_SENT"].includes(lead.status) && !lead.converted_customer_id;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 flex-wrap">
              <DialogTitle className="text-lg">{lead.full_name}</DialogTitle>
              <Badge variant="outline">{statusLabels[lead.status] ?? lead.status}</Badge>
              <span className="text-sm">{tempLabels[lead.temperature] ?? ""}</span>
              <div className="ml-auto flex gap-1">
                {canConvert && (
                  <Button
                    size="sm"
                    className="gap-1 bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => setConvertOpen(true)}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Chuyển thành KH
                  </Button>
                )}
                {canEdit && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() => setEditOpen(true)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Sửa
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          {/* Converted customer link */}
          {lead.converted_customer_id && (
            <div className="rounded-md border border-green-200 bg-green-50 p-2 text-sm flex items-center gap-2">
              <Badge className="bg-green-100 text-green-700 border-green-200">Đã chuyển KH</Badge>
              <Link to={`/khach-hang/${lead.converted_customer_id}`} className="text-primary hover:underline inline-flex items-center gap-1">
                Xem Khách hàng <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          )}

          <Tabs defaultValue="info" className="mt-2">
            <TabsList>
              <TabsTrigger value="info">Thông tin</TabsTrigger>
              <TabsTrigger value="history">Lịch sử chăm sóc</TabsTrigger>
              <TabsTrigger value="audit">Lịch sử sửa đổi</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4 mt-3">
              {/* Section 1: Contact Info */}
              <div>
                <p className="text-sm font-semibold mb-2">👤 Thông tin liên hệ</p>
                <div className="grid grid-cols-2 gap-x-6">
                  <InfoRow icon={Phone} label="Điện thoại" value={lead.phone} />
                  <InfoRow icon={Mail} label="Email" value={lead.email} />
                  <InfoRow label="Kênh" value={lead.channel} />
                  <InfoRow label="Loại quan tâm" value={lead.interest_type} />
                  <InfoRow label="NV phụ trách" value={extraInfo?.assignedName ?? lead.assigned_profile_name} />
                  <InfoRow label="Phòng ban" value={extraInfo?.deptName} />
                </div>
              </div>

              {/* Section 2: Business */}
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

              {/* Section 3: Tour needs */}
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

              {/* Meta info */}
              <div className="border-t pt-3">
                <p className="text-sm font-semibold mb-2">📋 Thông tin meta</p>
                <div className="grid grid-cols-2 gap-x-6">
                  <InfoRow label="Ngày tạo" value={lead.created_at ? format(new Date(lead.created_at), "dd/MM/yyyy HH:mm") : null} />
                  <InfoRow label="Người tạo" value={extraInfo?.createdByName} />
                  <InfoRow label="Lần liên hệ cuối" value={lead.last_contact_at ? format(new Date(lead.last_contact_at), "dd/MM/yyyy HH:mm") : null} />
                  <InfoRow label="Số lần liên hệ" value={lead.contact_count ?? 0} />
                </div>
              </div>
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

      <LeadFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        editData={lead}
      />

      <ConvertToCustomerDialog
        open={convertOpen}
        onOpenChange={setConvertOpen}
        lead={lead}
      />
    </>
  );
}
