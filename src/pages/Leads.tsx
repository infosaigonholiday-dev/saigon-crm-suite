import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import LeadFormDialog from "@/components/leads/LeadFormDialog";
import LeadDetailDialog from "@/components/leads/LeadDetailDialog";
import LostReasonDialog from "@/components/leads/LostReasonDialog";
import LeadTableView from "@/components/leads/LeadTableView";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Plus, GripVertical, Phone, Loader2, MapPin, Users, AlertTriangle, UserPlus,
  LayoutGrid, List,
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { useMyDepartmentId } from "@/hooks/useScopedQuery";

const PAGE_SIZE = 20;

type LeadStatus = "NEW" | "NO_ANSWER" | "CONTACTED" | "INTERESTED" | "PROFILE_SENT" | "QUOTE_SENT" | "NEGOTIATING" | "WON" | "LOST" | "NURTURE" | "DORMANT";

const columns: { id: LeadStatus; label: string; color: string }[] = [
  { id: "NEW", label: "Mới", color: "bg-secondary" },
  { id: "NO_ANSWER", label: "KBM", color: "bg-orange-50" },
  { id: "CONTACTED", label: "Đã liên hệ", color: "bg-blue-50" },
  { id: "INTERESTED", label: "Quan tâm", color: "bg-green-50" },
  { id: "PROFILE_SENT", label: "Đã gửi profile", color: "bg-purple-50" },
  { id: "QUOTE_SENT", label: "Đã báo giá", color: "bg-blue-100" },
  { id: "NEGOTIATING", label: "Đàm phán", color: "bg-orange-100" },
  { id: "WON", label: "Chốt tour", color: "bg-green-100" },
  { id: "LOST", label: "Thất bại", color: "bg-destructive/10" },
  { id: "NURTURE", label: "Chăm sóc DH", color: "bg-yellow-50" },
  { id: "DORMANT", label: "Tạm ngưng", color: "bg-muted" },
];

const tempConfig: Record<string, { icon: string; className: string }> = {
  hot: { icon: "🔥", className: "text-red-500" },
  warm: { icon: "🟠", className: "text-orange-500" },
  cold: { icon: "🔵", className: "text-blue-500" },
};

function getFollowUpStatus(date: string | null): "overdue" | "today" | null {
  if (!date) return null;
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (d.getTime() < today.getTime()) return "overdue";
  if (d.getTime() === today.getTime()) return "today";
  return null;
}

