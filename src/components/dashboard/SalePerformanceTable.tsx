import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";

interface Props {
  departmentId?: string | null;
  month: Date;
}

interface SaleRow {
  id: string;
  full_name: string;
  newLeads: number;
  contactCount: number;
  answerRate: number;
  interestedLeads: number;
  wonLeads: number;
  conversion: number;
}

function getStatusBadge(row: SaleRow) {
  if (row.conversion >= 2 || row.wonLeads >= 1)
    return <Badge className="bg-green-100 text-green-700 border-green-300">Tốt</Badge>;
  if (row.conversion >= 1 || row.interestedLeads >= 5)
    return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">Trung bình</Badge>;
  if (row.contactCount > 100 && row.conversion === 0)
    return <Badge className="bg-red-100 text-red-700 border-red-300">Cần hỗ trợ</Badge>;
  return <Badge variant="outline">—</Badge>;
}

export function SalePerformanceTable({ departmentId, month }: Props) {
  const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1).toISOString();
  const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 1).toISOString();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["sale-performance", departmentId, startOfMonth],
    queryFn: async () => {
      // Get all sales in department
      let profileQuery = supabase.from("profiles").select("id, full_name").eq("is_active", true);
      if (departmentId) profileQuery = profileQuery.eq("department_id", departmentId);
      const { data: profiles } = await profileQuery;
      if (!profiles || profiles.length === 0) return [];

      const profileIds = profiles.map(p => p.id);

      // Get leads created this month by these profiles
      let leadsQuery = supabase.from("leads")
        .select("id, assigned_to, status, created_at")
        .gte("created_at", startOfMonth)
        .lt("created_at", endOfMonth);
      if (departmentId) leadsQuery = leadsQuery.eq("department_id", departmentId);
      const { data: leads } = await leadsQuery;

      // Get all leads assigned to these profiles (for status counts)
      let allLeadsQuery = supabase.from("leads")
        .select("id, assigned_to, status")
        .in("assigned_to", profileIds);
      const { data: allLeads } = await allLeadsQuery;

      // Get care history this month
      let careQuery = supabase.from("lead_care_history")
        .select("id, contacted_by, result")
        .gte("contacted_at", startOfMonth)
        .lt("contacted_at", endOfMonth)
        .in("contacted_by", profileIds);
      const { data: careHistory } = await careQuery;

      // Get WON leads this month
      let wonQuery = supabase.from("leads")
        .select("id, assigned_to")
        .eq("status", "WON")
        .gte("updated_at", startOfMonth)
        .lt("updated_at", endOfMonth);
      if (departmentId) wonQuery = wonQuery.eq("department_id", departmentId);
      const { data: wonLeads } = await wonQuery;

      const interestedStatuses = ["INTERESTED", "PROFILE_SENT", "QUOTE_SENT", "NEGOTIATING"];

      return profiles.map(p => {
        const myNewLeads = (leads || []).filter(l => l.assigned_to === p.id).length;
        const myCare = (careHistory || []).filter(c => c.contacted_by === p.id);
        const totalCare = myCare.length;
        const answered = myCare.filter(c => c.result !== "NO_ANSWER").length;
        const answerRate = totalCare > 0 ? Math.round((answered / totalCare) * 100) : 0;
        const myInterested = (allLeads || []).filter(l => l.assigned_to === p.id && interestedStatuses.includes(l.status)).length;
        const myWon = (wonLeads || []).filter(l => l.assigned_to === p.id).length;
        const conversion = myNewLeads > 0 ? Math.round((myWon / myNewLeads) * 100 * 10) / 10 : 0;

        return {
          id: p.id,
          full_name: p.full_name || "N/A",
          newLeads: myNewLeads,
          contactCount: totalCare,
          answerRate,
          interestedLeads: myInterested,
          wonLeads: myWon,
          conversion,
        } as SaleRow;
      }).sort((a, b) => b.wonLeads - a.wonLeads || b.conversion - a.conversion);
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Bảng xếp hạng nhân viên</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>NV</TableHead>
              <TableHead className="text-right">Leads mới</TableHead>
              <TableHead className="text-right">Lượt liên hệ</TableHead>
              <TableHead className="text-right">Tỷ lệ nhấc máy</TableHead>
              <TableHead className="text-right">Quan tâm</TableHead>
              <TableHead className="text-right">Tour chốt</TableHead>
              <TableHead className="text-right">Conversion</TableHead>
              <TableHead className="text-center">Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">
                  <span className="text-muted-foreground mr-2">{i + 1}.</span>
                  {r.full_name}
                </TableCell>
                <TableCell className="text-right">{r.newLeads}</TableCell>
                <TableCell className="text-right">{r.contactCount}</TableCell>
                <TableCell className="text-right">{r.answerRate}%</TableCell>
                <TableCell className="text-right">{r.interestedLeads}</TableCell>
                <TableCell className="text-right font-semibold">{r.wonLeads}</TableCell>
                <TableCell className="text-right">{r.conversion}%</TableCell>
                <TableCell className="text-center">{getStatusBadge(r)}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Không có dữ liệu</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
