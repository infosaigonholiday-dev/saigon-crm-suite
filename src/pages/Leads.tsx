import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import LeadFormDialog from "@/components/leads/LeadFormDialog";
import LeadDetailDialog from "@/components/leads/LeadDetailDialog";
import LostReasonDialog from "@/components/leads/LostReasonDialog";
import LeadTableView from "@/components/leads/LeadTableView";
import ConvertToCustomerDialog from "@/components/leads/ConvertToCustomerDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus, GripVertical, Phone, Loader2, MapPin, Users, AlertTriangle, UserPlus,
  LayoutGrid, List, Search, Building2, RefreshCw,
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

  // Convert dialog
  const [convertLead, setConvertLead] = useState<any>(null);
  const [convertOpen, setConvertOpen] = useState(false);

  // Lost/Nurture/Dormant dialog
  const [transitionDialog, setTransitionDialog] = useState<{ open: boolean; status: string; leadId: string }>({
    open: false, status: "", leadId: "",
  });

  // Filters
  const [searchText, setSearchText] = useState("");
  const [filterTemp, setFilterTemp] = useState<string>("all");
  const [filterStaff, setFilterStaff] = useState<string>("all");

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
        .select("id, full_name, phone, email, channel, interest_type, expected_value, status, budget, destination, pax_count, temperature, follow_up_date, call_notes, company_name, company_address, contact_person, contact_position, company_size, tax_code, planned_travel_date, reminder_date, contact_count, lost_reason, assigned_to, customer_id, last_contact_at, department_id, created_at, created_by, converted_customer_id, assigned_profile:profiles!leads_assigned_to_fkey(full_name)")
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

  // Get unique staff for filter
  const staffOptions = useMemo(() => {
    const map = new Map<string, string>();
    leads.forEach((l: any) => {
      if (l.assigned_to && l.assigned_profile_name) {
        map.set(l.assigned_to, l.assigned_profile_name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [leads]);

  // Filter leads
  const filteredLeads = useMemo(() => {
    return leads.filter((l: any) => {
      if (searchText) {
        const s = searchText.toLowerCase();
        const match = (l.full_name?.toLowerCase().includes(s)) ||
          (l.phone?.toLowerCase().includes(s)) ||
          (l.company_name?.toLowerCase().includes(s));
        if (!match) return false;
      }
      if (filterTemp !== "all" && l.temperature !== filterTemp) return false;
      if (filterStaff !== "all" && l.assigned_to !== filterStaff) return false;
      return true;
    });
  }, [leads, searchText, filterTemp, filterStaff]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, extra }: { id: string; status: string; extra?: Record<string, any> }) => {
      const { error } = await supabase.from("leads").update({ status, ...extra }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leads"] }),
  });

  const handleDragStart = useCallback((id: string) => setDraggedId(id), []);

  const handleDrop = useCallback(
    (status: LeadStatus) => {
      if (!draggedId) return;
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
    <div className="space-y-4">
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

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Tìm tên, SĐT, công ty..." value={searchText} onChange={(e) => setSearchText(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterTemp} onValueChange={setFilterTemp}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Mức độ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="hot">🔥 Nóng</SelectItem>
            <SelectItem value="warm">🟠 Ấm</SelectItem>
            <SelectItem value="cold">🔵 Lạnh</SelectItem>
          </SelectContent>
        </Select>
        {staffOptions.length > 1 && (
          <Select value={filterStaff} onValueChange={setFilterStaff}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="NV phụ trách" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả NV</SelectItem>
              {staffOptions.map(s => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
            </SelectContent>
          </Select>
        )}
      </div>

      <LeadFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <LeadDetailDialog open={detailOpen} onOpenChange={setDetailOpen} lead={selectedLead} />
      <LostReasonDialog
        open={transitionDialog.open}
        onOpenChange={(o) => setTransitionDialog((p) => ({ ...p, open: o }))}
        targetStatus={transitionDialog.status}
        onConfirm={handleTransitionConfirm}
      />
      <ConvertToCustomerDialog
        open={convertOpen}
        onOpenChange={setConvertOpen}
        lead={convertLead}
      />

      {viewMode === "table" ? (
        <LeadTableView
          leads={filteredLeads}
          onClickLead={(lead) => { setSelectedLead(lead); setDetailOpen(true); }}
        />
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {columns.map((col) => {
            const colLeads = filteredLeads.filter((l: any) => l.status === col.id);
            return (
              <div key={col.id} className="min-w-[240px] flex-shrink-0" onDragOver={(e) => e.preventDefault()} onDrop={() => handleDrop(col.id)}>
                <div className={`rounded-t-lg px-3 py-2 ${col.color}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-xs">{col.label}</span>
                    <Badge variant="secondary" className="text-xs h-5">{colLeads.length}</Badge>
                  </div>
                </div>
                <div className="bg-muted/30 rounded-b-lg min-h-[350px] p-1.5 space-y-1.5">
                  {colLeads.map((lead: any) => {
                    const temp = tempConfig[lead.temperature ?? "warm"];
                    const followUpStatus = getFollowUpStatus(lead.follow_up_date);
                    const isConverted = !!lead.converted_customer_id;
                    const showConvert = col.id === "WON" && !isConverted;

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

                              {lead.company_name && (
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                  <Building2 className="h-2.5 w-2.5 shrink-0" />
                                  <span className="truncate">{lead.company_name}</span>
                                </div>
                              )}

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
                                {lead.assigned_profile_name && (
                                  <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">{lead.assigned_profile_name}</span>
                                )}
                                {(lead.contact_count ?? 0) > 0 && (
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                    <RefreshCw className="h-2.5 w-2.5" />{lead.contact_count}
                                  </span>
                                )}
                                {lead.pax_count && (
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                    <Users className="h-2.5 w-2.5" />{lead.pax_count}
                                  </span>
                                )}
                                <span className="text-[10px] font-semibold text-primary ml-auto">
                                  {formatValue(lead.budget || lead.expected_value)}
                                </span>
                              </div>

                              {isConverted && col.id === "WON" && (
                                <Badge variant="outline" className="text-[10px] h-4 px-1 bg-green-100 text-green-700 border-green-200">
                                  Đã chuyển KH
                                </Badge>
                              )}

                              {showConvert && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full mt-1 text-[10px] h-6"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConvertLead(lead);
                                    setConvertOpen(true);
                                  }}
                                >
                                  <UserPlus className="h-3 w-3 mr-1" />→ KH
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
