import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, CalendarPlus, Loader2, Search } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { B2BTourDetailSheet, type B2BTour } from "@/components/b2b-tours/B2BTourDetailSheet";
import { B2BTourLogsTab } from "@/components/b2b-tours/B2BTourLogsTab";
import { useNavigate } from "react-router-dom";

const PAGE_SIZE = 20;

const fmtVnd = (v: number | null | undefined) =>
  v && v > 0 ? `${Math.round(v).toLocaleString("vi-VN")}đ` : "—";

const calcCommission = (raw: number | null | undefined) =>
  Math.max(0, (raw ?? 0) - 200000);

function SeatBadge({ value }: { value: string | null }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  const num = parseInt(value, 10);
  if (Number.isNaN(num)) {
    return <Badge variant="outline">{value}</Badge>;
  }
  if (num === 0) return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Hết</Badge>;
  if (num <= 9) return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">{num}</Badge>;
  return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{num}</Badge>;
}

export default function B2BTours() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canViewLogs = hasPermission("b2b_tours", "logs");

  const [page, setPage] = useState(0);
  const [filterMarket, setFilterMarket] = useState<string>("all");
  const [filterDest, setFilterDest] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedTour, setSelectedTour] = useState<B2BTour | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Filter options
  const { data: markets = [] } = useQuery({
    queryKey: ["b2b-markets"],
    queryFn: async () => {
      const { data } = await supabase.from("b2b_tours").select("target_market").not("target_market", "is", null);
      return Array.from(new Set((data ?? []).map((r: any) => r.target_market).filter(Boolean))).sort() as string[];
    },
  });

  const { data: destinations = [] } = useQuery({
    queryKey: ["b2b-destinations", filterMarket],
    queryFn: async () => {
      let q = supabase.from("b2b_tours").select("destination").not("destination", "is", null);
      if (filterMarket !== "all") q = q.eq("target_market", filterMarket);
      const { data } = await q;
      return Array.from(new Set((data ?? []).map((r: any) => r.destination).filter(Boolean))).sort() as string[];
    },
  });

  const { data: months = [] } = useQuery({
    queryKey: ["b2b-months"],
    queryFn: async () => {
      const { data } = await supabase.from("b2b_tours").select("thang").not("thang", "is", null);
      return Array.from(new Set((data ?? []).map((r: any) => r.thang).filter(Boolean))).sort() as string[];
    },
  });

  const { data: totalCount = 0 } = useQuery({
    queryKey: ["b2b-tours-count", filterMarket, filterDest, filterMonth, search],
    queryFn: async () => {
      let q = supabase.from("b2b_tours").select("*", { count: "exact", head: true });
      if (filterMarket !== "all") q = q.eq("target_market", filterMarket);
      if (filterDest !== "all") q = q.eq("destination", filterDest);
      if (filterMonth !== "all") q = q.eq("thang", filterMonth);
      if (search.trim()) q = q.ilike("tour_code", `%${search.trim()}%`);
      const { count } = await q;
      return count ?? 0;
    },
  });

  const { data: tours = [], isLoading } = useQuery<B2BTour[]>({
    queryKey: ["b2b-tours", page, filterMarket, filterDest, filterMonth, search],
    queryFn: async () => {
      let q = supabase
        .from("b2b_tours")
        .select("*")
        .order("departure_date", { ascending: true })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (filterMarket !== "all") q = q.eq("target_market", filterMarket);
      if (filterDest !== "all") q = q.eq("destination", filterDest);
      if (filterMonth !== "all") q = q.eq("thang", filterMonth);
      if (search.trim()) q = q.ilike("tour_code", `%${search.trim()}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as B2BTour[];
    },
  });

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const handleViewDetail = (tour: B2BTour) => {
    setSelectedTour(tour);
    setSheetOpen(true);
  };

  const handleCreateBooking = (tour: B2BTour) => {
    navigate(`/dat-tour?prefill_tour=${encodeURIComponent(tour.tour_code)}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Kho Tour B2B</h1>
        <p className="text-sm text-muted-foreground">{totalCount} tour có sẵn</p>
      </div>

      <Tabs defaultValue="catalog" className="space-y-4">
        <TabsList>
          <TabsTrigger value="catalog">Catalog</TabsTrigger>
          {canViewLogs && <TabsTrigger value="logs">Nhật ký</TabsTrigger>}
        </TabsList>

        <TabsContent value="catalog" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
              <Select value={filterMarket} onValueChange={(v) => { setFilterMarket(v); setFilterDest("all"); setPage(0); }}>
                <SelectTrigger><SelectValue placeholder="Thị trường" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả thị trường</SelectItem>
                  {markets.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterDest} onValueChange={(v) => { setFilterDest(v); setPage(0); }}>
                <SelectTrigger><SelectValue placeholder="Điểm đến" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả điểm đến</SelectItem>
                  {destinations.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterMonth} onValueChange={(v) => { setFilterMonth(v); setPage(0); }}>
                <SelectTrigger><SelectValue placeholder="Tháng" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả tháng</SelectItem>
                  {months.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm mã tour..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                  className="pl-9"
                />
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã Tour</TableHead>
                      <TableHead>Điểm đến</TableHead>
                      <TableHead>Ngày đi</TableHead>
                      <TableHead>Ngày về</TableHead>
                      <TableHead className="text-right">Giá ADL</TableHead>
                      <TableHead className="text-right">HH ADL</TableHead>
                      <TableHead className="text-center">Còn nhận</TableHead>
                      <TableHead className="text-center">Giữ chỗ</TableHead>
                      <TableHead>Hạn Visa</TableHead>
                      <TableHead className="text-right">Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tours.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-mono text-xs font-medium">{t.tour_code}</TableCell>
                        <TableCell>{t.destination ?? "—"}</TableCell>
                        <TableCell className="text-xs">
                          {t.departure_date ?? "—"}
                          {t.flight_dep_time && <span className="text-muted-foreground ml-1">• {t.flight_dep_time}</span>}
                        </TableCell>
                        <TableCell className="text-xs">
                          {t.return_date ?? "—"}
                          {t.flight_ret_time && <span className="text-muted-foreground ml-1">• {t.flight_ret_time}</span>}
                        </TableCell>
                        <TableCell className="text-right font-medium">{fmtVnd(t.price_adl)}</TableCell>
                        <TableCell className="text-right font-medium text-success">{fmtVnd(calcCommission(t.commission_adl))}</TableCell>
                        <TableCell className="text-center"><SeatBadge value={t.available_seats} /></TableCell>
                        <TableCell className="text-center">
                          {t.hold_seats ? (
                            <Badge variant="outline" className="bg-muted/40">{t.hold_seats}</Badge>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          {t.visa_deadline ? (
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">{t.visa_deadline}</Badge>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1.5 justify-end">
                            <Button size="sm" variant="outline" onClick={() => handleViewDetail(t)}>
                              <Eye className="h-3.5 w-3.5 mr-1" /> Chi tiết
                            </Button>
                            <Button size="sm" onClick={() => handleCreateBooking(t)}>
                              <CalendarPlus className="h-3.5 w-3.5 mr-1" /> Booking
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {tours.length === 0 && (
                      <TableRow><TableCell colSpan={10} className="text-center py-12 text-muted-foreground">Chưa có tour nào trong kho</TableCell></TableRow>
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
        </TabsContent>

        {canViewLogs && (
          <TabsContent value="logs">
            <B2BTourLogsTab />
          </TabsContent>
        )}
      </Tabs>

      <B2BTourDetailSheet tour={selectedTour} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
