import { useState } from "react";
import * as XLSX from "xlsx";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, Download, FileSpreadsheet, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface ParsedRow {
  date: string;
  category: string;
  description: string;
  amount: number;
  notes: string;
  error?: string;
}

const TEMPLATE_HEADERS = ["Ngày (YYYY-MM-DD)", "Danh mục", "Mô tả", "Số tiền", "Ghi chú"];

const CATEGORY_FALLBACK_MAP: Record<string, string> = {
  "văn phòng phẩm": "OFFICE_SUPPLIES",
  "điện nước": "UTILITIES",
  "thuê văn phòng": "OFFICE_RENT",
  "marketing / quảng cáo": "MARKETING",
  "tiếp khách": "ENTERTAINMENT",
  lương: "SALARY",
  "bhxh / bhyt / bhtn": "BHXH",
  "phí dịch vụ": "SERVICE_FEE",
  "vận chuyển": "TRANSPORT",
  khác: "OTHER",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportExpensesDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");

  const { data: dbCategories = [] } = useQuery({
    queryKey: ["expense-categories-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expense_categories")
        .select("id, name")
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      TEMPLATE_HEADERS,
      ["2026-04-25", "Văn phòng phẩm", "Mua giấy A4 và mực in", 350000, "HĐ #1234"],
      ["2026-04-25", "Tiếp khách", "Cafe gặp KH ABC", 250000, ""],
    ]);
    ws["!cols"] = [{ wch: 18 }, { wch: 22 }, { wch: 35 }, { wch: 14 }, { wch: 25 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Chi phí");
    XLSX.writeFile(wb, "Mau_Nhap_Chi_Phi.xlsx");
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
        const dataRows = rows.slice(1).filter((r) => r.length > 0 && r.some((c) => String(c).trim()));

        const validNames = new Set(dbCategories.map((c: any) => c.name.toLowerCase().trim()));
        const result: ParsedRow[] = dataRows.map((row) => {
          const [rawDate, rawCat, rawDesc, rawAmt, rawNotes] = row;
          const date = String(rawDate ?? "").trim();
          const category = String(rawCat ?? "").trim();
          const description = String(rawDesc ?? "").trim();
          const amountStr = String(rawAmt ?? "0").replace(/[^\d.-]/g, "");
          const amount = Number(amountStr);
          const notes = String(rawNotes ?? "").trim();

          let error: string | undefined;
          if (!date.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) error = "Ngày sai định dạng (YYYY-MM-DD)";
          else if (!category) error = "Thiếu danh mục";
          else if (!validNames.has(category.toLowerCase())) error = `Danh mục "${category}" không có trong hệ thống`;
          else if (!amount || amount <= 0) error = "Số tiền phải > 0";
          else if (!description) error = "Thiếu mô tả";

          return { date, category, description, amount, notes, error };
        });
        setParsed(result);
      } catch (err) {
        toast.error("Lỗi đọc file: " + (err as Error).message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      const valid = parsed.filter((p) => !p.error);
      if (valid.length === 0) throw new Error("Không có dòng hợp lệ");

      const payload = valid.map((p) => {
        const matched = dbCategories.find((c: any) => c.name.toLowerCase() === p.category.toLowerCase());
        const categoryCode = CATEGORY_FALLBACK_MAP[p.category.toLowerCase()] ?? "OTHER";
        return {
          transaction_date: p.date,
          type: "EXPENSE" as const,
          category: categoryCode,
          amount: p.amount,
          description: p.description,
          notes: p.notes || null,
          submitted_by: user!.id,
          recorded_by: user!.id,
          approval_status: "PENDING_HR" as const,
          expense_category_id: matched?.id ?? null,
        };
      });

      const { error } = await supabase.from("transactions").insert(payload);
      if (error) throw error;
      return valid.length;
    },
    onSuccess: (count) => {
      toast.success(`Đã import ${count} chi phí — chờ HR duyệt`);
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      setParsed([]);
      setFileName("");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error("Lỗi import: " + (e.message ?? "")),
  });

  const validCount = parsed.filter((p) => !p.error).length;
  const errorCount = parsed.filter((p) => p.error).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import chi phí từ Excel</DialogTitle>
          <DialogDescription>
            Tải file mẫu, điền dữ liệu, upload lại. Mỗi dòng = 1 chi phí — sẽ ở trạng thái "Chờ HR duyệt".
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-1" /> Tải mẫu Excel
            </Button>
            <label className="inline-flex">
              <Button asChild variant="default" size="sm">
                <span className="cursor-pointer inline-flex items-center">
                  <Upload className="h-4 w-4 mr-1" /> Chọn file Excel (.xlsx)
                </span>
              </Button>
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFile}
              />
            </label>
            {fileName && (
              <span className="text-sm text-muted-foreground inline-flex items-center gap-1">
                <FileSpreadsheet className="h-4 w-4" /> {fileName}
              </span>
            )}
          </div>

          {parsed.length > 0 && (
            <>
              <div className="flex gap-3 text-sm">
                <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                  Hợp lệ: {validCount}
                </Badge>
                {errorCount > 0 && (
                  <Badge variant="destructive">
                    <AlertCircle className="h-3 w-3 mr-1" /> Lỗi: {errorCount}
                  </Badge>
                )}
              </div>

              <div className="border rounded-md max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">#</TableHead>
                      <TableHead>Ngày</TableHead>
                      <TableHead>Danh mục</TableHead>
                      <TableHead>Mô tả</TableHead>
                      <TableHead className="text-right">Số tiền</TableHead>
                      <TableHead>Ghi chú</TableHead>
                      <TableHead>Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsed.map((p, i) => (
                      <TableRow key={i} className={p.error ? "bg-destructive/5" : ""}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell>{p.date || "—"}</TableCell>
                        <TableCell>{p.category || "—"}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{p.description || "—"}</TableCell>
                        <TableCell className="text-right">
                          {p.amount > 0 ? p.amount.toLocaleString("vi-VN") + "đ" : "—"}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">{p.notes || "—"}</TableCell>
                        <TableCell>
                          {p.error ? (
                            <span className="text-xs text-destructive">{p.error}</span>
                          ) : (
                            <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20">
                              OK
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Huỷ</Button>
          <Button
            onClick={() => importMutation.mutate()}
            disabled={importMutation.isPending || validCount === 0}
          >
            {importMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Import {validCount} dòng hợp lệ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
