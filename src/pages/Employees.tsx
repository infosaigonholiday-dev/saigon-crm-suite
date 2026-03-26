import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, Plus, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EmployeeFormDialog } from "@/components/employees/EmployeeFormDialog";

const statusLabels: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "Đang làm", className: "bg-success/15 text-success border-success/30" },
  PROBATION: { label: "Thử việc", className: "bg-warning/15 text-warning border-warning/30" },
  INTERN: { label: "Thực tập", className: "bg-accent/15 text-accent border-accent/30" },
  RESIGNED: { label: "Đã nghỉ", className: "bg-destructive/10 text-destructive border-destructive/20" },
  ON_LEAVE: { label: "Nghỉ phép", className: "bg-muted text-muted-foreground" },
};

const employmentTypes: Record<string, string> = {
  FULLTIME: "Chính thức",
  PROBATION: "Thử việc",
  INTERN: "Thực tập",
  PARTTIME: "Bán thời gian",
  CONTRACT: "Hợp đồng",
};

const PAGE_SIZE = 20;

export default function Employees() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [page, setPage] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("departments").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: employees = [], isLoading, refetch } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, employee_code, full_name, phone, email, position, level, status, employment_type, gender, departments(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = employees.filter((e) => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      e.full_name.toLowerCase().includes(q) ||
      e.employee_code.toLowerCase().includes(q) ||
      (e.email?.toLowerCase().includes(q));
    const matchStatus = statusFilter === "ALL" || e.status === statusFilter;
    const matchDept = deptFilter === "ALL" || (e.departments as any)?.name === deptFilter;
    const matchType = typeFilter === "ALL" || e.employment_type === typeFilter;
    return matchSearch && matchStatus && matchDept && matchType;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Nhân sự</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} nhân viên</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />Thêm nhân viên
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Tìm tên, mã NV, email..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={deptFilter} onValueChange={(v) => { setDeptFilter(v); setPage(0); }}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Phòng ban" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả phòng ban</SelectItem>
                  {departments.map((d) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả</SelectItem>
                  {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(0); }}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Loại NV" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả</SelectItem>
                  {Object.entries(employmentTypes).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã NV</TableHead>
                    <TableHead>Họ tên</TableHead>
                    <TableHead>Điện thoại</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Vị trí</TableHead>
                    <TableHead>Phòng ban</TableHead>
                    <TableHead>Loại NV</TableHead>
                    <TableHead>Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((e) => {
                    const st = statusLabels[e.status ?? "ACTIVE"] ?? statusLabels.ACTIVE;
                    const deptName = (e.departments as any)?.name ?? "—";
                    return (
                      <TableRow key={e.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/nhan-su/${e.id}`)}>
                        <TableCell className="font-mono text-xs">{e.employee_code}</TableCell>
                        <TableCell className="font-medium">{e.full_name}</TableCell>
                        <TableCell>{e.phone ?? "—"}</TableCell>
                        <TableCell>{e.email ?? "—"}</TableCell>
                        <TableCell>{e.position ?? "—"}</TableCell>
                        <TableCell>{deptName}</TableCell>
                        <TableCell className="text-xs">{employmentTypes[e.employment_type ?? ""] ?? e.employment_type ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={st.className}>{st.label}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {paginated.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Không có dữ liệu</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    Trang {page + 1} / {totalPages} ({filtered.length} kết quả)
                  </p>
                  <div className="flex gap-1">
                    <Button variant="outline" size="icon" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <EmployeeFormDialog open={dialogOpen} onOpenChange={setDialogOpen} onSuccess={() => { refetch(); setDialogOpen(false); }} />
    </div>
  );
}
