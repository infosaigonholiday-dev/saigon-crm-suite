import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableName: "office_expenses" | "marketing_expenses" | "other_expenses";
  categories: { value: string; label: string }[];
  queryKey: string;
  title: string;
}

interface ParsedRow {
  category: string;
  categoryLabel: string;
  description: string;
  amount: number;
  expense_date: string;
  notes: string;
  error?: string;
}

const SAMPLE_BY_TABLE: Record<string, any[][]> = {
  office_expenses: [
    ["Tiền nhà", "Tiền thuê văn phòng tháng", 16000000, "01/04/2026", ""],
    ["Tiền điện", "Hoá đơn điện EVN", 1070010, "05/04/2026", ""],
    ["Tiền nước", "Hoá đơn nước Sawaco", 350000, "05/04/2026", ""],
  ],
  marketing_expenses: [
    ["Quảng cáo", "Facebook Ads campaign A", 5000000, "10/04/2026", ""],
    ["Nội dung", "Thuê copywriter", 2000000, "12/04/2026", ""],
  ],
  other_expenses: [
    ["Pháp lý", "Phí công chứng hợp đồng", 500000, "08/04/2026", ""],
    ["Phí ngân hàng", "Phí duy trì TK doanh nghiệp", 220000, "01/04/2026", ""],
  ],
};

function parseDate(input: string): string | null {
  if (!input) return null;
  const s = String(input).trim();
  // dd/mm/yyyy
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    let [_, d, mo, y] = m;
    if (y.length === 2) y = "20" + y;
    const dd = d.padStart(2, "0");
    const mm = mo.padStart(2, "0");
    const date = new Date(`${y}-${mm}-${dd}`);
    if (isNaN(date.getTime())) return null;
    return `${y}-${mm}-${dd}`;
  }
  // yyyy-mm-dd
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
    const date = new Date(s);
    if (isNaN(date.getTime())) return null;
    return s;
  }
  // Excel serial number
  const n = Number(s);
  if (!isNaN(n) && n > 1000) {
    const d = XLSX.SSF?.parse_date_code?.(n);
    if (d) {
      return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
    }
  }
  return null;
}

