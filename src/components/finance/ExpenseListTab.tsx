import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Pencil, Trash2, Upload, Copy, ArrowUp, ArrowDown, ArrowUpDown, X, Search } from "lucide-react";
import { toast } from "sonner";
import { ExpenseFormDialog } from "./ExpenseFormDialog";
import { ImportOfficeExpenseDialog } from "./ImportOfficeExpenseDialog";
import { CopyFromLastMonthDialog } from "./CopyFromLastMonthDialog";
import { RecurringExpensesSection } from "./RecurringExpensesSection";

const formatCurrency = (v: number) => new Intl.NumberFormat("vi-VN").format(v) + "đ";

interface Props {
  title: string;
  tableName: "office_expenses" | "marketing_expenses" | "other_expenses";
  categories: { value: string; label: string }[];
  queryKey: string;
}

type SortField = "expense_date" | "amount";
type SortDir = "asc" | "desc";

export function ExpenseListTab({ title, tableName, categories, queryKey }: Props) {
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission("finance", "edit");
  const canDelete = hasPermission("finance", "edit");
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  // Toolbar state
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("__ALL__");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [filterRecorder, setFilterRecorder] = useState<string>("__ALL__");
  const [sortField, setSortField] = useState<SortField>("expense_date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const currentYear = new Date().getFullYear();

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: [queryKey, currentYear],
    queryFn: async () => {
      const startDate = `${currentYear}-01-01`;
      const endDate = `${currentYear + 1}-01-01`;
      const { data, error } = await supabase
        .from(tableName)
        .select("id, expense_date, category, description, amount, recorded_by")
        .gte("expense_date", startDate)
        .lt("expense_date", endDate)
        .order("expense_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Recorders list
  const recorderIds = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach((e: any) => { if (e.recorded_by) set.add(e.recorded_by); });
    return Array.from(set);
  }, [expenses]);

  const { data: recorders = [] } = useQuery({
    queryKey: [queryKey, "recorders", recorderIds.join(",")],
    queryFn: async () => {
      if (recorderIds.length === 0) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", recorderIds);
      if (error) throw error;
      return data;
    },
    enabled: recorderIds.length > 0,
  });

  const recorderName = (id: string | null) => {
    if (!id) return "—";
    return (recorders as any[]).find((r) => r.id === id)?.full_name || "—";
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(tableName).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      toast.success("Đã xoá");
    },
  });

  // Apply filters + sort
  const filtered = useMemo(() => {
    let arr = [...expenses] as any[];
    if (search) {
      arr = arr.filter((e) => {
        const desc = (e.description || "").toLowerCase();
        const cat = (e.category || "").toLowerCase();
        const catLbl = (categories.find((c) => c.value === e.category)?.label || "").toLowerCase();
        return desc.includes(search) || cat.includes(search) || catLbl.includes(search);
      });
    }
    if (filterCategory !== "__ALL__") arr = arr.filter((e) => e.category === filterCategory);
    if (fromDate) arr = arr.filter((e) => e.expense_date >= fromDate);
    if (toDate) arr = arr.filter((e) => e.expense_date <= toDate);
    if (filterRecorder !== "__ALL__") arr = arr.filter((e) => e.recorded_by === filterRecorder);

    arr.sort((a, b) => {
      let cmp = 0;
      if (sortField === "expense_date") {
        cmp = (a.expense_date || "").localeCompare(b.expense_date || "");
      } else {
        cmp = Number(a.amount || 0) - Number(b.amount || 0);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [expenses, search, filterCategory, fromDate, toDate, filterRecorder, sortField, sortDir, categories]);

  const total = filtered.reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);
  const catLabel = (cat: string) => categories.find((c) => c.value === cat)?.label || cat;

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const sortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 inline ml-1 opacity-50" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 inline ml-1" /> : <ArrowDown className="h-3 w-3 inline ml-1" />;
  };

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setFilterCategory("__ALL__");
    setFromDate("");
    setToDate("");
    setFilterRecorder("__ALL__");
  };

  const hasFilters = !!(search || filterCategory !== "__ALL__" || fromDate || toDate || filterRecorder !== "__ALL__");

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            Tổng {title.toLowerCase()} {hasFilters ? "(đã lọc)" : `năm ${currentYear}`}
          </p>
          <p className="text-2xl font-bold">{formatCurrency(total)}</p>
        </CardContent>
      </Card>

      <RecurringExpensesSection tableName={tableName} categories={categories} queryKey={queryKey} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2 flex-wrap">
          <CardTitle className="text-base">{title}</CardTitle>
          {canEdit && (
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => setCopyOpen(true)}>
                <Copy className="h-4 w-4 mr-1" /> Copy tháng trước
              </Button>
              <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
                <Upload className="h-4 w-4 mr-1" /> Import Excel
              </Button>
              <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Thêm
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap gap-2 items-center bg-muted/30 p-3 rounded-md">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tìm theo mô tả, phân loại..."
                className="pl-8 h-9"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Phân loại" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">Tất cả phân loại</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-[150px] h-9"
              placeholder="Từ ngày"
            />
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-[150px] h-9"
              placeholder="Đến ngày"
            />
            <Select value={filterRecorder} onValueChange={setFilterRecorder}>
              <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Người nhập" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">Mọi người nhập</SelectItem>
                {(recorders as any[]).map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button size="sm" variant="ghost" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" /> Xóa lọc
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              {hasFilters ? "Không có dữ liệu phù hợp bộ lọc" : "Chưa có dữ liệu"}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("expense_date")}>
                    Ngày {sortIcon("expense_date")}
                  </TableHead>
                  <TableHead>Phân loại</TableHead>
                  <TableHead>Mô tả</TableHead>
                  <TableHead>Người nhập</TableHead>
                  <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort("amount")}>
                    Số tiền {sortIcon("amount")}
                  </TableHead>
                  {canEdit && <TableHead className="w-[80px]" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell>{e.expense_date}</TableCell>
                    <TableCell><Badge variant="outline">{catLabel(e.category)}</Badge></TableCell>
                    <TableCell className="max-w-[300px] truncate">{e.description || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{recorderName(e.recorded_by)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(Number(e.amount))}</TableCell>
                    {canEdit && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setEditing(e); setDialogOpen(true); }}><Pencil className="h-3 w-3" /></Button>
                          {canDelete && (
                            <Button variant="ghost" size="icon" onClick={() => { if (confirm("Xoá?")) deleteMutation.mutate(e.id); }}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ExpenseFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        expense={editing}
        tableName={tableName}
        categories={categories}
        queryKey={queryKey}
      />

      <ImportOfficeExpenseDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        tableName={tableName}
        categories={categories}
        queryKey={queryKey}
        title={title}
      />

      <CopyFromLastMonthDialog
        open={copyOpen}
        onOpenChange={setCopyOpen}
        tableName={tableName}
        categories={categories}
        queryKey={queryKey}
      />
    </div>
  );
}
