import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import CustomerFormDialog from "@/components/customers/CustomerFormDialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, Plus, Loader2, Download } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { exportToCSV } from "@/lib/exportUtils";
import { usePermissions } from "@/hooks/usePermissions";

const PAGE_SIZE = 20;

type Segment = "ALL" | "NEW" | "SILVER" | "GOLD" | "DIAMOND";

const segments: { label: string; value: Segment }[] = [
  { label: "Tất cả", value: "ALL" },
  { label: "Mới", value: "NEW" },
  { label: "Silver", value: "SILVER" },
  { label: "Gold", value: "GOLD" },
  { label: "Diamond", value: "DIAMOND" },
];

const segmentColors: Record<string, string> = {
  NEW: "bg-secondary text-secondary-foreground",
  SILVER: "bg-muted text-muted-foreground",
  GOLD: "bg-warning/15 text-warning border border-warning/30",
  DIAMOND: "bg-accent/15 text-accent border border-accent/30",
};

const tierBadgeConfig: Record<string, { label: string; className: string } | null> = {
  Silver: { label: "Silver", className: "bg-muted text-muted-foreground" },
  Gold: { label: "Gold", className: "bg-amber-100 text-amber-700 border border-amber-300" },
  Diamond: { label: "Diamond", className: "bg-purple-100 text-purple-700 border border-purple-300" },
};

function loyaltyBadge(totalBookings: number) {
  if (totalBookings > 5) return { label: "VIP", className: "bg-destructive/15 text-destructive border border-destructive/30" };
  if (totalBookings >= 3) return { label: "Trung thành", className: "bg-primary/15 text-primary border border-primary/30" };
  if (totalBookings >= 1) return { label: "Mới", className: "bg-muted text-muted-foreground" };
  return null;
}

function formatCurrency(n: number | null) {
  if (!n) return "0";
  return new Intl.NumberFormat("vi-VN").format(n);
}

export default function Customers() {
  const [filter, setFilter] = useState<Segment>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();

  // Count query with filters
  const { data: totalCount = 0 } = useQuery({
    queryKey: ["customers-count", filter, search],
    queryFn: async () => {
      let q = supabase.from("customers").select("*", { count: "exact", head: true });
      if (filter !== "ALL") q = q.eq("segment", filter);
      if (search) q = q.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
      const { count, error } = await q;
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers", filter, search, page],
    queryFn: async () => {
      let q = supabase
        .from("customers")
        .select("id, full_name, phone, email, segment, tier, total_bookings, total_revenue, total_paid, last_booking_date, first_booking_date, source, assigned_sale_id")
        .order("created_at", { ascending: false });
      if (filter !== "ALL") q = q.eq("segment", filter);
      if (search) q = q.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
      q = q.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  // Fetch sale profiles for display
  const saleIds = [...new Set(customers.map((c) => c.assigned_sale_id).filter(Boolean))] as string[];
  const { data: saleProfiles = [] } = useQuery({
    queryKey: ["sale-profiles", saleIds],
    queryFn: async () => {
      if (saleIds.length === 0) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", saleIds);
      if (error) throw error;
      return data;
    },
    enabled: saleIds.length > 0,
  });

  const saleMap = Object.fromEntries(saleProfiles.map((p) => [p.id, p.full_name]));
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const handleFilterChange = (v: Segment) => {
    setFilter(v);
    setPage(0);
  };

  const handleSearchChange = (v: string) => {
    setSearch(v);
    setPage(0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Khách hàng</h1>
          <p className="text-sm text-muted-foreground">{totalCount} khách hàng</p>
        </div>
        <div className="flex gap-2">
          {hasPermission("customers", "export") && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => exportToCSV(
                    customers.map(c => ({
                      'Tên KH': c.full_name, 'Điện thoại': c.phone ?? '', Email: c.email ?? '',
                      'Phân khúc': c.segment ?? '', 'Hạng': c.tier ?? '', 'Booking': c.total_bookings ?? 0,
                      'Doanh thu': c.total_revenue ?? 0, 'Đã TT': c.total_paid ?? 0
                    })),
                    'danh-sach-khach-hang'
                  )}>
                    <Download className="h-4 w-4 mr-2" />Xuất CSV
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Tải file CSV — mở bằng Google Sheet hoặc Excel</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Thêm khách hàng</Button>
        </div>
      </div>
      <CustomerFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <div className="flex gap-1 flex-wrap">
              {segments.map((s) => (
                <Button
                  key={s.value}
                  variant={filter === s.value ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleFilterChange(s.value)}
                  className="text-xs"
                >
                  {s.label}
                </Button>
              ))}
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Tìm kiếm..." className="pl-9" value={search} onChange={(e) => handleSearchChange(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên khách hàng</TableHead>
                  <TableHead>Điện thoại</TableHead>
                  <TableHead>Phân khúc</TableHead>
                  <TableHead>Nguồn</TableHead>
                  <TableHead>Sale phụ trách</TableHead>
                  <TableHead className="text-right">Bookings</TableHead>
                  <TableHead className="text-right">Doanh thu</TableHead>
                  <TableHead className="text-right">Đã TT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => {
                  const badge = loyaltyBadge(c.total_bookings ?? 0);
                  return (
                    <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/khach-hang/${c.id}`)}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {c.full_name}
                          {tierBadgeConfig[c.tier ?? ""] && (
                            <Badge variant="outline" className={tierBadgeConfig[c.tier ?? ""]!.className}>
                              {tierBadgeConfig[c.tier ?? ""]!.label}
                            </Badge>
                          )}
                          {badge && <Badge variant="outline" className={badge.className}>{badge.label}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>{c.phone ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={segmentColors[c.segment ?? "NEW"]}>
                          {c.segment ?? "NEW"}
                        </Badge>
                      </TableCell>
                      <TableCell>{(c as any).source ?? "—"}</TableCell>
                      <TableCell>{c.assigned_sale_id ? (saleMap[c.assigned_sale_id] ?? "—") : "—"}</TableCell>
                      <TableCell className="text-right">{c.total_bookings ?? 0}</TableCell>
                      <TableCell className="text-right">{formatCurrency(c.total_revenue)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(c.total_paid)}</TableCell>
                    </TableRow>
                  );
                })}
                {customers.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Không có dữ liệu</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-4 border-t">
            <span className="text-sm text-muted-foreground">Trang {page + 1} / {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Trước</Button>
              <Button variant="outline" size="sm" disabled={(page + 1) * PAGE_SIZE >= totalCount} onClick={() => setPage(p => p + 1)}>Sau</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
