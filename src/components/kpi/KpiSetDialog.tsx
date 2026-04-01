import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

interface KpiSetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: { id: string; full_name: string; department_id: string | null }[];
  onSuccess: () => void;
}

interface KpiRow {
  kpi_name: string;
  target_value: string;
  unit: string;
}

const defaultKpis: KpiRow[] = [
  { kpi_name: "Doanh thu", target_value: "", unit: "currency" },
  { kpi_name: "Số booking mới", target_value: "", unit: "number" },
];

export function KpiSetDialog({ open, onOpenChange, employees, onSuccess }: KpiSetDialogProps) {
  const { user } = useAuth();
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [periodType, setPeriodType] = useState("monthly");
  const [periodValue, setPeriodValue] = useState(String(new Date().getMonth() + 1));
  const [periodYear] = useState(new Date().getFullYear());
  const [rows, setRows] = useState<KpiRow[]>([...defaultKpis]);
  const [saving, setSaving] = useState(false);

  const addRow = () => setRows([...rows, { kpi_name: "", target_value: "", unit: "number" }]);
  const removeRow = (i: number) => setRows(rows.filter((_, idx) => idx !== i));
  const updateRow = (i: number, field: keyof KpiRow, val: string) => {
    const next = [...rows];
    next[i] = { ...next[i], [field]: val };
    setRows(next);
  };

  const handleSave = async () => {
    if (!selectedEmployee) { toast.error("Chọn nhân viên"); return; }
    const valid = rows.filter(r => r.kpi_name && r.target_value);
    if (valid.length === 0) { toast.error("Nhập ít nhất 1 KPI"); return; }

    const emp = employees.find(e => e.id === selectedEmployee);
    setSaving(true);
    try {
      const inserts = valid.map(r => ({
        employee_id: selectedEmployee,
        department_id: emp?.department_id || null,
        period_type: periodType,
        period_year: periodYear,
        period_value: Number(periodValue),
        kpi_name: r.kpi_name,
        target_value: Number(r.target_value),
        unit: r.unit,
        created_by: user!.id,
      }));
      const { error } = await supabase.from("employee_kpis").insert(inserts as any);
      if (error) throw error;
      toast.success("Đã set KPI thành công");
      onSuccess();
      onOpenChange(false);
      setRows([...defaultKpis]);
      setSelectedEmployee("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Thiết lập KPI</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nhân viên</Label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger><SelectValue placeholder="Chọn nhân viên" /></SelectTrigger>
              <SelectContent>
                {employees.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Kỳ</Label>
              <Select value={periodType} onValueChange={setPeriodType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Tháng</SelectItem>
                  <SelectItem value="quarterly">Quý</SelectItem>
                  <SelectItem value="yearly">Năm</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{periodType === "quarterly" ? "Quý" : "Tháng"}</Label>
              <Select value={periodValue} onValueChange={setPeriodValue}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(periodType === "quarterly" ? [1,2,3,4] : Array.from({length:12},(_,i)=>i+1)).map(v => (
                    <SelectItem key={v} value={String(v)}>{periodType === "quarterly" ? `Q${v}` : `Tháng ${v}`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Chỉ tiêu KPI</Label>
            {rows.map((row, i) => (
              <div key={i} className="flex gap-2 items-end">
                <Input placeholder="Tên KPI" value={row.kpi_name} onChange={e => updateRow(i, "kpi_name", e.target.value)} className="flex-1" />
                <Input placeholder="Target" type="number" value={row.target_value} onChange={e => updateRow(i, "target_value", e.target.value)} className="w-28" />
                <Select value={row.unit} onValueChange={v => updateRow(i, "unit", v)}>
                  <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="number">Số</SelectItem>
                    <SelectItem value="currency">VNĐ</SelectItem>
                    <SelectItem value="percent">%</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" onClick={() => removeRow(i)} disabled={rows.length <= 1}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addRow}><Plus className="h-3 w-3 mr-1" />Thêm KPI</Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Lưu KPI
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
