import { useState, useCallback, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import LeadFormDialog from "@/components/leads/LeadFormDialog";
import LeadDetailDialog from "@/components/leads/LeadDetailDialog";
import LeadStatusChangeDialog from "@/components/leads/LeadStatusChangeDialog";
import LeadTableView from "@/components/leads/LeadTableView";
import ConvertToCustomerDialog from "@/components/leads/ConvertToCustomerDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Plus, GripVertical, Phone, Loader2, MapPin, Users, AlertTriangle, UserPlus,
  LayoutGrid, List, Search, Building2, RefreshCw, MoreVertical, Trash2, CalendarClock,
  Bell, CalendarOff, Clock, X,
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { useMyDepartmentId } from "@/hooks/useScopedQuery";

const PAGE_SIZE = 20;

type LeadStatus = "NEW" | "NO_ANSWER" | "CONTACTED" | "INTERESTED" | "PROFILE_SENT" | "QUOTE_SENT" | "NEGOTIATING" | "WON" | "LOST" | "NURTURE" | "DORMANT";

// Original detailed statuses for dropdown menus
const allStatuses: { id: LeadStatus; label: string }[] = [
  { id: "NEW", label: "Mới" },
  { id: "NO_ANSWER", label: "KBM" },
  { id: "CONTACTED", label: "Đã liên hệ" },
  { id: "INTERESTED", label: "Quan tâm" },
  { id: "PROFILE_SENT", label: "Đã gửi profile" },
  { id: "QUOTE_SENT", label: "Đã báo giá" },
  { id: "NEGOTIATING", label: "Đàm phán" },
  { id: "WON", label: "Chốt tour" },
  { id: "LOST", label: "Thất bại" },
  { id: "NURTURE", label: "Chăm sóc DH" },
  { id: "DORMANT", label: "Tạm ngưng" },
];

const statusLabelMap: Record<string, string> = Object.fromEntries(allStatuses.map(s => [s.id, s.label]));

// 5 grouped Kanban columns
const kanbanColumns: { id: string; label: string; statuses: LeadStatus[]; color: string; defaultStatus: LeadStatus }[] = [
  { id: "NEW_GROUP", label: "Mới", statuses: ["NEW", "NO_ANSWER", "CONTACTED"], color: "bg-secondary", defaultStatus: "NEW" },
  { id: "INTEREST", label: "Quan tâm", statuses: ["INTERESTED", "PROFILE_SENT"], color: "bg-green-50", defaultStatus: "INTERESTED" },
  { id: "QUOTING", label: "Đang báo giá", statuses: ["QUOTE_SENT", "NEGOTIATING"], color: "bg-blue-100", defaultStatus: "QUOTE_SENT" },
  { id: "WON", label: "Thành công", statuses: ["WON"], color: "bg-green-100", defaultStatus: "WON" },
  { id: "LOST_GROUP", label: "Không thành công", statuses: ["LOST", "DORMANT", "NURTURE"], color: "bg-destructive/10", defaultStatus: "LOST" },
];

const tempConfig: Record<string, { icon: string; label: string; badgeClass: string }> = {
  hot: { icon: "🔥", label: "Nóng", badgeClass: "bg-red-500 text-white border-red-500" },
  warm: { icon: "🌤️", label: "Ấm", badgeClass: "bg-orange-500 text-white border-orange-500" },
  cold: { icon: "❄️", label: "Lạnh", badgeClass: "bg-blue-500 text-white border-blue-500" },
};

function getFollowUpStatus(date: string | null): "overdue" | "today" | "future" | null {
  if (!date) return null;
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (d.getTime() < today.getTime()) return "overdue";
  if (d.getTime() === today.getTime()) return "today";
  return "future";
}

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function formatLastContact(dateStr: string | null): { text: string; className: string } {
  if (!dateStr) return { text: "Chưa tương tác", className: "text-amber-600 font-medium" };
  const days = daysSince(dateStr) ?? 0;
  if (days === 0) return { text: "Lần cuối: hôm nay", className: "text-muted-foreground" };
  if (days > 7) return { text: `⚠️ ${days} ngày không liên hệ`, className: "text-destructive font-medium" };
  return { text: `Lần cuối: ${days} ngày trước`, className: "text-muted-foreground" };
}

export default function Leads() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { getScope } = usePermissions();
  const { user, userRole } = useAuth();

  const scope = getScope("leads");
  const { data: myDeptId } = useMyDepartmentId(scope === "department");
  const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [page, setPage] = useState(0);

  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [convertLead, setConvertLead] = useState<any>(null);
  const [convertOpen, setConvertOpen] = useState(false);

  const [transitionDialog, setTransitionDialog] = useState<{ open: boolean; status: string; statusLabel: string; leadId: string; isLost: boolean; currentTemp?: string | null }>({
    open: false, status: "", statusLabel: "", leadId: "", isLost: false,
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const urlFilter = searchParams.get("filter"); // overdue | today | no_schedule | stale

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
        .select("id, full_name, phone, email, channel, interest_type, expected_value, status, budget, destination, pax_count, temperature, follow_up_date, call_notes, company_name, company_address, contact_person, contact_position, company_size, tax_code, planned_travel_date, reminder_date, contact_count, lost_reason, assigned_to, customer_id, last_contact_at, department_id, created_at, created_by, converted_customer_id, assigned_profile:profiles!leads_assigned_to_fkey(full_name), departments(name)")
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      q = applyScopeFilter(q);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map((l: any) => ({
        ...l,
        assigned_profile_name: l.assigned_profile?.full_name ?? null,
        department_name: l.departments?.name ?? null,
      }));
    },
    enabled: scope === "all" || scope === "personal" || (scope === "department" && !!myDeptId),
  });

  const staffOptions = useMemo(() => {
    const map = new Map<string, string>();
    leads.forEach((l: any) => {
      if (l.assigned_to && l.assigned_profile_name) {
        map.set(l.assigned_to, l.assigned_profile_name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [leads]);

  const filteredLeads = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();
    const sevenDaysAgoMs = todayMs - 7 * 24 * 60 * 60 * 1000;

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

      // URL-driven monitoring filters
      if (urlFilter) {
        const closed = ["WON", "LOST", "DORMANT", "NURTURE"].includes(l.status);
        if (closed) return false;
        const fuMs = l.follow_up_date ? new Date(l.follow_up_date).setHours(0, 0, 0, 0) : null;
        if (urlFilter === "overdue") {
          if (fuMs === null || fuMs >= todayMs) return false;
        } else if (urlFilter === "today") {
          if (fuMs !== todayMs) return false;
        } else if (urlFilter === "no_schedule") {
          if (fuMs !== null) return false;
        } else if (urlFilter === "stale") {
          const lcMs = l.last_contact_at ? new Date(l.last_contact_at).getTime() : null;
          if (lcMs !== null && lcMs >= sevenDaysAgoMs) return false;
        }
      }
      return true;
    });
  }, [leads, searchText, filterTemp, filterStaff, urlFilter]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, extra }: { id: string; status: string; extra?: Record<string, any> }) => {
      const { error } = await supabase.from("leads").update({ status, ...extra } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leads"] }),
    onError: (err: any) => toast.error("Lỗi đổi trạng thái", { description: err.message }),
  });

  const deleteLead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads-count"] });
      toast.success("Đã xóa lead");
    },
    onError: (err: any) => toast.error("Lỗi xóa", { description: err.message }),
  });

  const openStatusChangeDialog = useCallback((leadId: string, status: string, statusLabel: string, currentTemp: string | null) => {
    setTransitionDialog({
      open: true,
      status,
      statusLabel,
      leadId,
      isLost: status === "LOST",
      currentTemp,
    });
  }, []);

  const handleDragStart = useCallback((id: string) => setDraggedId(id), []);

  const handleDrop = useCallback(
    (col: typeof kanbanColumns[0]) => {
      if (!draggedId) return;
      const lead = leads.find((l: any) => l.id === draggedId);
      setDraggedId(null);
      if (!lead) return;
      // Same group → no-op
      if (col.statuses.includes(lead.status)) return;
      openStatusChangeDialog(draggedId, col.defaultStatus, col.label, lead.temperature);
    },
    [draggedId, leads, openStatusChangeDialog]
  );

  const handleStatusChangeSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["leads"] });
    queryClient.invalidateQueries({ queryKey: ["leads-count"] });
    queryClient.invalidateQueries({ queryKey: ["lead-monitoring"] });
    queryClient.invalidateQueries({ queryKey: ["leads-latest-action"] });
  }, [queryClient]);

  // Latest care action per lead (for "next action" badge on card)
  const visibleLeadIds = filteredLeads.map((l: any) => l.id);
  const { data: latestActionMap = {} } = useQuery({
    queryKey: ["leads-latest-action", visibleLeadIds.sort().join(",")],
    queryFn: async () => {
      if (visibleLeadIds.length === 0) return {};
      const { data, error } = await supabase
        .from("lead_care_history")
        .select("lead_id, next_action, next_contact_date, contacted_at")
        .in("lead_id", visibleLeadIds)
        .order("contacted_at", { ascending: false });
      if (error) return {};
      const map: Record<string, { next_action: string | null; next_contact_date: string | null }> = {};
      for (const row of data || []) {
        if (!map[row.lead_id]) {
          map[row.lead_id] = { next_action: row.next_action, next_contact_date: row.next_contact_date };
        }
      }
      return map;
    },
    enabled: visibleLeadIds.length > 0,
  });

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
      <LeadStatusChangeDialog
        open={transitionDialog.open}
        onOpenChange={(o) => setTransitionDialog((p) => ({ ...p, open: o }))}
        leadId={transitionDialog.leadId}
        currentTemperature={transitionDialog.currentTemp}
        targetStatus={transitionDialog.status}
        targetStatusLabel={transitionDialog.statusLabel}
        isLost={transitionDialog.isLost}
        onSuccess={() => {
          handleStatusChangeSuccess();
          if (transitionDialog.status === "WON") {
            const wonLead = leads.find((l: any) => l.id === transitionDialog.leadId);
            if (wonLead && !wonLead.converted_customer_id) {
              if (window.confirm("Chuyển Lead này thành Khách hàng luôn không?")) {
                setConvertLead(wonLead);
                setConvertOpen(true);
              }
            }
          }
        }}
      />
      <ConvertToCustomerDialog
        open={convertOpen}
        onOpenChange={setConvertOpen}
        lead={convertLead}
      />

      {/* Active URL filter banner */}
      {urlFilter && (
        <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/30 rounded-md">
          <span className="text-sm font-medium">
            Đang lọc:{" "}
            {urlFilter === "overdue" && "Quá hạn follow-up"}
            {urlFilter === "today" && "Cần follow-up hôm nay"}
            {urlFilter === "no_schedule" && "Không có lịch hẹn"}
            {urlFilter === "stale" && ">7 ngày không tương tác"}
          </span>
          <Button variant="ghost" size="sm" className="ml-auto h-7" onClick={() => { searchParams.delete("filter"); setSearchParams(searchParams); }}>
            <X className="h-3.5 w-3.5 mr-1" />Bỏ lọc
          </Button>
        </div>
      )}

      {viewMode === "table" ? (
        <LeadTableView
          leads={filteredLeads}
          onClickLead={(lead) => { setSelectedLead(lead); setDetailOpen(true); }}
          isAdmin={isAdmin}
          onDeleteLead={(id) => {
            if (!window.confirm("Xác nhận xóa lead này?")) return;
            deleteLead.mutate(id);
          }}
        />
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {kanbanColumns.map((col) => {
            const colLeads = filteredLeads.filter((l: any) => col.statuses.includes(l.status));
            return (
              <div key={col.id} className="min-w-[260px] flex-shrink-0" onDragOver={(e) => e.preventDefault()} onDrop={() => handleDrop(col)}>
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

                    // Show sub-status badge when status differs from group default
                    const subStatusLabel = lead.status !== col.defaultStatus ? statusLabelMap[lead.status] : null;

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
                            <div className="ml-auto shrink-0">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 -mt-0.5 -mr-1"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44">
                                  {allStatuses
                                    .filter((c) => c.id !== lead.status)
                                    .map((c) => (
                                      <DropdownMenuItem
                                        key={c.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openStatusChangeDialog(lead.id, c.id, c.label, lead.temperature);
                                        }}
                                      >
                                        {c.label}
                                      </DropdownMenuItem>
                                    ))}
                                  {isAdmin && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className="text-destructive"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (!window.confirm("Xác nhận xóa lead này?")) return;
                                          deleteLead.mutate(lead.id);
                                        }}
                                      >
                                        <Trash2 className="h-3.5 w-3.5 mr-2" />Xóa
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center gap-1 flex-wrap">
                                <p className="font-medium text-xs truncate flex-1">{lead.full_name}</p>
                                {lead.company_name && (
                                  <Badge variant="outline" className="text-[9px] h-4 px-1 bg-purple-100 text-purple-700 border-purple-300">
                                    B2B
                                  </Badge>
                                )}
                                {temp && (
                                  <Badge className={`text-[9px] h-4 px-1 ${temp.badgeClass}`}>
                                    {temp.icon} {temp.label}
                                  </Badge>
                                )}
                              </div>

                              {subStatusLabel && (
                                <Badge variant="outline" className="text-[10px] h-4 px-1">
                                  {subStatusLabel}
                                </Badge>
                              )}

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

                              {/* Hẹn tiếp theo + action */}
                              {lead.follow_up_date && (() => {
                                const action = latestActionMap[lead.id]?.next_action;
                                const dateStr = new Date(lead.follow_up_date).toLocaleDateString("vi-VN");
                                if (followUpStatus === "overdue") {
                                  return (
                                    <div className="flex items-center gap-1 text-[10px] text-destructive font-medium">
                                      <AlertTriangle className="h-2.5 w-2.5" />Hẹn: {dateStr}{action ? ` — ${action}` : ""} (quá hạn)
                                    </div>
                                  );
                                }
                                if (followUpStatus === "today") {
                                  return (
                                    <div className="flex items-center gap-1 text-[10px] text-orange-600 font-medium">
                                      <Bell className="h-2.5 w-2.5" />Hẹn: {dateStr}{action ? ` — ${action}` : ""} (hôm nay)
                                    </div>
                                  );
                                }
                                return (
                                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                    <CalendarClock className="h-2.5 w-2.5" />Hẹn: {dateStr}{action ? ` — ${action}` : ""}
                                  </div>
                                );
                              })()}

                              {!lead.follow_up_date && !["WON", "LOST", "DORMANT", "NURTURE"].includes(lead.status) && (
                                <div className="flex items-center gap-1 text-[10px] text-amber-600 font-medium">
                                  <CalendarOff className="h-2.5 w-2.5" />Chưa có lịch hẹn
                                </div>
                              )}

                              {/* Last contact */}
                              {(() => {
                                const lc = formatLastContact(lead.last_contact_at);
                                return (
                                  <div className={`flex items-center gap-1 text-[10px] ${lc.className}`}>
                                    <Clock className="h-2.5 w-2.5" />{lc.text}
                                  </div>
                                );
                              })()}

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
                                <div className="flex items-center gap-1 mt-1">
                                  <Badge variant="outline" className="text-[10px] h-4 px-1 bg-blue-600 text-white border-blue-700">
                                    Đã chuyển KH ✓
                                  </Badge>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/khach-hang/${lead.converted_customer_id}`);
                                    }}
                                    className="text-[10px] text-primary hover:underline ml-auto"
                                  >
                                    Xem KH →
                                  </button>
                                </div>
                              )}

                              {showConvert && (
                                <Button
                                  size="sm"
                                  className="w-full mt-1.5 text-xs h-7 bg-green-600 hover:bg-green-700 text-white"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConvertLead(lead);
                                    setConvertOpen(true);
                                  }}
                                >
                                  <UserPlus className="h-3.5 w-3.5 mr-1" />Chuyển thành KH →
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
