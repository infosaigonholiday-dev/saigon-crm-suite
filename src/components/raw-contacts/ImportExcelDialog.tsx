import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, Download, FileSpreadsheet, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  departmentId: string | null;
  onComplete: () => void;
}

const HEADER_MAP: Record<string, string> = {
  "họ tên": "full_name",
  "ho ten": "full_name",
  "tên": "full_name",
  "ten": "full_name",
  "full_name": "full_name",
  "sđt": "phone",
  "sdt": "phone",
  "số điện thoại": "phone",
  "so dien thoai": "phone",
  "phone": "phone",
  "điện thoại": "phone",
  "dien thoai": "phone",
  "email": "email",
  "công ty": "company_name",
  "cong ty": "company_name",
  "company": "company_name",
  "company_name": "company_name",
  "tên công ty": "company_name",
  "loại": "contact_type",
  "loai": "contact_type",
  "type": "contact_type",
  "contact_type": "contact_type",
  "nguồn": "source",
  "nguon": "source",
  "source": "source",
  "ghi chú": "note",
  "ghi chu": "note",
  "note": "note",
  "notes": "note",
  "quy mô": "company_size",
  "quy mo": "company_size",
  "company_size": "company_size",
};

type ParsedRow = {
  full_name: string | null;
  phone: string;
  email: string | null;
  company_name: string | null;
  contact_type: string;
  source: string | null;
  note: string | null;
  company_size: string | null;
};

function normalizePhone(raw: string): string {
  return String(raw).replace(/[\s\-\.\(\)]/g, "").trim();
}

function normalizeType(raw: string | null): string {
  if (!raw) return "personal";
  const lower = raw.toLowerCase().trim();
  if (lower.includes("dn") || lower.includes("doanh") || lower.includes("business") || lower.includes("company") || lower === "b2b") return "business";
  return "personal";
}