export function ImportOfficeExpenseDialog({ open, onOpenChange, tableName, categories, queryKey, title }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");

  const labelToValue = useMemo(() => {
    const m = new Map<string, string>();
    categories.forEach((c) => m.set(c.label.toLowerCase().trim(), c.value));
    // Aliases for office
    if (tableName === "office_expenses") {
      m.set("internet", "WIFI");
      m.set("wifi", "WIFI");
      m.set("vpp", "SUPPLIES");
      m.set("văn phòng phẩm", "SUPPLIES");
      m.set("điện thoại", "PHONE");
      m.set("cước điện thoại", "PHONE");
      m.set("gửi xe", "PARKING");
    }
    return m;
  }, [categories, tableName]);

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Phân loại", "Mô tả", "Số tiền", "Ngày (dd/mm/yyyy)", "Ghi chú"],
      ...SAMPLE_BY_TABLE[tableName],
    ]);
    ws["!cols"] = [{ wch: 22 }, { wch: 35 }, { wch: 14 }, { wch: 18 }, { wch: 25 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ChiPhi");
    // Hướng dẫn sheet
    const guide = XLSX.utils.aoa_to_sheet([
      ["Hướng dẫn nhập liệu"],
      [""],
      ["Phân loại hợp lệ:"],
      ...categories.map((c) => [`- ${c.label}`]),
      [""],
      ["Định dạng ngày: dd/mm/yyyy (vd: 25/04/2026)"],
      ["Số tiền: nhập số (không cần dấu phẩy)"],
      ["Mô tả: bắt buộc, không để trống"],
    ]);
    guide["!cols"] = [{ wch: 50 }];
    XLSX.utils.book_append_sheet(wb, guide, "Huong_dan");
    XLSX.writeFile(wb, `Mau_Import_${tableName}.xlsx`);
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
        const dataRows = rows.slice(1).filter((r) => r.length > 0 && r.some((c) => String(c ?? "").trim()));

        const result: ParsedRow[] = dataRows.map((row) => {
          const [rawCat, rawDesc, rawAmt, rawDate, rawNotes] = row;
          const categoryLabel = String(rawCat ?? "").trim();
          const description = String(rawDesc ?? "").trim();
          const amountStr = String(rawAmt ?? "0").replace(/[^\d.-]/g, "");
          const amount = Number(amountStr);
          const dateParsed = parseDate(String(rawDate ?? "").trim());
          const notes = String(rawNotes ?? "").trim();

          const categoryCode = labelToValue.get(categoryLabel.toLowerCase()) ?? "OTHER";

          let error: string | undefined;
          if (!categoryLabel) error = "Thiếu phân loại";
          else if (!description) error = "Thiếu mô tả";
          else if (!amount || amount <= 0) error = "Số tiền phải > 0";
          else if (!dateParsed) error = "Ngày sai định dạng (dd/mm/yyyy)";

          return {
            category: categoryCode,
            categoryLabel,
            description,
            amount,
            expense_date: dateParsed ?? "",
            notes,
            error,
          };
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

      // Lấy department_id của user
      const { data: prof } = await supabase
        .from("profiles")
        .select("department_id")
        .eq("id", user!.id)
        .single();

      const payload = valid.map((p) => ({
        category: p.category,
        description: p.description,
        amount: p.amount,
        expense_date: p.expense_date,
        notes: p.notes || null,
        recorded_by: user!.id,
        department_id: prof?.department_id ?? null,
      }));

      const { error } = await supabase.from(tableName).insert(payload);
      if (error) throw error;
      return valid.length;
    },
    onSuccess: (count) => {
      toast.success(`Đã import ${count} chi phí thành công`);
      queryClient.invalidateQueries({ queryKey: [queryKey] });
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
          <DialogTitle>Import {title} từ Excel</DialogTitle>
          <DialogDescription>
            Tải template, điền dữ liệu, upload lại. Mỗi dòng = 1 chi phí được thêm thẳng vào danh sách.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-1" /> Tải template
            </Button>
            <label className="inline-flex">
              <Button asChild variant="default" size="sm">
                <span className="cursor-pointer inline-flex items-center">
                  <Upload className="h-4 w-4 mr-1" /> Chọn file Excel
                </span>
              </Button>
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
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
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  ✅ Hợp lệ: {validCount}
                </Badge>
                {errorCount > 0 && (
                  <Badge variant="destructive">
                    <AlertCircle className="h-3 w-3 mr-1" /> Lỗi: {errorCount}
                  </Badge>
                )}
              </div>

              <TooltipProvider>
                <div className="border rounded-md max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]">#</TableHead>
                        <TableHead>Phân loại</TableHead>
                        <TableHead>Mô tả</TableHead>
                        <TableHead className="text-right">Số tiền</TableHead>
                        <TableHead>Ngày</TableHead>
                        <TableHead>Trạng thái</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsed.map((p, i) => (
                        <TableRow key={i} className={p.error ? "bg-destructive/5" : ""}>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell>
                            <span className="text-xs">
                              {p.categoryLabel} <Badge variant="outline" className="ml-1">{p.category}</Badge>
                            </span>
                          </TableCell>
                          <TableCell className="max-w-[250px] truncate">{p.description || "—"}</TableCell>
                          <TableCell className="text-right">{p.amount > 0 ? p.amount.toLocaleString("vi-VN") + "đ" : "—"}</TableCell>
                          <TableCell>{p.expense_date || "—"}</TableCell>
                          <TableCell>
                            {p.error ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="destructive" className="cursor-help">
                                    <AlertCircle className="h-3 w-3 mr-1" /> Lỗi
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>{p.error}</TooltipContent>
                              </Tooltip>
                            ) : (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                <CheckCircle2 className="h-3 w-3 mr-1" /> OK
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TooltipProvider>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Huỷ</Button>
          <Button onClick={() => importMutation.mutate()} disabled={importMutation.isPending || validCount === 0}>
            {importMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Import {validCount} dòng hợp lệ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
