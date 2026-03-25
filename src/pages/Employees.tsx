import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Loader2 } from "lucide-react";

const statusLabels: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "Đang làm", className: "bg-success/15 text-success border-success/30" },
  PROBATION: { label: "Thử việc", className: "bg-warning/15 text-warning border-warning/30" },
  RESIGNED: { label: "Đã nghỉ", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

export default function Employees() {
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, employee_code, full_name, phone, email, position, level, status, departments(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Nhân sự</h1>
          <p className="text-sm text-muted-foreground">{employees.length} nhân viên</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />Thêm nhân viên</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã NV</TableHead>
                  <TableHead>Họ tên</TableHead>
                  <TableHead>Điện thoại</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Vị trí</TableHead>
                  <TableHead>Phòng ban</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((e) => {
                  const st = statusLabels[e.status ?? "ACTIVE"] ?? statusLabels.ACTIVE;
                  const deptName = (e.departments as any)?.name ?? "—";
                  return (
                    <TableRow key={e.id} className="hover:bg-muted/50">
                      <TableCell className="font-mono text-xs">{e.employee_code}</TableCell>
                      <TableCell className="font-medium">{e.full_name}</TableCell>
                      <TableCell>{e.phone ?? "—"}</TableCell>
                      <TableCell>{e.email ?? "—"}</TableCell>
                      <TableCell>{e.position ?? "—"}</TableCell>
                      <TableCell>{deptName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={st.className}>{st.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {employees.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Không có dữ liệu</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
