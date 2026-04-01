import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

const formatVND = (v: number | null) => {
  if (!v) return "0";
  return new Intl.NumberFormat("vi-VN").format(v);
};

export function DebtReportTab() {
  const today = new Date().toISOString().split("T")[0];

  const { data: receivables = [], isLoading: loadingAR } = useQuery({
    queryKey: ["debt-receivables"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts_receivable")
        .select("*, customers(full_name), bookings(code)")
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: payables = [], isLoading: loadingAP } = useQuery({
    queryKey: ["debt-payables"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts_payable")
        .select("*")
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const isLoading = loadingAR || loadingAP;

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const isOverdue = (dueDate: string | null, status: string | null) =>
    dueDate && dueDate < today && status !== "PAID";

  const totalARDue = receivables.reduce((s, r) => s + (r.amount_remaining ?? 0), 0);
  const totalAPDue = payables.reduce((s, r) => s + (r.amount_remaining ?? 0), 0);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Công nợ</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Khách hàng còn nợ</p>
            <p className="text-2xl font-bold mt-1">{formatVND(totalARDue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Nợ nhà cung cấp</p>
            <p className="text-2xl font-bold mt-1">{formatVND(totalAPDue)}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="receivable">
        <TabsList>
          <TabsTrigger value="receivable">Khách nợ ({receivables.length})</TabsTrigger>
          <TabsTrigger value="payable">Nợ NCC ({payables.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="receivable" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Khách hàng</TableHead>
                    <TableHead>Mã booking</TableHead>
                    <TableHead className="text-right">Phải thu</TableHead>
                    <TableHead className="text-right">Đã thu</TableHead>
                    <TableHead className="text-right">Còn lại</TableHead>
                    <TableHead>Hạn</TableHead>
                    <TableHead>Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receivables.map((r: any) => {
                    const overdue = isOverdue(r.due_date, r.status);
                    return (
                      <TableRow key={r.id} className={overdue ? "bg-destructive/5" : ""}>
                        <TableCell className="font-medium">{r.customers?.full_name || "N/A"}</TableCell>
                        <TableCell>{r.bookings?.code || "—"}</TableCell>
                        <TableCell className="text-right">{formatVND(r.amount_due)}</TableCell>
                        <TableCell className="text-right">{formatVND(r.amount_paid)}</TableCell>
                        <TableCell className="text-right font-medium">{formatVND(r.amount_remaining)}</TableCell>
                        <TableCell className={overdue ? "text-destructive font-medium" : ""}>{r.due_date || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={overdue ? "destructive" : r.status === "PAID" ? "default" : "secondary"}>
                            {overdue ? "Quá hạn" : r.status || "CURRENT"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {receivables.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">Không có công nợ</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payable" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nhà cung cấp</TableHead>
                    <TableHead>Mô tả</TableHead>
                    <TableHead className="text-right">Phải trả</TableHead>
                    <TableHead className="text-right">Đã trả</TableHead>
                    <TableHead className="text-right">Còn lại</TableHead>
                    <TableHead>Hạn</TableHead>
                    <TableHead>Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payables.map((r) => {
                    const overdue = isOverdue(r.due_date, r.status);
                    return (
                      <TableRow key={r.id} className={overdue ? "bg-destructive/5" : ""}>
                        <TableCell className="font-medium">{r.supplier_name}</TableCell>
                        <TableCell>{r.description || "—"}</TableCell>
                        <TableCell className="text-right">{formatVND(r.amount_due)}</TableCell>
                        <TableCell className="text-right">{formatVND(r.amount_paid)}</TableCell>
                        <TableCell className="text-right font-medium">{formatVND(r.amount_remaining)}</TableCell>
                        <TableCell className={overdue ? "text-destructive font-medium" : ""}>{r.due_date || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={overdue ? "destructive" : r.status === "PAID" ? "default" : "secondary"}>
                            {overdue ? "Quá hạn" : r.status || "PENDING"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {payables.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">Không có công nợ</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
