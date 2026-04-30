import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertTriangle, ExternalLink, X } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import {
  NOTIFICATION_GROUPS,
  NOTIFICATION_TYPE_LABELS,
  getTypeLabel,
  getGroupOfType,
} from "@/lib/notificationGroups";

export type UserNotifPreset = {
  rangeDays?: number | null;
  readStatus?: string | null;
  actionStatus?: string | null;
  type?: string | null;
  group?: string | null;
  defaultTab?: "by_type" | "list";
};

type Filters = {
  rangeDays: number | null;
  readStatus: string | null;
  actionStatus: string | null;
  group: string | null;
  type: string | null;
};

const BASE: Filters = {
  rangeDays: 90,
  readStatus: null,
  actionStatus: null,
  group: null,
  type: null,
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user: { id: string; name: string; email?: string; department?: string; role?: string } | null;
  preset?: UserNotifPreset;
}

export function UserNotificationDetailDialog({ open, onOpenChange, user, preset }: Props) {
  const [tab, setTab] = useState<"by_type" | "list">("by_type");
  const [filters, setFilters] = useState<Filters>(BASE);

  // Apply preset whenever dialog opens
  useEffect(() => {
    if (!open) return;
    setFilters({
      rangeDays: preset?.rangeDays ?? 90,
      readStatus: preset?.readStatus ?? null,
      actionStatus: preset?.actionStatus ?? null,
      group: preset?.group ?? null,
      type: preset?.type ?? null,
    });
    setTab(preset?.defaultTab ?? "by_type");
  }, [open, preset]);

  // Tab 1 — by type
  const { data: byType = [], isLoading: loadingType, error: errType } = useQuery({
    queryKey: ["notif-by-user-type", user?.id, filters.rangeDays, filters.readStatus, filters.actionStatus],
    enabled: open && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_notification_stats_by_user_type" as any, {
        p_user_id: user!.id,
        p_days: filters.rangeDays,
        p_read_status: filters.readStatus,
        p_action_status: filters.actionStatus,
      });
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  // Tab 2 — list (reuse rpc_notification_audit_list)
  const { data: rows = [], isLoading: loadingList, error: errList } = useQuery({
    queryKey: ["notif-user-audit", user?.id, filters],
    enabled: open && !!user?.id && tab === "list",
    queryFn: async () => {
      const types = filters.group ? NOTIFICATION_GROUPS[filters.group]?.types ?? null : null;
      const { data, error } = await supabase.rpc("rpc_notification_audit_list", {
        p_range_days: filters.rangeDays,
        p_user_id: user!.id,
        p_department: null,
        p_type: filters.type,
        p_types: types,
        p_read_status: filters.readStatus,
        p_action_status: filters.actionStatus,
        p_search: null,
      });
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const filteredByType = useMemo(() => {
    if (!filters.type && !filters.group) return byType;
    const groupTypes = filters.group ? NOTIFICATION_GROUPS[filters.group]?.types ?? [] : null;
    return byType.filter((r: any) => {
      if (filters.type && r.notification_type !== filters.type) return false;
      if (groupTypes && !groupTypes.includes(r.notification_type)) return false;
      return true;
    });
  }, [byType, filters.type, filters.group]);

  const allTypes = useMemo(() => {
    const set = new Set<string>(Object.keys(NOTIFICATION_TYPE_LABELS));
    byType.forEach((r: any) => r.notification_type && set.add(r.notification_type));
    return Array.from(set).sort();
  }, [byType]);

  function drillToList(type: string) {
    setFilters(f => ({ ...f, type }));
    setTab("list");
  }

  function resetFilters() {
    setFilters({ ...BASE });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            Chi tiết thông báo của: <span className="text-primary">{user?.name || "—"}</span>
          </DialogTitle>
          <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 mt-1">
            {user?.email && <span>📧 {user.email}</span>}
            {user?.department && <span>🏢 {user.department}</span>}
            {user?.role && <span>🛡 {user.role}</span>}
          </div>
        </DialogHeader>

        {/* Filter bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <Select value={String(filters.rangeDays ?? "all")} onValueChange={(v) => setFilters(f => ({ ...f, rangeDays: v === "all" ? null : Number(v) }))}>
            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Khoảng" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 ngày</SelectItem>
              <SelectItem value="30">30 ngày</SelectItem>
              <SelectItem value="90">90 ngày</SelectItem>
              <SelectItem value="all">Tất cả</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.group ?? "all"} onValueChange={(v) => setFilters(f => ({ ...f, group: v === "all" ? null : v, type: null }))}>
            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Nhóm" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả nhóm</SelectItem>
              {Object.entries(NOTIFICATION_GROUPS).map(([k, g]) => <SelectItem key={k} value={k}>{g.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.type ?? "all"} onValueChange={(v) => setFilters(f => ({ ...f, type: v === "all" ? null : v }))}>
            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Loại" /></SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value="all">Tất cả loại</SelectItem>
              {allTypes.map((t) => <SelectItem key={t} value={t}>{getTypeLabel(t)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.readStatus ?? "all"} onValueChange={(v) => setFilters(f => ({ ...f, readStatus: v === "all" ? null : v }))}>
            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Trạng thái đọc" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="read">Đã đọc</SelectItem>
              <SelectItem value="unread">Chưa đọc</SelectItem>
              <SelectItem value="unread_high">Khẩn chưa đọc</SelectItem>
              <SelectItem value="unread_24h">Chưa đọc &gt; 24h</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.actionStatus ?? "all"} onValueChange={(v) => setFilters(f => ({ ...f, actionStatus: v === "all" ? null : v }))}>
            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Trạng thái xử lý" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="pending_or_in_progress">Cần xử lý</SelectItem>
              <SelectItem value="overdue">Quá hạn</SelectItem>
              <SelectItem value="completed">Đã xử lý</SelectItem>
              <SelectItem value="read_unhandled">Đã đọc nhưng chưa xử lý</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex justify-end">
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={resetFilters}>
            <X className="h-3 w-3 mr-1" /> Xoá lọc
          </Button>
        </div>

        <Tabs value={tab} onValueChange={(v: any) => setTab(v)}>
          <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="by_type">Theo loại thông báo</TabsTrigger>
            <TabsTrigger value="list">Danh sách chi tiết</TabsTrigger>
          </TabsList>

          {/* TAB 1 */}
          <TabsContent value="by_type" className="mt-3">
            {errType && (
              <Alert variant="destructive" className="mb-3">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Không tải được breakdown</AlertTitle>
                <AlertDescription className="text-xs">{(errType as any)?.message}</AlertDescription>
              </Alert>
            )}
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Loại thông báo</TableHead>
                    <TableHead className="w-[140px]">Nhóm</TableHead>
                    <TableHead className="w-[70px] text-right">Tổng</TableHead>
                    <TableHead className="w-[80px] text-right">Đã đọc</TableHead>
                    <TableHead className="w-[90px] text-right">Chưa đọc</TableHead>
                    <TableHead className="w-[110px] text-right">Khẩn chưa đọc</TableHead>
                    <TableHead className="w-[100px] text-right">Action chờ</TableHead>
                    <TableHead className="w-[80px] text-right">Quá hạn</TableHead>
                    <TableHead className="w-[150px]">Cũ nhất chưa đọc</TableHead>
                    <TableHead className="w-[150px]">Lần đọc gần nhất</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingType && (
                    <TableRow><TableCell colSpan={11} className="text-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                    </TableCell></TableRow>
                  )}
                  {!loadingType && filteredByType.length === 0 && (
                    <TableRow><TableCell colSpan={11} className="text-center py-6 text-sm text-muted-foreground">
                      Không có thông báo khớp bộ lọc.
                    </TableCell></TableRow>
                  )}
                  {filteredByType.map((r: any) => (
                    <TableRow key={r.notification_type} className="hover:bg-muted/50 cursor-pointer" onClick={() => drillToList(r.notification_type)}>
                      <TableCell className="text-sm font-medium">{getTypeLabel(r.notification_type)}</TableCell>
                      <TableCell className="text-xs">{getGroupOfType(r.notification_type)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{r.total_notifications}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-blue-700">{r.read_count}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {Number(r.unread_count) > 0
                          ? <span className="text-amber-700 font-semibold">{r.unread_count}</span>
                          : <span className="text-muted-foreground">0</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(r.unread_high_critical) > 0
                          ? <Badge variant="destructive" className="text-[10px]">{r.unread_high_critical}</Badge>
                          : <span className="text-xs text-muted-foreground">0</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(r.pending_actions) > 0
                          ? <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-300">{r.pending_actions}</Badge>
                          : <span className="text-xs text-muted-foreground">0</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(r.overdue_actions) > 0
                          ? <Badge variant="destructive" className="text-[10px]">{r.overdue_actions}</Badge>
                          : <span className="text-xs text-muted-foreground">0</span>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.oldest_unread_at ? formatDistanceToNow(new Date(r.oldest_unread_at), { addSuffix: true, locale: vi }) : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.last_read_at ? formatDistanceToNow(new Date(r.last_read_at), { addSuffix: true, locale: vi }) : "—"}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); drillToList(r.notification_type); }}>
                          Xem
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Click một dòng để xem từng thông báo cụ thể của loại đó.
            </p>
          </TabsContent>

          {/* TAB 2 */}
          <TabsContent value="list" className="mt-3">
            {errList && (
              <Alert variant="destructive" className="mb-3">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Không tải được danh sách</AlertTitle>
                <AlertDescription className="text-xs">{(errList as any)?.message}</AlertDescription>
              </Alert>
            )}
            <div className="text-xs text-muted-foreground mb-2">
              {rows.length} thông báo (tối đa 500)
            </div>
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">Loại</TableHead>
                    <TableHead className="w-[120px]">Nhóm</TableHead>
                    <TableHead className="min-w-[200px]">Tiêu đề</TableHead>
                    <TableHead className="min-w-[200px]">Nội dung</TableHead>
                    <TableHead className="w-[80px]">Mức</TableHead>
                    <TableHead className="w-[130px]">Gửi lúc</TableHead>
                    <TableHead className="w-[100px]">Đọc?</TableHead>
                    <TableHead className="w-[130px]">Đọc lúc</TableHead>
                    <TableHead className="w-[110px]">Chưa đọc</TableHead>
                    <TableHead className="w-[120px]">Trạng thái xử lý</TableHead>
                    <TableHead className="w-[140px]">Entity</TableHead>
                    <TableHead className="w-[60px]">Mở</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingList && (
                    <TableRow><TableCell colSpan={12} className="text-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                    </TableCell></TableRow>
                  )}
                  {!loadingList && rows.length === 0 && (
                    <TableRow><TableCell colSpan={12} className="text-center py-6 text-sm text-muted-foreground">
                      Không có thông báo khớp bộ lọc.
                    </TableCell></TableRow>
                  )}
                  {rows.map((r: any) => {
                    const msg = String(r.message || "");
                    const truncated = msg.length > 80 ? msg.slice(0, 80) + "..." : msg;
                    const unreadFor = !r.is_read ? formatDistanceToNow(new Date(r.created_at), { locale: vi }) : "—";
                    const entity = r.related_entity_type || r.entity_type
                      ? `${r.related_entity_type || r.entity_type}${(r.related_entity_id || r.entity_id) ? ":" + String(r.related_entity_id || r.entity_id).slice(0, 8) : ""}`
                      : "—";
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs">{getTypeLabel(r.type)}</TableCell>
                        <TableCell className="text-xs">{getGroupOfType(r.type)}</TableCell>
                        <TableCell className="text-sm">{r.title}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{truncated || "—"}</TableCell>
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
                        <TableCell>
                          {r.action_status
                            ? <Badge variant={r.action_status === "overdue" ? "destructive" : r.action_status === "completed" ? "default" : "secondary"} className="text-[10px]">
                                {r.action_status === "pending" ? "Chờ" : r.action_status === "in_progress" ? "Đang" : r.action_status === "overdue" ? "Quá hạn" : r.action_status === "completed" ? "Xong" : r.action_status}
                              </Badge>
                            : "—"}
                        </TableCell>
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
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
