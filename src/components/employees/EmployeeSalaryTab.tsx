import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

const formatVND = (v: number | null) => v ? v.toLocaleString("vi-VN") + "đ" : "—";

export function EmployeeSalaryTab({ employeeId }: { employeeId: string }) {
  const { data: salaries = [], isLoading } = useQuery({
    queryKey: ["employee_salaries", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_salaries")
        .select("*")
        .eq("employee_id", employeeId)
        .order("effective_from", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: payrolls = [] } = useQuery({
    queryKey: ["payroll", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll")
        .select("*")
        .eq("employee_id", employeeId)
        .order("year", { ascending: false })
        .order("month", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  const current = salaries[0];

  return (
    <div className="space-y-6">
      {current && (
        <Card>
          <CardHeader><CardTitle className="text-base">Lương hiện tại</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Lương cơ bản</p>
                <p className="text-lg font-bold">{formatVND(current.base_salary)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Phụ cấp ăn</p>
                <p className="font-medium">{formatVND(current.meal_allowance)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Phụ cấp xăng xe</p>
                <p className="font-medium">{formatVND(current.transport_allowance)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Phụ cấp điện thoại</p>
                <p className="font-medium">{formatVND(current.phone_allowance)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Phụ cấp nhà ở</p>
                <p className="font-medium">{formatVND(current.housing_allowance)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Phụ cấp khác</p>
                <p className="font-medium">{formatVND(current.other_allowance)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Hiệu lực từ</p>
                <p className="font-medium">{current.effective_from}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Đến</p>
                <p className="font-medium">{current.effective_to ?? "Hiện tại"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Lịch sử bảng lương</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tháng</TableHead>
                <TableHead>Lương CB</TableHead>
                <TableHead>Phụ cấp</TableHead>
                <TableHead>Tăng ca</TableHead>
                <TableHead>BHXH NV</TableHead>
                <TableHead>Thuế TNCN</TableHead>
                <TableHead>Thực lĩnh</TableHead>
                <TableHead>Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payrolls.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">T{p.month}/{p.year}</TableCell>
                  <TableCell>{formatVND(p.base_salary)}</TableCell>
                  <TableCell>{formatVND(p.total_allowance)}</TableCell>
                  <TableCell>{formatVND(p.ot_pay)}</TableCell>
                  <TableCell className="text-destructive">{formatVND((p.bhxh_employee ?? 0) + (p.bhyt_employee ?? 0) + (p.bhtn_employee ?? 0))}</TableCell>
                  <TableCell className="text-destructive">{formatVND(p.pit_amount)}</TableCell>
                  <TableCell className="font-bold">{formatVND(p.net_salary)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      p.status === "PAID" ? "bg-success/15 text-success" :
                      p.status === "APPROVED" ? "bg-accent/15 text-accent" :
                      "bg-muted text-muted-foreground"
                    }>
                      {p.status === "PAID" ? "Đã trả" : p.status === "APPROVED" ? "Đã duyệt" : p.status ?? "Nháp"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {payrolls.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">Chưa có dữ liệu</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