export default function Leads() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { getScope } = usePermissions();
  const { user } = useAuth();

  const scope = getScope("leads");
  const { data: myDeptId } = useMyDepartmentId(scope === "department");

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [page, setPage] = useState(0);

  // Detail dialog
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Lost/Nurture/Dormant dialog
  const [transitionDialog, setTransitionDialog] = useState<{ open: boolean; status: string; leadId: string }>({
    open: false, status: "", leadId: "",
  });

  function applyScopeFilter(q: any) {
    if (scope === "personal" && user?.id) {
      q = q.eq("assigned_to", user.id);
    } else if (scope === "department" && myDeptId) {
      q = q.eq("department_id", myDeptId);
    }
    return q;
  }

  const { data: totalCount = 0 } = useQuery({
    queryKey: ["leads-count", scope, myDeptId],
    queryFn: async () => {
      let q = supabase.from("leads").select("*", { count: "exact", head: true });
      q = applyScopeFilter(q);
      const { count, error } = await q;
      if (error) throw error;
      return count ?? 0;
    },
    enabled: scope === "all" || scope === "personal" || (scope === "department" && !!myDeptId),
  });

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads", page, scope, myDeptId],
    queryFn: async () => {
      let q = supabase
        .from("leads")
        .select("id, full_name, phone, email, channel, interest_type, expected_value, status, budget, destination, pax_count, temperature, follow_up_date, call_notes, company_name, company_address, contact_person, contact_position, company_size, tax_code, planned_travel_date, reminder_date, contact_count, lost_reason, assigned_to, customer_id, last_contact_at, assigned_profile:profiles!leads_assigned_to_fkey(full_name)")
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      q = applyScopeFilter(q);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map((l: any) => ({
        ...l,
        assigned_profile_name: l.assigned_profile?.full_name ?? null,
      }));
    },
    enabled: scope === "all" || scope === "personal" || (scope === "department" && !!myDeptId),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, extra }: { id: string; status: string; extra?: Record<string, any> }) => {
      const { error } = await supabase.from("leads").update({ status, ...extra }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leads"] }),
  });

  const convertToCustomer = useMutation({
    mutationFn: async (lead: any) => {
      if (lead.status !== "WON") {
        throw new Error("Chỉ có thể chuyển đổi lead có trạng thái 'Chốt tour' (WON)");
      }
      const { data: customer, error: custErr } = await supabase
        .from("customers")
        .insert({
          full_name: lead.full_name,
          phone: lead.phone || null,
          email: lead.email || null,
          company_name: lead.company_name || null,
          company_address: lead.company_address || null,
          contact_person: lead.contact_person || null,
          contact_position: lead.contact_position || null,
          assigned_sale_id: lead.assigned_to || null,
          department_id: lead.department_id || null,
          type: lead.company_name ? "CORPORATE" : "INDIVIDUAL",
          source: lead.channel || null,
          tour_interest: lead.interest_type || lead.destination || null,
          notes: lead.call_notes || null,
          tax_code: lead.tax_code || null,
          company_size: lead.company_size || null,
        })
        .select("id")
        .single();
      if (custErr) throw custErr;

      const { error: leadErr } = await supabase
        .from("leads")
        .update({ customer_id: customer.id, converted_customer_id: customer.id } as any)
        .eq("id", lead.id);
      if (leadErr) throw leadErr;
      return customer;
    },
    onSuccess: (customer) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Đã chuyển đổi thành khách hàng");
      // Navigate to create booking for the new customer
      navigate(`/khach-hang/${customer.id}`);
    },
    onError: (err: any) => toast.error("Lỗi", { description: err.message }),
  });

  const handleDragStart = useCallback((id: string) => setDraggedId(id), []);

  const handleDrop = useCallback(
    (status: LeadStatus) => {
      if (!draggedId) return;
      // Statuses needing extra input
      if (status === "LOST" || status === "NURTURE" || status === "DORMANT") {
        setTransitionDialog({ open: true, status, leadId: draggedId });
        setDraggedId(null);
        return;
      }
      updateStatus.mutate({ id: draggedId, status });
      setDraggedId(null);
    },
    [draggedId, updateStatus]
  );

  const handleTransitionConfirm = (data: { lost_reason?: string; next_contact_date?: string }) => {
    const extra: Record<string, any> = {};
    if (data.lost_reason) extra.lost_reason = data.lost_reason;
    if (data.next_contact_date) extra.follow_up_date = data.next_contact_date;
    updateStatus.mutate({ id: transitionDialog.leadId, status: transitionDialog.status, extra });
  };

  const formatValue = (v: number | null) => {
    if (!v) return "";
    return v >= 1_000_000 ? `${Math.round(v / 1_000_000)}tr` : v.toLocaleString("vi-VN");
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tiềm năng (Lead)</h1>
          <p className="text-sm text-muted-foreground">{totalCount} lead</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === "kanban" ? "default" : "ghost"}
              size="sm"
              className="gap-1 rounded-r-none"
              onClick={() => setViewMode("kanban")}
            >
              <LayoutGrid className="h-4 w-4" />
              Kanban
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              className="gap-1 rounded-l-none"
              onClick={() => setViewMode("table")}
            >
              <List className="h-4 w-4" />
              Bảng
            </Button>
          </div>
          <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Thêm lead</Button>
        </div>
      </div>
      <LeadFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <LeadDetailDialog open={detailOpen} onOpenChange={setDetailOpen} lead={selectedLead} />
      <LostReasonDialog
        open={transitionDialog.open}
        onOpenChange={(o) => setTransitionDialog((p) => ({ ...p, open: o }))}
        targetStatus={transitionDialog.status}
        onConfirm={handleTransitionConfirm}
      />

      {viewMode === "table" ? (
        <LeadTableView
          leads={leads}
          onClickLead={(lead) => { setSelectedLead(lead); setDetailOpen(true); }}
        />
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {columns.map((col) => {
            const colLeads = leads.filter((l) => l.status === col.id);
            return (
              <div key={col.id} className="min-w-[240px] flex-shrink-0" onDragOver={(e) => e.preventDefault()} onDrop={() => handleDrop(col.id)}>
                <div className={`rounded-t-lg px-3 py-2 ${col.color}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-xs">{col.label}</span>
                    <Badge variant="secondary" className="text-xs h-5">{colLeads.length}</Badge>
                  </div>
                </div>
                <div className="bg-muted/30 rounded-b-lg min-h-[350px] p-1.5 space-y-1.5">
                  {colLeads.map((lead) => {
                    const temp = tempConfig[lead.temperature ?? "warm"];
                    const followUpStatus = getFollowUpStatus(lead.follow_up_date);
                    const showConvert = col.id === "WON" && !lead.customer_id;

                    const borderClass = followUpStatus === "overdue" || followUpStatus === "today"
                      ? "border-l-[3px] border-l-red-500"
                      : lead.temperature === "hot"
                        ? "border-l-[3px] border-l-orange-400"
                        : "";

                    return (
                      <Card
                        key={lead.id}
                        draggable
                        onDragStart={() => handleDragStart(lead.id)}
                        onClick={() => { setSelectedLead(lead); setDetailOpen(true); }}
                        className={`cursor-pointer transition-shadow hover:shadow-md ${borderClass} ${draggedId === lead.id ? "opacity-50" : ""}`}
                      >
                        <CardContent className="p-2.5">
                          <div className="flex items-start gap-1.5">
                            <GripVertical className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0 cursor-grab" />
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center gap-1">
                                {temp && <span className="text-xs">{temp.icon}</span>}
                                <p className="font-medium text-xs truncate flex-1">{lead.full_name}</p>
                              </div>

                              {lead.destination && (
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                  <MapPin className="h-2.5 w-2.5 shrink-0" />
                                  <span className="truncate">{lead.destination}</span>
                                </div>
                              )}

                              {lead.phone && (
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                  <Phone className="h-2.5 w-2.5" />{lead.phone}
                                </div>
                              )}

                              {followUpStatus === "overdue" && (
                                <div className="flex items-center gap-1 text-[10px] text-destructive font-medium">
                                  <AlertTriangle className="h-2.5 w-2.5" />Quá hạn!
                                </div>
                              )}
                              {followUpStatus === "today" && (
                                <div className="flex items-center gap-1 text-[10px] text-orange-600 font-medium">
                                  <AlertTriangle className="h-2.5 w-2.5" />Hôm nay!
                                </div>
                              )}

                              <div className="flex items-center flex-wrap gap-1">
                                <Badge variant="outline" className="text-[10px] h-4 px-1">{lead.channel ?? "—"}</Badge>
                                {lead.pax_count && (
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                    <Users className="h-2.5 w-2.5" />{lead.pax_count}
                                  </span>
                                )}
                                <span className="text-[10px] font-semibold text-primary ml-auto">
                                  {formatValue(lead.budget || lead.expected_value)}
                                </span>
                              </div>

                              {showConvert && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full mt-1 text-[10px] h-6"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    convertToCustomer.mutate(lead);
                                  }}
                                  disabled={convertToCustomer.isPending}
                                >
                                  <UserPlus className="h-3 w-3 mr-1" />Chuyển thành KH
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between py-4">
          <span className="text-sm text-muted-foreground">Trang {page + 1} / {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Trước</Button>
            <Button variant="outline" size="sm" disabled={(page + 1) * PAGE_SIZE >= totalCount} onClick={() => setPage(p => p + 1)}>Sau</Button>
          </div>
        </div>
      )}
    </div>
  );
}
