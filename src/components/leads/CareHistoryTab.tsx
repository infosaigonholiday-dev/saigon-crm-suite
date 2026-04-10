import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Phone, MessageSquare, Mail, MapPin, Send, HelpCircle, Database } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import CareHistoryFormDialog from "./CareHistoryFormDialog";

const methodIcons: Record<string, any> = {
  CALL: Phone, ZALO: MessageSquare, EMAIL: Mail,
  VISIT: MapPin, SMS: Send, OTHER: HelpCircle,
};

const methodLabels: Record<string, string> = {
  CALL: "Gọi điện", ZALO: "Zalo", EMAIL: "Email",
  VISIT: "Gặp trực tiếp", SMS: "SMS", OTHER: "Khác",
};

const resultConfig: Record<string, { label: string; variant: "default" | "destructive" | "outline" | "secondary"; className?: string }> = {
  NO_ANSWER: { label: "Không bắt máy", variant: "secondary" },
  BUSY: { label: "Khách bận", variant: "secondary" },
  NO_NEED: { label: "Không nhu cầu", variant: "destructive" },
  ALREADY_TRAVELED: { label: "Đã đi rồi", variant: "destructive" },
  HAS_PARTNER: { label: "Có đối tác rồi", variant: "destructive" },
  INTERESTED: { label: "Quan tâm", variant: "default", className: "bg-green-100 text-green-700 border-green-200" },
  SENT_PROFILE: { label: "Đã gửi profile", variant: "outline", className: "bg-orange-100 text-orange-700 border-orange-200" },
  CALLBACK: { label: "Hẹn gọi lại", variant: "outline", className: "bg-orange-100 text-orange-700 border-orange-200" },
  QUOTE_REQUESTED: { label: "YC báo giá", variant: "default", className: "bg-green-100 text-green-700 border-green-200" },
  BOOKED: { label: "Đã chốt tour", variant: "default", className: "bg-green-100 text-green-700 border-green-200" },
};

export default function CareHistoryTab({ leadId }: { leadId: string }) {
  const [formOpen, setFormOpen] = useState(false);
  const qc = useQueryClient();

  const { data: history = [], isLoading } = useQuery({
    queryKey: ["care-history", leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_care_history")
        .select("*, contacted_by_profile:profiles!lead_care_history_contacted_by_fkey(full_name)")
        .eq("lead_id", leadId)
        .order("contacted_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // FIX 7: Query raw_contacts linked to this lead
  const { data: rawContact } = useQuery({
    queryKey: ["raw-contact-for-lead", leadId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("raw_contacts")
        .select("id, full_name, phone, call_count, last_called_at, note, created_at") as any)
        .eq("converted_lead_id", leadId)
        .limit(1)
        .maybeSingle();
      if (error) return null;
      return data as { id: string; full_name: string | null; phone: string; call_count: number; last_called_at: string | null; note: string | null; created_at: string } | null;
    },
  });

  const totalContactCount = (history.length) + (rawContact?.call_count ?? 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm font-medium">
          Lịch sử liên hệ ({history.length})
          {rawContact && rawContact.call_count > 0 && (
            <span className="text-muted-foreground ml-1">
              — Tổng: {totalContactCount} (Kho Data: {rawContact.call_count} + Tiềm năng: {history.length})
            </span>
          )}
        </p>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Thêm
        </Button>
      </div>

      <CareHistoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        leadId={leadId}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ["care-history", leadId] });
          qc.invalidateQueries({ queryKey: ["leads"] });
        }}
      />

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : history.length === 0 && !rawContact ? (
        <p className="text-sm text-muted-foreground text-center py-8">Chưa có lịch sử chăm sóc</p>
      ) : (
        <div className="relative pl-6 space-y-4">
          <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />

          {/* Care history entries */}
          {history.map((entry: any) => {
            const MethodIcon = methodIcons[entry.contact_method] ?? HelpCircle;
            const rc = resultConfig[entry.result] ?? { label: entry.result, variant: "outline" as const };
            const profileName = entry.contacted_by_profile?.full_name ?? "N/A";

            return (
              <div key={entry.id} className="relative">
                <div className="absolute -left-4 top-1 w-4 h-4 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                  <MethodIcon className="h-2.5 w-2.5 text-primary" />
                </div>
                <div className="bg-muted/40 rounded-lg p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{methodLabels[entry.contact_method]}</span>
                      <Badge variant={rc.variant} className={`text-xs ${"className" in rc ? (rc as any).className : ""}`}>{rc.label}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(entry.contacted_at), "dd/MM/yyyy HH:mm")}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Bởi: {profileName}</p>
                  {entry.note && <p className="text-sm">{entry.note}</p>}
                  {entry.next_action && (
                    <p className="text-xs text-blue-600">
                      ▶ {entry.next_action}
                      {entry.next_contact_date && ` — ${format(new Date(entry.next_contact_date), "dd/MM/yyyy")}`}
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {/* FIX 7: Raw contact history at the bottom */}
          {rawContact && rawContact.call_count > 0 && (
            <div className="relative">
              <div className="absolute -left-4 top-1 w-4 h-4 rounded-full bg-background border-2 border-muted-foreground flex items-center justify-center">
                <Database className="h-2.5 w-2.5 text-muted-foreground" />
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700 border-orange-200">Từ Kho Data</Badge>
                    <span className="text-xs text-muted-foreground">{rawContact.call_count} lần gọi</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {rawContact.last_called_at ? format(new Date(rawContact.last_called_at), "dd/MM/yyyy HH:mm") : format(new Date(rawContact.created_at), "dd/MM/yyyy")}
                  </span>
                </div>
                {rawContact.note && <p className="text-sm whitespace-pre-wrap">{rawContact.note}</p>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
