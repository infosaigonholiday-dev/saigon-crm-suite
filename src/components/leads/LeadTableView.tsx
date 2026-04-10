import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

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
  assigned_profile_name?: string | null;
  [key: string]: any;
}

interface Props {
  leads: LeadWithProfile[];
  onClickLead: (lead: any) => void;
}

export default function LeadTableView({ leads, onClickLead }: Props) {
  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tên</TableHead>
            <TableHead>Công ty</TableHead>
            <TableHead>SĐT</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Nhiệt độ</TableHead>
            <TableHead>Ngày dự kiến đi</TableHead>
            <TableHead>Lần LH cuối</TableHead>
            <TableHead>NV phụ trách</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                Không có lead nào
              </TableCell>
            </TableRow>
          )}
          {leads.map((lead) => {
            const st = statusLabels[lead.status] ?? { label: lead.status, variant: "outline" as const };
            const temp = tempBadge[lead.temperature ?? "warm"];
            return (
              <TableRow
                key={lead.id}
                className="cursor-pointer"
                onClick={() => onClickLead(lead)}
              >
                <TableCell className="font-medium">{lead.full_name}</TableCell>
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
                <TableCell>{lead.assigned_profile_name ?? "—"}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
