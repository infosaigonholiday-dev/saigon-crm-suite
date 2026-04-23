import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  NEW: { label: "Mới", variant: "secondary" },
  NO_ANSWER: { label: "KBM", variant: "outline" },
  CONTACTED: { label: "Đã liên hệ", variant: "outline" },
  INTERESTED: { label: "Quan tâm", variant: "default" },
  PROFILE_SENT: { label: "Đã gửi profile", variant: "outline" },
  QUOTE_SENT: { label: "Đã báo giá", variant: "outline" },
  NEGOTIATING: { label: "Đàm phán", variant: "default" },
  WON: { label: "Chốt tour", variant: "default" },
  LOST: { label: "Thất bại", variant: "destructive" },
  NURTURE: { label: "Chăm sóc DH", variant: "secondary" },
  DORMANT: { label: "Tạm ngưng", variant: "secondary" },
};

const tempBadge: Record<string, { label: string; className: string }> = {
  hot: { label: "🔥 Nóng", className: "bg-red-100 text-red-700 border-red-200" },
  warm: { label: "🟠 Ấm", className: "bg-orange-100 text-orange-700 border-orange-200" },
  cold: { label: "🔵 Lạnh", className: "bg-blue-100 text-blue-700 border-blue-200" },
};

interface LeadWithProfile {
  id: string;
  full_name: string;
  company_name: string | null;
  phone: string | null;
  status: string;
  temperature: string | null;
  planned_travel_date: string | null;
  last_contact_at?: string | null;
  created_at?: string | null;
  assigned_profile_name?: string | null;
  department_name?: string | null;
  converted_customer_id?: string | null;
  [key: string]: any;
}

interface Props {
  leads: LeadWithProfile[];
  onClickLead: (lead: any) => void;
  isAdmin?: boolean;
  onDeleteLead?: (id: string) => void;
}

export default function LeadTableView({ leads, onClickLead, isAdmin, onDeleteLead }: Props) {
  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tên</TableHead>
            <TableHead>NV phụ trách</TableHead>
            <TableHead>Phòng</TableHead>
            <TableHead>Ngày tạo</TableHead>
            <TableHead>Công ty</TableHead>
            <TableHead>SĐT</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Nhiệt độ</TableHead>
            <TableHead>Ngày dự kiến đi</TableHead>
            <TableHead>Lần LH cuối</TableHead>
            {isAdmin && <TableHead className="text-right">Thao tác</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.length === 0 && (
            <TableRow>
              <TableCell colSpan={isAdmin ? 11 : 10} className="text-center text-muted-foreground py-8">
                Không có lead nào
              </TableCell>
            </TableRow>
          )}
          {leads.map((lead) => {
            const st = statusLabels[lead.status] ?? { label: lead.status, variant: "outline" as const };
            const temp = tempBadge[lead.temperature ?? "warm"];
            const isConverted = !!lead.converted_customer_id;
            return (
              <TableRow
                key={lead.id}
                className="cursor-pointer"
                onClick={() => onClickLead(lead)}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {lead.full_name}
                    {isConverted && (
                      <Badge variant="outline" className="bg-blue-600 text-white border-blue-700 text-[10px]">
                        Đã chuyển KH
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>{lead.assigned_profile_name ?? "—"}</TableCell>
                <TableCell>{lead.department_name ?? "—"}</TableCell>
                <TableCell>
                  {lead.created_at ? format(new Date(lead.created_at), "dd/MM/yyyy") : "—"}
                </TableCell>
                <TableCell>{lead.company_name ?? "—"}</TableCell>
                <TableCell>{lead.phone ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={st.variant}>{st.label}</Badge>
                </TableCell>
                <TableCell>
                  {temp && <Badge variant="outline" className={temp.className}>{temp.label}</Badge>}
                </TableCell>
                <TableCell>
                  {lead.planned_travel_date
                    ? format(new Date(lead.planned_travel_date), "dd/MM/yyyy")
                    : "—"}
                </TableCell>
                <TableCell>
                  {lead.last_contact_at
                    ? format(new Date(lead.last_contact_at), "dd/MM/yyyy HH:mm")
                    : "—"}
                </TableCell>
                {isAdmin && (
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteLead?.(lead.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
