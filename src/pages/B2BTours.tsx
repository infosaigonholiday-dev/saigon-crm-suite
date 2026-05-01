import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Eye, CalendarPlus, Loader2, Search } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { B2BTourDetailSheet, type B2BTour } from "@/components/b2b-tours/B2BTourDetailSheet";
import { B2BTourLogsTab } from "@/components/b2b-tours/B2BTourLogsTab";
import { useNavigate } from "react-router-dom";

const PAGE_SIZE = 20;
const EXPIRY_FILTER_KEY = "b2b_tours_expiry_filter";

const fmtVnd = (v: number | null | undefined) =>
  v && v > 0 ? `${Math.round(v).toLocaleString("vi-VN")}đ` : "—";

const calcCommission = (raw: number | null | undefined) =>
  Math.max(0, (raw ?? 0) - 200000);

// Parse dd/MM/yyyy → Date (local 00:00). Returns null if invalid/empty.
function parseVnDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const d = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10) - 1;
  const y = parseInt(m[3], 10);
  const dt = new Date(y, mo, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null;
  return dt;
}

function getTodayStart(): Date {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

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

type ExpiryFilter = "active" | "expired" | "all";

export default function B2BTours() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canViewLogs = hasPermission("b2b_tours", "logs");

  const [page, setPage] = useState(0);
  const [filterMarket, setFilterMarket] = useState<string>("all");
  const [filterDest, setFilterDest] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [expiryFilter, setExpiryFilter] = useState<ExpiryFilter>(() => {
    if (typeof window === "undefined") return "active";
    const v = window.localStorage.getItem(EXPIRY_FILTER_KEY);
    return v === "expired" || v === "all" || v === "active" ? v : "active";
  });
  const [selectedTour, setSelectedTour] = useState<B2BTour | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(EXPIRY_FILTER_KEY, expiryFilter);
    } catch {
      /* ignore */
    }
  }, [expiryFilter]);

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

  // Fetch tours WITHOUT pagination — date columns are text dd/MM/yyyy so we
  // must filter by expiry on the client. Table size is small (hundreds).
  const { data: allTours = [], isLoading } = useQuery<B2BTour[]>({
    queryKey: ["b2b-tours-all", filterMarket, filterDest, filterMonth, search],
    queryFn: async () => {
      let q = supabase
        .from("b2b_tours")
        .select(
          "id, tour_code, target_market, destination, thang, departure_date, return_date, price_adl, price_chd, price_inf, commission_adl, commission_chd, commission_inf, available_seats, hold_seats, notes, visa_deadline, flight_dep_code, flight_dep_time, flight_ret_code, flight_ret_time, itinerary_url, highlights",
        );
      if (filterMarket !== "all") q = q.eq("target_market", filterMarket);
      if (filterDest !== "all") q = q.eq("destination", filterDest);
      if (filterMonth !== "all") q = q.eq("thang", filterMonth);
      if (search.trim()) q = q.ilike("tour_code", `%${search.trim()}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as B2BTour[];
    },
  });

  const today = useMemo(() => getTodayStart(), []);

  // Compute expiry status + sort by departure ascending (nulls last).
  const enrichedTours = useMemo(() => {
    return allTours
      .map((t) => {
        const dep = parseVnDate(t.departure_date);
        const visa = parseVnDate(t.visa_deadline);
        const departed = dep ? dep.getTime() < today.getTime() : false;
        const visaExpired = visa ? visa.getTime() < today.getTime() : false;
        return { ...t, _dep: dep, _departed: departed, _visaExpired: visaExpired, _expired: departed || visaExpired };
      })
      .sort((a, b) => {
        if (!a._dep && !b._dep) return 0;
        if (!a._dep) return 1;
        if (!b._dep) return -1;
        return a._dep.getTime() - b._dep.getTime();
      });
  }, [allTours, today]);

  const filteredTours = useMemo(() => {
    if (expiryFilter === "all") return enrichedTours;
    if (expiryFilter === "expired") return enrichedTours.filter((t) => t._expired);
    return enrichedTours.filter((t) => !t._expired);
  }, [enrichedTours, expiryFilter]);

  const totalCount = filteredTours.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const pageTours = filteredTours.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Reset page when filters that change result-set change
  useEffect(() => {
    setPage(0);
  }, [filterMarket, filterDest, filterMonth, search, expiryFilter]);

  const handleViewDetail = (tour: B2BTour) => {
    setSelectedTour(tour);
    setSheetOpen(true);
  };

  const handleCreateBooking = (tour: B2BTour) => {
    navigate(`/dat-tour?prefill_tour=${encodeURIComponent(tour.tour_code)}`);
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-blue-600">LKH Tour 2026</h1>
          <p className="text-sm text-muted-foreground">{totalCount} tour {expiryFilter === "active" ? "còn hạn" : expiryFilter === "expired" ? "đã hết hạn" : "(tất cả)"}</p>
        </div>

        <Tabs defaultValue="catalog" className="space-y-4">
          <TabsList>
            <TabsTrigger value="catalog">Catalog</TabsTrigger>
            {canViewLogs && <TabsTrigger value="logs">Nhật ký</TabsTrigger>}
          </TabsList>

          <TabsContent value="catalog" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
                <Select value={expiryFilter} onValueChange={(v) => setExpiryFilter(v as ExpiryFilter)}>
                  <SelectTrigger><SelectValue placeholder="Trạng thái" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Còn hạn (mặc định)</SelectItem>
                    <SelectItem value="expired">Đã hết hạn</SelectItem>
                    <SelectItem value="all">Tất cả</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterMarket} onValueChange={(v) => { setFilterMarket(v); setFilterDest("all"); }}>
                  <SelectTrigger><SelectValue placeholder="Thị trường" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả thị trường</SelectItem>
                    {markets.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterDest} onValueChange={(v) => setFilterDest(v)}>
                  <SelectTrigger><SelectValue placeholder="Điểm đến" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả điểm đến</SelectItem>
                    {destinations.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterMonth} onValueChange={(v) => setFilterMonth(v)}>
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
                    onChange={(e) => setSearch(e.target.value)}
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
                        <TableHead className="min-w-[220px]">Điểm Nổi Bật</TableHead>
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
                      {pageTours.map((t) => (
                        <TableRow key={t.id} className={t._departed ? "opacity-70" : ""}>
                          <TableCell className="font-mono text-xs font-medium">{t.tour_code}</TableCell>
                          <TableCell>{t.destination ?? "—"}</TableCell>
                          <TableCell>
                            {(() => {
                              const items = (t.highlights ?? "")
                                .split("|")
                                .map((s) => s.trim())
                                .filter(Boolean);
                              if (items.length === 0) return <span className="text-muted-foreground">—</span>;
                              const shown = items.slice(0, 4);
                              const rest = items.length - shown.length;
                              return (
                                <div className="flex flex-wrap gap-1" title={items.join(" • ")}>
                                  {shown.map((h, i) => (
                                    <Badge key={i} variant="outline" className="text-xs font-normal">{h}</Badge>
                                  ))}
                                  {rest > 0 && (
                                    <Badge variant="outline" className="text-xs font-normal bg-muted/40">+{rest}</Badge>
                                  )}
                                </div>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="flex flex-col gap-1">
                              <div>
                                {t.departure_date ?? "—"}
                                {t.flight_dep_time && <span className="text-muted-foreground ml-1">• {t.flight_dep_time}</span>}
                              </div>
                              {t._departed && (
                                <Badge variant="secondary" className="bg-gray-200 text-gray-700 hover:bg-gray-200 w-fit text-[10px]">ĐÃ KHỞI HÀNH</Badge>
                              )}
                            </div>
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
                              t._visaExpired ? (
                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 font-semibold">
                                  VISA HẾT HẠN ({t.visa_deadline})
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">{t.visa_deadline}</Badge>
                              )
                            ) : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1.5 justify-end">
                              <Button size="sm" variant="outline" onClick={() => handleViewDetail(t)}>
                                <Eye className="h-3.5 w-3.5 mr-1" /> Chi tiết
                              </Button>
                              {t._departed ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span tabIndex={0}>
                                      <Button size="sm" disabled className="bg-blue-600 text-white opacity-60 cursor-not-allowed">
                                        <CalendarPlus className="h-3.5 w-3.5 mr-1" /> Booking
                                      </Button>
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>Tour đã hết hạn, không thể tạo booking</TooltipContent>
                                </Tooltip>
                              ) : (
                                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleCreateBooking(t)}>
                                  <CalendarPlus className="h-3.5 w-3.5 mr-1" /> Booking
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {pageTours.length === 0 && (
                        <TableRow><TableCell colSpan={11} className="text-center py-12 text-muted-foreground">
                          {expiryFilter === "active" ? "Không có tour còn hạn" : expiryFilter === "expired" ? "Không có tour đã hết hạn" : "Chưa có tour nào trong kho"}
                        </TableCell></TableRow>
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
    </TooltipProvider>
  );
}
