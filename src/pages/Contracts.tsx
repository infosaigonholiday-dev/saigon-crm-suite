import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2 } from "lucide-react";
import ContractFormDialog from "@/components/contracts/ContractFormDialog";
import ContractDetailDialog from "@/components/contracts/ContractDetailDialog";

type ContractStatus = "DRAFT" | "PENDING_SIGN" | "SIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

const statusConfig: Record<ContractStatus, { label: string; className: string }> = {
  DRAFT: { label: "Nháp", className: "bg-secondary text-secondary-foreground" },
  PENDING_SIGN: { label: "Chờ ký", className: "bg-warning/15 text-warning border-warning/30" },
  SIGNED: { label: "Đã ký", className: "bg-accent/15 text-accent border-accent/30" },
  IN_PROGRESS: { label: "Đang thực hiện", className: "bg-primary/10 text-primary border-primary/20" },
  COMPLETED: { label: "Hoàn thành", className: "bg-green-100 text-green-700 border-green-300" },
  CANCELLED: { label: "Đã hủy", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

const allStatuses = Object.keys(statusConfig) as ContractStatus[];

const formatCurrency = (v: number | null) =>
  v ? v.toLocaleString("vi-VN") + "đ" : "—";

export default function Contracts() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["contracts", statusFilter, dateFrom, dateTo],
    queryFn: async () => {
      let q = supabase
        .from("contracts")
        .select("id, code, booking_id, customer_id, contract_type, total_value, status, signed_at, created_at, customers(full_name), bookings(code)")
        .order("created_at", { ascending: false });

      if (statusFilter !== "ALL") {
        q = q.eq("status", statusFilter);
      }
      if (dateFrom) q = q.gte("created_at", dateFrom);
      if (dateTo) q = q.lte("created_at", dateTo + "T23:59:59");

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hợp đồng</h1>
          <p className="text-sm text-muted-foreground">{contracts.length} hợp đồng</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />Tạo hợp đồng
        </Button>
      </div>

      <ContractFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <ContractDetailDialog contractId={detailId} open={!!detailId} onOpenChange={(v) => !v && setDetailId(null)} />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả</SelectItem>
            {allStatuses.map((s) => (
              <SelectItem key={s} value={s}>{statusConfig[s].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="date" className="w-[160px]" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="Từ ngày" />
        <Input type="date" className="w-[160px]" value={dateTo} onChange={(e) => setDateTo(e.target.value)} placeholder="Đến ngày" />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã HĐ</TableHead>
                  <TableHead>Khách hàng</TableHead>
                  <TableHead>Mã Booking</TableHead>
                  <TableHead>Loại HĐ</TableHead>
                  <TableHead>Giá trị</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Ngày ký</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((c) => {
                  const status = (c.status as ContractStatus) ?? "DRAFT";
                  const cfg = statusConfig[status] ?? statusConfig.DRAFT;
                  return (
                    <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetailId(c.id)}>
                      <TableCell className="font-mono text-xs">{c.code}</TableCell>
                      <TableCell className="font-medium">{(c.customers as any)?.full_name ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{(c.bookings as any)?.code ?? "—"}</TableCell>
                      <TableCell>{c.contract_type ?? "—"}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(c.total_value)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>
                      </TableCell>
                      <TableCell>{c.signed_at ? new Date(c.signed_at).toLocaleDateString("vi-VN") : "—"}</TableCell>
                    </TableRow>
                  );
                })}
                {contracts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Không có dữ liệu</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
