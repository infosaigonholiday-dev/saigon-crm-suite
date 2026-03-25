import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, GripVertical, Phone, Mail } from "lucide-react";

type LeadStatus = "new" | "contacted" | "qualified" | "quoted" | "won" | "lost";

interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  source: string;
  tour: string;
  value: string;
  status: LeadStatus;
}

const columns: { id: LeadStatus; label: string; color: string }[] = [
  { id: "new", label: "Mới", color: "bg-secondary" },
  { id: "contacted", label: "Đã liên hệ", color: "bg-accent/15" },
  { id: "qualified", label: "Đủ điều kiện", color: "bg-warning/15" },
  { id: "quoted", label: "Đã báo giá", color: "bg-primary/10" },
  { id: "won", label: "Thành công", color: "bg-success/15" },
  { id: "lost", label: "Thất bại", color: "bg-destructive/10" },
];

const initialLeads: Lead[] = [
  { id: "1", name: "Nguyễn Thành Long", phone: "0901111222", email: "long@email.com", source: "Facebook", tour: "Phú Quốc 4N3Đ", value: "25tr", status: "new" },
  { id: "2", name: "Trần Thị Mai", phone: "0912222333", email: "mai@email.com", source: "Website", tour: "Đà Lạt 3N2Đ", value: "15tr", status: "new" },
  { id: "3", name: "Lê Văn Tùng", phone: "0923333444", email: "tung@email.com", source: "Giới thiệu", tour: "Nha Trang 5N4Đ", value: "40tr", status: "contacted" },
  { id: "4", name: "Phạm Thị Hoa", phone: "0934444555", email: "hoa@email.com", source: "Zalo", tour: "Sapa 4N3Đ", value: "30tr", status: "qualified" },
  { id: "5", name: "Hoàng Đức Anh", phone: "0945555666", email: "anh@email.com", source: "Facebook", tour: "Hạ Long 3N2Đ", value: "20tr", status: "quoted" },
  { id: "6", name: "Vũ Minh Châu", phone: "0956666777", email: "chau@email.com", source: "Website", tour: "Côn Đảo 4N3Đ", value: "50tr", status: "won" },
  { id: "7", name: "Đặng Thị Nga", phone: "0967777888", email: "nga@email.com", source: "Giới thiệu", tour: "Phú Yên 3N2Đ", value: "18tr", status: "contacted" },
  { id: "8", name: "Bùi Quốc Bảo", phone: "0978888999", email: "bao@email.com", source: "Zalo", tour: "Đà Nẵng 4N3Đ", value: "35tr", status: "lost" },
];

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const handleDragStart = useCallback((id: string) => {
    setDraggedId(id);
  }, []);

  const handleDrop = useCallback(
    (status: LeadStatus) => {
      if (!draggedId) return;
      setLeads((prev) =>
        prev.map((l) => (l.id === draggedId ? { ...l, status } : l))
      );
      setDraggedId(null);
    },
    [draggedId]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tiềm năng (Lead)</h1>
          <p className="text-sm text-muted-foreground">{leads.length} lead</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />Thêm lead</Button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => {
          const colLeads = leads.filter((l) => l.status === col.id);
          return (
            <div
              key={col.id}
              className="min-w-[260px] flex-1"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(col.id)}
            >
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
                    className={`cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md ${
                      draggedId === lead.id ? "opacity-50" : ""
                    }`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{lead.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{lead.tour}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone}</span>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <Badge variant="outline" className="text-xs">{lead.source}</Badge>
                            <span className="text-xs font-semibold text-primary">{lead.value}</span>
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
