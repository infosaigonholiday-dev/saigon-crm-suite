import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save, Download } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { exportToCSV } from "@/lib/exportUtils";

interface KpiTeamTableProps {
  kpis: any[];
  employees: { id: string; full_name: string; position: string | null }[];
  canEdit: boolean;
  onRefetch: () => void;
}

function getPctBadge(pct: number) {
  if (pct >= 80) return <Badge className="bg-green-100 text-green-700 border-green-300">{pct}%</Badge>;
  if (pct >= 50) return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">{pct}%</Badge>;
  return <Badge className="bg-red-100 text-red-700 border-red-300">{pct}%</Badge>;
}

export function KpiTeamTable({ kpis, employees, canEdit, onRefetch }: KpiTeamTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  const empMap = new Map(employees.map(e => [e.id, e]));

  // Group KPIs by employee
  const grouped = new Map<string, any[]>();
  kpis.forEach(k => {
    const list = grouped.get(k.employee_id) || [];
    list.push(k);
    grouped.set(k.employee_id, list);
  });

  // Get unique KPI names for columns
  const kpiNames = [...new Set(kpis.map(k => k.kpi_name))];

  const handleSaveActual = async (kpiId: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("employee_kpis")
        .update({ actual_value: Number(editValue) } as any)
        .eq("id", kpiId);
      if (error) throw error;
      toast.success("Đã cập nhật");
      setEditingId(null);
      onRefetch();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">KPI nhân viên</CardTitle>
        {kpis.length > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => {
                  const rows = kpis.map((k: any) => {
                    const emp = empMap.get(k.employee_id);
                    return { 'Nhân viên': emp?.full_name || '', 'Chức vụ': emp?.position || '', 'KPI': k.kpi_name, 'Target': k.target_value, 'Thực tế': k.actual_value, '% Đạt': k.achievement_pct };
                  });
                  exportToCSV(rows, 'kpi-nhan-vien');
                }}>
                  <Download className="h-4 w-4 mr-2" />Xuất CSV
                </Button>
              </TooltipTrigger>
              <TooltipContent>Tải file CSV — mở bằng Google Sheet hoặc Excel</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </CardHeader>
      <CardContent>
        {kpis.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Chưa có KPI nào được thiết lập</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nhân viên</TableHead>
                  <TableHead>Chức vụ</TableHead>
                  {kpiNames.map(name => (
                    <TableHead key={name} className="text-center">{name}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from(grouped.entries()).map(([empId, empKpis]) => {
                  const emp = empMap.get(empId);
                  return (
                    <TableRow key={empId}>
                      <TableCell className="font-medium">{emp?.full_name || "N/A"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{emp?.position || "—"}</TableCell>
                      {kpiNames.map(name => {
                        const kpi = empKpis.find((k: any) => k.kpi_name === name);
                        if (!kpi) return <TableCell key={name} className="text-center text-muted-foreground">—</TableCell>;
                        const pct = Number(kpi.achievement_pct) || 0;
                        return (
                          <TableCell key={name} className="text-center">
                            {editingId === kpi.id ? (
                              <div className="flex items-center gap-1 justify-center">
                                <Input
                                  type="number"
                                  value={editValue}
                                  onChange={e => setEditValue(e.target.value)}
                                  className="w-20 h-7 text-xs"
                                />
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleSaveActual(kpi.id)} disabled={saving}>
                                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                </Button>
                              </div>
                            ) : (
                              <div
                                className={canEdit ? "cursor-pointer" : ""}
                                onClick={() => {
                                  if (!canEdit) return;
                                  setEditingId(kpi.id);
                                  setEditValue(String(kpi.actual_value || 0));
                                }}
                              >
                                {getPctBadge(pct)}
                              </div>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
