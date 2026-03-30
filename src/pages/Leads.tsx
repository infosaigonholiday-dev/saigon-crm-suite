import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import LeadFormDialog from "@/components/leads/LeadFormDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, GripVertical, Phone, Loader2 } from "lucide-react";

type LeadStatus = "NEW" | "CONTACTED" | "QUALIFIED" | "QUOTED" | "WON" | "LOST";

const columns: { id: LeadStatus; label: string; color: string }[] = [
  { id: "NEW", label: "Mới", color: "bg-secondary" },
  { id: "CONTACTED", label: "Đã liên hệ", color: "bg-accent/15" },
  { id: "QUALIFIED", label: "Đủ điều kiện", color: "bg-warning/15" },
  { id: "QUOTED", label: "Đã báo giá", color: "bg-primary/10" },
  { id: "WON", label: "Thành công", color: "bg-success/15" },
  { id: "LOST", label: "Thất bại", color: "bg-destructive/10" },
];

export default function Leads() {
  const queryClient = useQueryClient();
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id, full_name, phone, email, channel, interest_type, expected_value, status")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("leads").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leads"] }),
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

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tiềm năng (Lead)</h1>
          <p className="text-sm text-muted-foreground">{leads.length} lead</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Thêm lead</Button>
      </div>
      <LeadFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => {
          const colLeads = leads.filter((l) => l.status === col.id);
          return (
            <div key={col.id} className="min-w-[260px] flex-1" onDragOver={(e) => e.preventDefault()} onDrop={() => handleDrop(col.id)}>
              <div className={`rounded-t-lg px-3 py-2 ${col.color}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{col.label}</span>
                  <Badge variant="secondary" className="text-xs">{colLeads.length}</Badge>
                </div>
              </div>
              <div className="bg-muted/30 rounded-b-lg min-h-[400px] p-2 space-y-2">
                {colLeads.map((lead) => (
                  <Card
                    key={lead.id}
                    draggable
                    onDragStart={() => handleDragStart(lead.id)}
                    className={`cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md ${draggedId === lead.id ? "opacity-50" : ""}`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{lead.full_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{lead.interest_type ?? ""}</p>
                          {lead.phone && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />{lead.phone}
                            </div>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <Badge variant="outline" className="text-xs">{lead.channel ?? "—"}</Badge>
                            <span className="text-xs font-semibold text-primary">{formatValue(lead.expected_value)}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
