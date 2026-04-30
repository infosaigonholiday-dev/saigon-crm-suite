import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Loader2, AlertTriangle, Briefcase } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { TOUR_STAGE_LABEL, BOOKING_TYPE_LABEL, type TourStage } from "@/lib/tourFileWorkflow";
import TourFileFormDialog from "@/components/tour-files/TourFileFormDialog";

const PAGE_SIZE = 20;

const RISK_BADGE: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-secondary text-secondary-foreground",
  high: "bg-amber-100 text-amber-800 border-amber-300",
  critical: "bg-destructive text-destructive-foreground",
};

export default function TourFiles() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission("bookings", "create");
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [taskFilter, setTaskFilter] = useState<"all" | "overdue" | "pending_check" | "upcoming" | "missing_doc">("all");
  const [openForm, setOpenForm] = useState(false);

  // Đọc URL params (từ Dashboard widgets)
  useEffect(() => {
    if (searchParams.get("overdue") === "true") setTaskFilter("overdue");
    else if (searchParams.get("pending_check") === "true") setTaskFilter("pending_check");
    else if (searchParams.get("upcoming") === "true") setTaskFilter("upcoming");
    else if (searchParams.get("missing_doc")) setTaskFilter("missing_doc");
    const s = searchParams.get("stage");
    if (s) setStageFilter(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pre-fetch tour_file_ids khi taskFilter cần lọc theo tasks
  const { data: filteredIds } = useQuery({
    queryKey: ["tour_files_taskfilter_ids", taskFilter],
    enabled: taskFilter !== "all" && taskFilter !== "missing_doc",
    queryFn: async () => {
      let statuses: string[] = [];
      if (taskFilter === "overdue") statuses = ["overdue"];
      if (taskFilter === "pending_check") statuses = ["done_pending_check"];
      if (taskFilter === "upcoming") {
        // tour khởi hành ≤ 7 ngày + còn task chưa duyệt
        const today = new Date(); const in7 = new Date(); in7.setDate(today.getDate() + 7);
        const { data: tours } = await (supabase as any)
          .from("tour_files")
          .select("id, departure_date")
          .gte("departure_date", today.toISOString().slice(0, 10))
          .lte("departure_date", in7.toISOString().slice(0, 10));
        const ids = (tours || []).map((x: any) => x.id);
        if (!ids.length) return [];
        const { data: tasks } = await (supabase as any)
          .from("tour_tasks")
          .select("tour_file_id")
          .in("tour_file_id", ids)
          .not("status", "in", "(approved_done,cancelled)");
        return Array.from(new Set((tasks || []).map((t: any) => t.tour_file_id)));
      }
      const { data: tasks } = await (supabase as any)
        .from("tour_tasks")
        .select("tour_file_id")
        .in("status", statuses);
      return Array.from(new Set((tasks || []).map((t: any) => t.tour_file_id)));
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["tour_files", page, search, stageFilter, typeFilter, taskFilter, filteredIds],
    enabled: taskFilter === "all" || taskFilter === "missing_doc" || !!filteredIds,
    queryFn: async () => {
      let q = (supabase as any)
        .from("tour_files")
        .select(`
          id, tour_file_code, tour_name, route, departure_date, return_date,
          group_size_estimated, group_size_confirmed, current_stage, risk_level,
          status, booking_type, next_action_due_at,
          sale_owner:sale_owner_id ( full_name ),
          operation_owner:operation_owner_id ( full_name )
        `, { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (search.trim()) {
        q = q.or(`tour_file_code.ilike.%${search}%,tour_name.ilike.%${search}%,route.ilike.%${search}%`);
      }
      if (stageFilter !== "all") q = q.eq("current_stage", stageFilter);
      if (typeFilter !== "all") q = q.eq("booking_type", typeFilter);
      if (taskFilter !== "all" && taskFilter !== "missing_doc") {
        const ids = filteredIds || [];
        if (!ids.length) return { rows: [], total: 0 };
        q = q.in("id", ids);
      }

      const { data, count, error } = await q;
      if (error) throw error;
      return { rows: data || [], total: count || 0 };
    },
  });

  // count overdue tasks by tour_file
  const tourIds = data?.rows.map((r: any) => r.id) || [];
  const { data: overdueMap } = useQuery({
    queryKey: ["tour_files_overdue", tourIds],
    enabled: tourIds.length > 0,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("tour_tasks")
        .select("tour_file_id, status")
        .in("tour_file_id", tourIds);
      const map: Record<string, { overdue: number; pending: number }> = {};
      (data || []).forEach((t: any) => {
        if (!map[t.tour_file_id]) map[t.tour_file_id] = { overdue: 0, pending: 0 };
        if (t.status === "overdue") map[t.tour_file_id].overdue += 1;
        if (t.status === "done_pending_check") map[t.tour_file_id].pending += 1;
      });
      return map;
    },
  });

  const totalPages = Math.ceil((data?.total || 0) / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" />
            Hồ sơ đoàn / MICE
          </h1>
          <p className="text-sm text-muted-foreground">
            Quản lý vận hành tour đoàn, MICE, đoàn trường, đoàn doanh nghiệp.
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setOpenForm(true)}>
            <Plus className="h-4 w-4 mr-2" /> Tạo hồ sơ mới
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-4 flex gap-3 flex-wrap">
          <Input
            placeholder="Tìm theo mã, tên tour, tuyến..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="max-w-sm"
          />
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(0); }}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Loại" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả loại</SelectItem>
              <SelectItem value="group_tour">Tour đoàn</SelectItem>
              <SelectItem value="mice">MICE</SelectItem>
              <SelectItem value="school_group">Đoàn trường</SelectItem>
              <SelectItem value="company_trip">Đoàn doanh nghiệp</SelectItem>
            </SelectContent>
          </Select>
          <Select value={stageFilter} onValueChange={(v) => { setStageFilter(v); setPage(0); }}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Giai đoạn" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả giai đoạn</SelectItem>
              {Object.entries(TOUR_STAGE_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã</TableHead>
                  <TableHead>Tên tour / Tuyến</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Khởi hành</TableHead>
                  <TableHead>Khách</TableHead>
                  <TableHead>Sale</TableHead>
                  <TableHead>Điều hành</TableHead>
                  <TableHead>Giai đoạn</TableHead>
                  <TableHead>Cảnh báo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.rows || []).map((r: any) => {
                  const ov = overdueMap?.[r.id];
                  return (
                    <TableRow
                      key={r.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/ho-so-doan/${r.id}`)}
                    >
                      <TableCell className="font-mono text-xs">{r.tour_file_code}</TableCell>
                      <TableCell>
                        <div className="font-medium">{r.tour_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{r.route || ""}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{BOOKING_TYPE_LABEL[r.booking_type] || r.booking_type}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.departure_date ? new Date(r.departure_date).toLocaleDateString("vi-VN") : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.group_size_confirmed || r.group_size_estimated || "—"}
                      </TableCell>
                      <TableCell className="text-sm">{r.sale_owner?.full_name || "—"}</TableCell>
                      <TableCell className="text-sm">{r.operation_owner?.full_name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {TOUR_STAGE_LABEL[r.current_stage as TourStage] || r.current_stage}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {r.risk_level !== "normal" && (
                            <Badge className={RISK_BADGE[r.risk_level] || ""}>{r.risk_level}</Badge>
                          )}
                          {ov?.overdue ? (
                            <Badge className="bg-destructive text-destructive-foreground">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {ov.overdue} quá hạn
                            </Badge>
                          ) : null}
                          {ov?.pending ? (
                            <Badge className="bg-violet-100 text-violet-800 border-violet-300">
                              {ov.pending} chờ kiểm
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {data?.rows.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Chưa có hồ sơ tour đoàn nào.
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-between items-center text-sm">
          <span>Trang {page + 1} / {totalPages} — Tổng {data?.total || 0}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              Trước
            </Button>
            <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)}>
              Sau
            </Button>
          </div>
        </div>
      )}

      <TourFileFormDialog open={openForm} onOpenChange={setOpenForm} onCreated={(id) => navigate(`/ho-so-doan/${id}`)} />
    </div>
  );
}
