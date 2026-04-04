import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import LeadFormDialog from "@/components/leads/LeadFormDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Plus, GripVertical, Phone, Loader2, MapPin, Users, AlertTriangle, UserPlus,
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { useMyDepartmentId } from "@/hooks/useScopedQuery";

const PAGE_SIZE = 20;

type LeadStatus = "NEW" | "CONTACTED" | "QUALIFIED" | "QUOTED" | "WON" | "LOST";

const columns: { id: LeadStatus; label: string; color: string }[] = [
  { id: "NEW", label: "Mới", color: "bg-secondary" },
  { id: "CONTACTED", label: "Đã liên hệ", color: "bg-accent/15" },
  { id: "QUALIFIED", label: "Đủ điều kiện", color: "bg-warning/15" },
  { id: "QUOTED", label: "Đã báo giá", color: "bg-primary/10" },
  { id: "WON", label: "Thành công", color: "bg-green-100" },
  { id: "LOST", label: "Thất bại", color: "bg-destructive/10" },
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
  const { getScope } = usePermissions();
  const { user } = useAuth();

  const scope = getScope("leads");
  const { data: myDeptId } = useMyDepartmentId(scope === "department");

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(0);

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
        .select("id, full_name, phone, email, channel, interest_type, expected_value, status, budget, destination, pax_count, temperature, follow_up_date, call_notes, company_name, assigned_to, customer_id")
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      q = applyScopeFilter(q);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: scope === "all" || scope === "personal" || (scope === "department" && !!myDeptId),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("leads").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leads"] }),
  });

  const convertToCustomer = useMutation({
    mutationFn: async (lead: any) => {
      const { data: customer, error: custErr } = await supabase
        .from("customers")
        .insert({
          full_name: lead.full_name,
          phone: lead.phone || null,
          email: lead.email || null,
          company_name: lead.company_name || null,
          assigned_sale_id: lead.assigned_to || null,
          type: lead.company_name ? "CORPORATE" : "INDIVIDUAL",
          source: lead.channel || null,
        })
        .select("id")
        .single();
      if (custErr) throw custErr;

      const { error: leadErr } = await supabase
        .from("leads")
        .update({ customer_id: customer.id, status: "WON" })
        .eq("id", lead.id);
      if (leadErr) throw leadErr;

      return customer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Thành công", { description: "Đã chuyển đổi thành khách hàng thành công" });
    },
    onError: (err: any) => {
      toast.error("Lỗi", { description: err.message });
    },
  });

  const handleDragStart = useCallback((id: string) => setDraggedId(id), []);

  const handleDrop = useCallback(
    (status: LeadStatus) => {
      if (!draggedId) return;
      updateStatus.mutate({ id: draggedId, status });
      setDraggedId(null);
    },
    [draggedId, updateStatus]
  );

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
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Thêm lead</Button>
      </div>
      <LeadFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => {
          const colLeads = leads.filter((l) => l.status === col.id);
          return (
            <div key={col.id} className="min-w-[280px] flex-1" onDragOver={(e) => e.preventDefault()} onDrop={() => handleDrop(col.id)}>
              <div className={`rounded-t-lg px-3 py-2 ${col.color}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{col.label}</span>
                  <Badge variant="secondary" className="text-xs">{colLeads.length}</Badge>
                </div>
              </div>
              <div className="bg-muted/30 rounded-b-lg min-h-[400px] p-2 space-y-2">
                {colLeads.map((lead) => {
                  const temp = tempConfig[lead.temperature ?? "warm"];
                  const followUpStatus = getFollowUpStatus(lead.follow_up_date);
                  const showConvert = (col.id === "QUOTED" || col.id === "QUALIFIED") && !lead.customer_id;

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
                      className={`cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md ${borderClass} ${draggedId === lead.id ? "opacity-50" : ""}`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              {temp && <span className="text-sm" title={lead.temperature ?? ""}>{temp.icon}</span>}
                              <p className="font-medium text-sm truncate flex-1">{lead.full_name}</p>
                            </div>

                            {lead.destination && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3 shrink-0" />
                                <span className="truncate">{lead.destination}</span>
                              </div>
                            )}

                            {lead.phone && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Phone className="h-3 w-3" />{lead.phone}
                              </div>
                            )}

                            {followUpStatus === "overdue" && (
                              <div className="flex items-center gap-1 text-xs text-destructive font-medium">
                                <AlertTriangle className="h-3 w-3" />
                                Quá hạn!
                              </div>
                            )}
                            {followUpStatus === "today" && (
                              <div className="flex items-center gap-1 text-xs text-orange-600 font-medium">
                                <AlertTriangle className="h-3 w-3" />
                                Follow-up hôm nay!
                              </div>
                            )}

                            <div className="flex items-center flex-wrap gap-1.5 mt-1">
                              <Badge variant="outline" className="text-xs">{lead.channel ?? "—"}</Badge>
                              {lead.pax_count && (
                                <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                  <Users className="h-3 w-3" />{lead.pax_count} khách
                                </span>
                              )}
                              <span className="text-xs font-semibold text-primary ml-auto">
                                {formatValue(lead.budget || lead.expected_value)}
                              </span>
                            </div>

                            {showConvert && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full mt-1 text-xs h-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  convertToCustomer.mutate(lead);
                                }}
                                disabled={convertToCustomer.isPending}
                              >
                                <UserPlus className="h-3 w-3 mr-1" />
                                Chuyển thành KH
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