export function ImportExcelDialog({ open, onOpenChange, userId, departmentId, onComplete }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; duplicates: number; errors: number } | null>(null);

  function reset() {
    setRows([]);
    setFileName("");
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });

        if (jsonData.length === 0) {
          toast.error("File không có dữ liệu");
          return;
        }

        // Map headers
        const rawHeaders = Object.keys(jsonData[0]);
        const fieldMap: Record<string, string> = {};
        for (const h of rawHeaders) {
          const normalized = h.toLowerCase().trim().replace(/\s+/g, " ");
          if (HEADER_MAP[normalized]) {
            fieldMap[h] = HEADER_MAP[normalized];
          }
        }

        if (!Object.values(fieldMap).includes("phone")) {
          toast.error("Không tìm thấy cột SĐT/Phone trong file. Vui lòng kiểm tra lại header.");
          return;
        }

        const parsed: ParsedRow[] = [];
        const seenPhones = new Set<string>();

        for (const row of jsonData) {
          const mapped: Record<string, any> = {};
          for (const [rawKey, field] of Object.entries(fieldMap)) {
            mapped[field] = row[rawKey] != null ? String(row[rawKey]).trim() : null;
          }

          const phone = normalizePhone(mapped.phone || "");
          if (!phone) continue;
          if (seenPhones.has(phone)) continue;
          seenPhones.add(phone);

          parsed.push({
            full_name: mapped.full_name || null,
            phone,
            email: mapped.email || null,
            company_name: mapped.company_name || null,
            contact_type: normalizeType(mapped.contact_type),
            source: mapped.source || null,
            note: mapped.note || null,
            company_size: mapped.company_size || null,
          });
        }

        if (parsed.length === 0) {
          toast.error("Không có dòng hợp lệ (thiếu SĐT)");
          return;
        }

        setRows(parsed);
        toast.success(`Đọc được ${parsed.length} dòng hợp lệ từ file`);
      } catch {
        toast.error("Lỗi đọc file Excel");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleImport() {
    if (rows.length === 0) return;
    setImporting(true);
    let success = 0;
    let duplicates = 0;
    let errors = 0;

    const BATCH_SIZE = 50;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE).map((r) => ({
        ...r,
        status: "new",
        created_by: userId,
        assigned_to: userId,
        department_id: departmentId,
        call_count: 0,
      }));

      const { data, error } = await supabase
        .from("raw_contacts")
        .insert(batch)
        .select("id");

      if (error) {
        if (error.message?.includes("duplicate") || error.code === "23505") {
          // Insert one by one for this batch to identify duplicates
          for (const row of batch) {
            const { error: singleErr } = await supabase.from("raw_contacts").insert(row);
            if (singleErr) {
              if (singleErr.message?.includes("duplicate") || singleErr.code === "23505") {
                duplicates++;
              } else {
                errors++;
              }
            } else {
              success++;
            }
          }
        } else {
          errors += batch.length;
        }
      } else {
        success += data?.length ?? batch.length;
      }
    }

    setResult({ success, duplicates, errors });
    setImporting(false);

    if (success > 0) {
      toast.success(`Import thành công ${success} bản ghi`);
      onComplete();
    }
  }

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Họ tên", "SĐT", "Email", "Công ty", "Loại (CN/DN)", "Nguồn", "Quy mô", "Ghi chú"],
      ["Nguyễn Văn A", "0901234567", "a@gmail.com", "Công ty ABC", "DN", "Facebook", "50-100", "Khách tiềm năng"],
    ]);
    ws["!cols"] = [
      { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 30 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "KhoData");
    XLSX.writeFile(wb, "mau_import_kho_data.xlsx");
  }

  const previewRows = rows.slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import dữ liệu từ Excel
          </DialogTitle>
          <DialogDescription>
            Upload file .xlsx chứa danh sách liên hệ. Hệ thống sẽ tự động map cột theo header.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File input */}
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => fileRef.current?.click()} className="flex-shrink-0">
              <Upload className="h-4 w-4 mr-2" /> Chọn file Excel
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFile}
              className="hidden"
            />
            {fileName && <span className="text-sm text-muted-foreground truncate">{fileName}</span>}
            <Button variant="ghost" size="sm" onClick={downloadTemplate} className="ml-auto flex-shrink-0">
              <Download className="h-4 w-4 mr-1" /> Tải file mẫu
            </Button>
          </div>

          {/* Preview */}
          {rows.length > 0 && !result && (
            <>
              <div className="flex items-center justify-between">
                <Badge variant="secondary">{rows.length} dòng hợp lệ</Badge>
                <span className="text-xs text-muted-foreground">Preview 5 dòng đầu</span>
              </div>
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Họ tên</TableHead>
                      <TableHead>SĐT</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Công ty</TableHead>
                      <TableHead>Loại</TableHead>
                      <TableHead>Nguồn</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>{r.full_name || "—"}</TableCell>
                        <TableCell className="font-mono text-sm">{r.phone}</TableCell>
                        <TableCell>{r.email || "—"}</TableCell>
                        <TableCell>{r.company_name || "—"}</TableCell>
                        <TableCell>{r.contact_type === "business" ? "DN" : "CN"}</TableCell>
                        <TableCell>{r.source || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {rows.length > 5 && (
                <p className="text-xs text-muted-foreground text-center">... và {rows.length - 5} dòng nữa</p>
              )}
            </>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
              <h4 className="font-medium">Kết quả import</h4>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <CheckCircle2 className="h-5 w-5 mx-auto text-green-500 mb-1" />
                  <p className="text-lg font-bold">{result.success}</p>
                  <p className="text-xs text-muted-foreground">Thành công</p>
                </div>
                <div>
                  <XCircle className="h-5 w-5 mx-auto text-yellow-500 mb-1" />
                  <p className="text-lg font-bold">{result.duplicates}</p>
                  <p className="text-xs text-muted-foreground">Trùng SĐT</p>
                </div>
                <div>
                  <XCircle className="h-5 w-5 mx-auto text-destructive mb-1" />
                  <p className="text-lg font-bold">{result.errors}</p>
                  <p className="text-xs text-muted-foreground">Lỗi</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); reset(); }}>
            {result ? "Đóng" : "Hủy"}
          </Button>
          {!result && (
            <Button onClick={handleImport} disabled={rows.length === 0 || importing}>
              {importing && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Import {rows.length > 0 ? `${rows.length} dòng` : ""}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
