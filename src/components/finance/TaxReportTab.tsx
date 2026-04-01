import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Download } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { exportToCSV } from "@/lib/exportUtils";

const formatVND = (v: number | null) => {
  if (!v) return "0";
  return new Intl.NumberFormat("vi-VN").format(v);
};

export function TaxReportTab() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["tax-report"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tax_records")
        .select("*")
        .order("period_start", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const statusColor = (s: string | null) => {
    if (s === "SUBMITTED" || s === "PAID") return "default";
    if (s === "OVERDUE") return "destructive";
    return "secondary";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Thuế VAT & TNDN</h2>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => exportToCSV(
                data.map(r => ({ Kỳ: `${r.period_start} → ${r.period_end}`, 'VAT đầu ra': r.vat_output, 'VAT đầu vào': r.vat_input, 'VAT phải nộp': r.vat_payable, 'Thuế TNDN': r.cit_amount, 'Trạng thái': r.status })),
                'bao-cao-thue'
              )}>
                <Download className="h-4 w-4 mr-2" />Xuất CSV
              </Button>
            </TooltipTrigger>
            <TooltipContent>Tải file CSV — mở bằng Google Sheet hoặc Excel</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kỳ</TableHead>
                <TableHead className="text-right">VAT đầu ra</TableHead>
                <TableHead className="text-right">VAT đầu vào</TableHead>
                <TableHead className="text-right">VAT phải nộp</TableHead>
                <TableHead className="text-right">Thuế TNDN</TableHead>
                <TableHead>Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    {r.period_start} → {r.period_end}
                  </TableCell>
                  <TableCell className="text-right">{formatVND(r.vat_output)}</TableCell>
                  <TableCell className="text-right">{formatVND(r.vat_input)}</TableCell>
                  <TableCell className="text-right font-medium">{formatVND(r.vat_payable)}</TableCell>
                  <TableCell className="text-right">{formatVND(r.cit_amount)}</TableCell>
                  <TableCell>
                    <Badge variant={statusColor(r.status)}>{r.status || "DRAFT"}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">Chưa có dữ liệu</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
