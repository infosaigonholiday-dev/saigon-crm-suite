import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import QuotationFormDialog from "@/components/quotations/QuotationFormDialog";
import InternalNotesDialog from "@/components/shared/InternalNotesDialog";
import { NotesCountBadge } from "@/components/shared/NotesCountBadge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, Plus, Loader2, MessageSquare } from "lucide-react";

const statusLabels: Record<string, string> = {
  DRAFT: "Nháp",
  SENT: "Đã gửi",
  ACCEPTED: "Chấp nhận",
  REJECTED: "Từ chối",
  EXPIRED: "Hết hạn",
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SENT: "bg-primary/15 text-primary",
  ACCEPTED: "bg-green-100 text-green-700",
  REJECTED: "bg-destructive/15 text-destructive",
  EXPIRED: "bg-muted text-muted-foreground",
};

export default function Quotations() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notesOpenId, setNotesOpenId] = useState<string | null>(null);

  const { data: quotations, isLoading } = useQuery({
    queryKey: ["quotations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotations" as any)
        .select("*, customers(full_name), tour_packages(name, code)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

  const filtered = quotations?.filter((q: any) => {
    if (statusFilter !== "ALL" && q.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return q.code?.toLowerCase().includes(s) || q.customers?.full_name?.toLowerCase().includes(s);
    }
    return true;
  });

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Báo giá</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Tạo báo giá
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Tìm mã BG, khách hàng..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả</SelectItem>
                <SelectItem value="DRAFT">Nháp</SelectItem>
                <SelectItem value="SENT">Đã gửi</SelectItem>
                <SelectItem value="ACCEPTED">Chấp nhận</SelectItem>
                <SelectItem value="REJECTED">Từ chối</SelectItem>
                <SelectItem value="EXPIRED">Hết hạn</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã BG</TableHead>
                  <TableHead>Khách hàng</TableHead>
                  <TableHead>Gói tour</TableHead>
                  <TableHead className="text-right">Tổng tiền</TableHead>
                  <TableHead>Hiệu lực</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead className="text-right">Ghi chú</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                      Chưa có báo giá nào
                    </TableCell>
                  </TableRow>
                )}
                {filtered?.map((q: any) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-medium">{q.code}</TableCell>
                    <TableCell>{q.customers?.full_name ?? "—"}</TableCell>
                    <TableCell>{q.tour_packages?.name ?? "—"}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(q.total_amount)} {q.currency}</TableCell>
                    <TableCell className="text-sm">
                      {q.valid_from} → {q.valid_until}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[q.status] ?? ""} variant="secondary">
                        {statusLabels[q.status] ?? q.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {q.created_at ? new Date(q.created_at).toLocaleDateString("vi-VN") : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setNotesOpenId(q.id)} className="h-7 px-2 gap-1">
                        <MessageSquare className="h-3.5 w-3.5" />
                        <NotesCountBadge entityType="quotation" entityId={q.id} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <QuotationFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <InternalNotesDialog
        open={!!notesOpenId}
        onOpenChange={(o) => !o && setNotesOpenId(null)}
        entityType="quotation"
        entityId={notesOpenId}
        title="Ghi chú nội bộ — Báo giá"
      />
    </div>
  );
}
