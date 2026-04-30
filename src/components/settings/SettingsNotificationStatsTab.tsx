import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, BellOff, AlertTriangle, Users, X, ExternalLink, Eye } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATION_GROUPS,
  DEPARTMENT_OPTIONS,
  getTypeLabel,
  getGroupOfType,
} from "@/lib/notificationGroups";
import { UserNotificationDetailDialog, type UserNotifPreset } from "./UserNotificationDetailDialog";

type Filters = {
  rangeDays: number | null;
  userId: string | null;
  department: string | null;
  group: string | null;     // group key in NOTIFICATION_GROUPS
  type: string | null;      // single type (when chosen)
  readStatus: string | null;
  actionStatus: string | null;
  search: string;
};

const DEFAULT_FILTERS: Filters = {
  rangeDays: 30,
  userId: null,
  department: null,
  group: null,
  type: null,
  readStatus: null,
  actionStatus: null,
  search: "",
};

export function SettingsNotificationStatsTab() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const detailRef = useRef<HTMLDivElement>(null);
  const [dialogUser, setDialogUser] = useState<{ id: string; name: string; email?: string; department?: string; role?: string } | null>(null);
  const [dialogPreset, setDialogPreset] = useState<UserNotifPreset>({});

  function openUserDialog(r: any, preset: UserNotifPreset = {}) {
    setDialogUser({ id: r.user_id, name: r.full_name || r.email || "—", email: r.email, department: r.department, role: r.role });
    setDialogPreset(preset);
  }

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(filters.search), 300);
    return () => clearTimeout(t);
  }, [filters.search]);

  // KPIs (Section 1)
  const { data: overview } = useQuery({
    queryKey: ["notif-overview"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_notification_overview");
      if (error) throw error;
      return data as any;
    },
    refetchInterval: 60000,
  });

  // Section 2 — by user
  const { data: byUserFull = [], isLoading: loadingFull, error: errByUserFull } = useQuery({
    queryKey: ["notif-stats-by-user-full"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_notification_stats_by_user");
      if (error) throw error;
      return (data as any[]) || [];
    },
    refetchInterval: 60000,
  });

  // Section 3 — audit list
  const { data: auditRows = [], isLoading: loadingAudit, error: errAudit } = useQuery({
    queryKey: ["notif-audit", filters.rangeDays, filters.userId, filters.department, filters.type, filters.group, filters.readStatus, filters.actionStatus, debouncedSearch],
    queryFn: async () => {
      const types = filters.group ? NOTIFICATION_GROUPS[filters.group]?.types ?? null : null;
      const { data, error } = await supabase.rpc("rpc_notification_audit_list", {
        p_range_days: filters.rangeDays,
        p_user_id: filters.userId,
        p_department: filters.department,
        p_type: filters.type,
        p_types: types,
        p_read_status: filters.readStatus,
        p_action_status: filters.actionStatus,
        p_search: debouncedSearch || null,
      });
      if (error) throw error;
      return (data as any[]) || [];
    },
    refetchInterval: 60000,
  });

  useEffect(() => { setPage(1); }, [filters, debouncedSearch]);

  const sent7d = Number(overview?.sent_7d ?? 0);
  const totalUnread = Number(overview?.unread ?? 0);
  const actionPending = Number(overview?.action_pending ?? 0);
  const actionOverdue = Number(overview?.action_overdue ?? 0);

  const userOptions = useMemo(() => byUserFull.map((r: any) => ({ id: r.user_id, name: r.full_name || r.email || "—" })), [byUserFull]);

  const allTypes = useMemo(() => {
    const set = new Set<string>(Object.keys(NOTIFICATION_TYPE_LABELS));
    auditRows.forEach((r: any) => r.type && set.add(r.type));
    return Array.from(set).sort();
  }, [auditRows]);

  function applyPreset(preset: string) {
    setActivePreset(preset);
    const next: Filters = { ...DEFAULT_FILTERS };
    if (preset === "sent7d") next.rangeDays = 7;
    else if (preset === "unread") next.readStatus = "unread";
    else if (preset === "pending") next.actionStatus = "pending_or_in_progress";
    else if (preset === "overdue") next.actionStatus = "overdue";
    setFilters(next);
    setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }

  function viewUser(userId: string) {
    setActivePreset(null);
    setFilters({ ...DEFAULT_FILTERS, userId, rangeDays: 90 });
    setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }

  function resetFilters() {
    setActivePreset(null);
    setFilters(DEFAULT_FILTERS);
  }

  const totalPages = Math.max(1, Math.ceil(auditRows.length / 50));
  const pagedRows = auditRows.slice((page - 1) * 50, page * 50);

  const kpiCard = (key: string, title: string, value: number | string, Icon: any, valueClass = "") => (
    <button
      type="button"
      onClick={() => applyPreset(key)}
      className={`text-left rounded-lg border bg-card transition-all hover:shadow-md hover:border-primary/50 ${activePreset === key ? "border-primary ring-2 ring-primary/30" : ""}`}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">{title}</span>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className={`text-2xl font-bold ${valueClass}`}>{value}</p>
        <p className="text-[10px] text-muted-foreground mt-1">Click để lọc bên dưới</p>
      </div>
    </button>
  );

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-4">
        {/* SECTION 1 — KPI tổng */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpiCard("sent7d", "Đã gửi (7 ngày)", sent7d, BellOff)}
          {kpiCard("unread", "Chưa đọc", totalUnread, BellOff, "text-amber-700")}
          {kpiCard("pending", "Cần xử lý", actionPending, Users, "text-amber-700")}
          {kpiCard("overdue", "Quá hạn xử lý", actionOverdue, AlertTriangle, "text-destructive")}
        </div>

        {/* SECTION 2 — By user */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Tình trạng đọc theo nhân sự</CardTitle>
              <Badge variant="secondary" className="text-xs">90 ngày</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {errByUserFull && (
              <Alert variant="destructive" className="mb-3">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Không tải được thống kê theo nhân sự</AlertTitle>
                <AlertDescription className="text-xs">{(errByUserFull as any)?.message}</AlertDescription>
              </Alert>
            )}
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[160px]">Nhân sự</TableHead>
                    <TableHead className="w-[200px]">Email</TableHead>
                    <TableHead className="w-[110px]">Phòng ban</TableHead>
                    <TableHead className="w-[120px]">Vai trò</TableHead>
                    <TableHead className="w-[80px] text-right">Tổng</TableHead>
                    <TableHead className="w-[80px] text-right">Đã đọc</TableHead>
                    <TableHead className="w-[80px] text-right">Chưa đọc</TableHead>
                    <TableHead className="w-[110px] text-right">Khẩn chưa đọc</TableHead>
                    <TableHead className="w-[130px] text-right">Action chưa xử lý</TableHead>
                    <TableHead className="w-[90px] text-right">Quá hạn</TableHead>
                    <TableHead className="w-[150px]">Lần đọc gần nhất</TableHead>
                    <TableHead className="w-[110px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingFull && (
                    <TableRow><TableCell colSpan={12} className="text-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                    </TableCell></TableRow>
                  )}
                  {!loadingFull && byUserFull.length === 0 && (
                    <TableRow><TableCell colSpan={12} className="text-center py-6 text-sm text-muted-foreground">
                      Chưa có dữ liệu thông báo trong 90 ngày
                    </TableCell></TableRow>
                  )}
                  {byUserFull.map((r: any) => (
                    <TableRow key={r.user_id}>
                      <TableCell className="text-sm font-medium">
                        <button
                          type="button"
                          className="text-left hover:text-primary hover:underline"
                          onClick={() => openUserDialog(r)}
                        >
                          {r.full_name || "—"}
                        </button>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]">{r.email || "—"}</TableCell>
                      <TableCell className="text-xs">{r.department || "—"}</TableCell>
                      <TableCell className="text-xs">{r.role || "—"}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{r.total_notifications}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-blue-700">{r.read_count}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {Number(r.unread_count) > 0
                          ? <button type="button" className="text-amber-700 font-semibold hover:underline" onClick={() => openUserDialog(r, { readStatus: "unread", defaultTab: "by_type" })}>{r.unread_count}</button>
                          : <span className="text-muted-foreground">0</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(r.unread_high_critical) > 0
                          ? <button type="button" onClick={() => openUserDialog(r, { readStatus: "unread_high", defaultTab: "by_type" })}>
                              <Badge variant="destructive" className="text-[10px] cursor-pointer hover:opacity-80">{r.unread_high_critical}</Badge>
                            </button>
                          : <span className="text-xs text-muted-foreground">0</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(r.pending_actions) > 0
                          ? <button type="button" onClick={() => openUserDialog(r, { actionStatus: "pending_or_in_progress", defaultTab: "list" })}>
                              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-300 cursor-pointer hover:bg-amber-100">{r.pending_actions}</Badge>
                            </button>
                          : <span className="text-xs text-muted-foreground">0</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(r.overdue_actions) > 0
                          ? <button type="button" onClick={() => openUserDialog(r, { actionStatus: "overdue", defaultTab: "list" })}>
                              <Badge variant="destructive" className="text-[10px] cursor-pointer hover:opacity-80">{r.overdue_actions}</Badge>
                            </button>
                          : <span className="text-xs text-muted-foreground">0</span>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.last_read_at
                          ? formatDistanceToNow(new Date(r.last_read_at), { addSuffix: true, locale: vi })
                          : <button type="button" className="text-destructive hover:underline" onClick={() => openUserDialog(r, { readStatus: "unread", defaultTab: "list" })}>Chưa từng đọc</button>}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openUserDialog(r)}>
                          <Eye className="h-3 w-3 mr-1" /> Xem chi tiết
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              <strong>Nguyên tắc:</strong> "Đã gửi" ≠ "Đã đọc" ≠ "Đã xử lý". Click thông báo chỉ đánh dấu đã đọc.
            </p>
          </CardContent>
        </Card>

        {/* SECTION 3 — Audit detail */}
        <Card ref={detailRef as any}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Chi tiết từng thông báo</CardTitle>
                <Badge variant="secondary" className="text-xs">{auditRows.length} dòng (max 500)</Badge>
              </div>
              <Button size="sm" variant="ghost" onClick={resetFilters} className="text-xs">
                <X className="h-3 w-3 mr-1" /> Xoá lọc
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Filter bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Select value={String(filters.rangeDays ?? "all")} onValueChange={(v) => setFilters(f => ({ ...f, rangeDays: v === "all" ? null : Number(v) }))}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Khoảng thời gian" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 ngày</SelectItem>
                  <SelectItem value="30">30 ngày</SelectItem>
                  <SelectItem value="90">90 ngày</SelectItem>
                  <SelectItem value="all">Tất cả</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.userId ?? "all"} onValueChange={(v) => setFilters(f => ({ ...f, userId: v === "all" ? null : v }))}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Nhân sự" /></SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="all">Tất cả nhân sự</SelectItem>
                  {userOptions.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={filters.department ?? "all"} onValueChange={(v) => setFilters(f => ({ ...f, department: v === "all" ? null : v }))}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Phòng ban" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả phòng ban</SelectItem>
                  {DEPARTMENT_OPTIONS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={filters.group ?? "all"} onValueChange={(v) => setFilters(f => ({ ...f, group: v === "all" ? null : v, type: null }))}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Nhóm thông báo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả nhóm</SelectItem>
                  {Object.entries(NOTIFICATION_GROUPS).map(([k, g]) => <SelectItem key={k} value={k}>{g.label}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={filters.type ?? "all"} onValueChange={(v) => setFilters(f => ({ ...f, type: v === "all" ? null : v }))}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Loại thông báo" /></SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="all">Tất cả loại</SelectItem>
                  {allTypes.map((t) => <SelectItem key={t} value={t}>{getTypeLabel(t)}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={filters.readStatus ?? "all"} onValueChange={(v) => setFilters(f => ({ ...f, readStatus: v === "all" ? null : v }))}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Trạng thái đọc" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái đọc</SelectItem>
                  <SelectItem value="read">Đã đọc</SelectItem>
                  <SelectItem value="unread">Chưa đọc</SelectItem>
                  <SelectItem value="unread_high">Khẩn chưa đọc</SelectItem>
                  <SelectItem value="unread_24h">Chưa đọc &gt; 24h</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.actionStatus ?? "all"} onValueChange={(v) => setFilters(f => ({ ...f, actionStatus: v === "all" ? null : v }))}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Trạng thái xử lý" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái xử lý</SelectItem>
                  <SelectItem value="none">Không cần xử lý</SelectItem>
                  <SelectItem value="pending">Chờ xử lý</SelectItem>
                  <SelectItem value="in_progress">Đang xử lý</SelectItem>
                  <SelectItem value="overdue">Quá hạn</SelectItem>
                  <SelectItem value="completed">Đã xử lý</SelectItem>
                  <SelectItem value="read_unhandled">Đã đọc nhưng chưa xử lý</SelectItem>
                </SelectContent>
              </Select>

              <Input
                value={filters.search}
                onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                placeholder="Tìm tên, email, tiêu đề, nội dung..."
                className="h-9 text-xs"
              />
            </div>

            {errAudit && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Không tải được chi tiết thông báo</AlertTitle>
                <AlertDescription className="text-xs">{(errAudit as any)?.message}</AlertDescription>
              </Alert>
            )}

            {/* Table */}
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[140px]">Người nhận</TableHead>
                    <TableHead className="w-[180px]">Email</TableHead>
                    <TableHead className="w-[100px]">Phòng ban</TableHead>
                    <TableHead className="w-[110px]">Vai trò</TableHead>
                    <TableHead className="w-[140px]">Loại</TableHead>
                    <TableHead className="w-[120px]">Nhóm</TableHead>
                    <TableHead className="min-w-[200px]">Tiêu đề</TableHead>
                    <TableHead className="min-w-[200px]">Nội dung</TableHead>
                    <TableHead className="w-[80px]">Mức</TableHead>
                    <TableHead className="w-[140px]">Gửi lúc</TableHead>
                    <TableHead className="w-[100px]">Đọc?</TableHead>
                    <TableHead className="w-[140px]">Đọc lúc</TableHead>
                    <TableHead className="w-[120px]">Chưa đọc</TableHead>
                    <TableHead className="w-[80px]">Cần xử lý</TableHead>
                    <TableHead className="w-[120px]">Trạng thái xử lý</TableHead>
                    <TableHead className="w-[140px]">Xử lý lúc</TableHead>
                    <TableHead className="w-[160px]">Entity</TableHead>
                    <TableHead className="w-[60px]">Mở</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingAudit && (
                    <TableRow><TableCell colSpan={18} className="text-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                    </TableCell></TableRow>
                  )}
                  {!loadingAudit && pagedRows.length === 0 && (
                    <TableRow><TableCell colSpan={18} className="text-center py-8 text-sm text-muted-foreground">
                      Không có thông báo nào khớp bộ lọc.
                    </TableCell></TableRow>
                  )}
                  {pagedRows.map((r: any) => {
                    const msg = String(r.message || "");
                    const truncated = msg.length > 80 ? msg.slice(0, 80) + "..." : msg;
                    const unreadFor = !r.is_read ? formatDistanceToNow(new Date(r.created_at), { locale: vi }) : "—";
                    const entity = r.related_entity_type || r.entity_type
                      ? `${r.related_entity_type || r.entity_type}${(r.related_entity_id || r.entity_id) ? ":" + String(r.related_entity_id || r.entity_id).slice(0, 8) : ""}`
                      : "—";
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm font-medium">{r.full_name || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground truncate max-w-[180px]">{r.email || "—"}</TableCell>
                        <TableCell className="text-xs">{r.department || "—"}</TableCell>
                        <TableCell className="text-xs">{r.role || "—"}</TableCell>
                        <TableCell className="text-xs">{getTypeLabel(r.type)}</TableCell>
                        <TableCell className="text-xs">{getGroupOfType(r.type)}</TableCell>
                        <TableCell className="text-sm">{r.title}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <Tooltip><TooltipTrigger className="text-left">{truncated || "—"}</TooltipTrigger>
                            <TooltipContent className="max-w-[400px]">{msg || "—"}</TooltipContent></Tooltip>
                        </TableCell>
                        <TableCell>
                          <Badge variant={r.priority === "critical" ? "destructive" : r.priority === "high" ? "default" : "secondary"} className="text-[10px]">
                            {r.priority === "critical" ? "Khẩn" : r.priority === "high" ? "Cao" : r.priority === "low" ? "Thấp" : "TB"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{format(new Date(r.created_at), "dd/MM HH:mm")}</TableCell>
                        <TableCell>
                          {r.is_read
                            ? <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-300">Đã đọc</Badge>
                            : <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-300">Chưa đọc</Badge>}
                        </TableCell>
                        <TableCell className="text-xs">{r.read_at ? format(new Date(r.read_at), "dd/MM HH:mm") : "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{unreadFor}</TableCell>
                        <TableCell className="text-xs">{r.action_required ? "Có" : "—"}</TableCell>
                        <TableCell>
                          {r.action_status
                            ? <Badge variant={r.action_status === "overdue" ? "destructive" : r.action_status === "completed" ? "default" : "secondary"} className="text-[10px]">
                                {r.action_status === "pending" ? "Chờ" : r.action_status === "in_progress" ? "Đang" : r.action_status === "overdue" ? "Quá hạn" : r.action_status === "completed" ? "Xong" : r.action_status}
                              </Badge>
                            : "—"}
                        </TableCell>
                        <TableCell className="text-xs">{r.action_completed_at ? format(new Date(r.action_completed_at), "dd/MM HH:mm") : "—"}</TableCell>
                        <TableCell className="text-[10px] font-mono text-muted-foreground">{entity}</TableCell>
                        <TableCell>
                          {r.action_url
                            ? <a href={r.action_url} target="_blank" rel="noreferrer" className="text-blue-600 inline-flex"><ExternalLink className="h-3.5 w-3.5" /></a>
                            : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {auditRows.length > 50 && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Trang {page} / {totalPages} — {auditRows.length} dòng</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Trước</Button>
                  <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Sau</Button>
                </div>
              </div>
            )}

            <p className="text-[11px] text-muted-foreground">
              <strong>Quy ước:</strong> Click thông báo chỉ set <code>is_read=true</code>. <code>action_status=completed</code> chỉ xảy ra khi nghiệp vụ thực sự hoàn tất. Tối đa 500 dòng/lần — thu hẹp bộ lọc nếu cần.
            </p>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
