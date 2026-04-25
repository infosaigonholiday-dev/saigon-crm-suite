import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, Download, CalendarPlus, Loader2 } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";

const PAGE_SIZE = 20;

interface LogRow {
  id: string;
  tour_code: string;
  user_id: string;
  user_name: string | null;
  action: "view_detail" | "download_itinerary" | "create_booking";
  created_at: string;
}

const actionConfig: Record<string, { label: string; className: string; icon: any }> = {
  view_detail: { label: "Xem chi tiết", className: "bg-blue-50 text-blue-700 border-blue-200", icon: Eye },
  download_itinerary: { label: "Tải lịch trình", className: "bg-green-50 text-green-700 border-green-200", icon: Download },
  create_booking: { label: "Tạo booking", className: "bg-purple-50 text-purple-700 border-purple-200", icon: CalendarPlus },
};

export function B2BTourLogsTab() {
  const [page, setPage] = useState(0);
  const [filterUser, setFilterUser] = useState<string>("all");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  // Summary cards: this month
  const { data: monthSummary } = useQuery({
    queryKey: ["b2b-logs-summary"],
    queryFn: async () => {
      const start = startOfMonth(new Date()).toISOString();
      const end = endOfMonth(new Date()).toISOString();
      const { data, error } = await supabase
        .from("b2b_tour_logs")
        .select("action")
        .gte("created_at", start)
        .lte("created_at", end);
      if (error) throw error;
      const counts = { view_detail: 0, download_itinerary: 0, create_booking: 0 };
      (data || []).forEach((r: any) => {
        if (r.action in counts) counts[r.action as keyof typeof counts]++;
      });
      return counts;
    },
  });

  const { data: logs = [], isLoading } = useQuery<LogRow[]>({
    queryKey: ["b2b-logs", page, filterUser, fromDate, toDate],
    queryFn: async () => {
      let q = supabase
        .from("b2b_tour_logs")
        .select("id, tour_code, user_id, user_name, action, created_at")
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (filterUser !== "all") q = q.eq("user_name", filterUser);
      if (fromDate) q = q.gte("created_at", fromDate);
      if (toDate) q = q.lte("created_at", `${toDate}T23:59:59`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as LogRow[];
    },
  });

  const { data: userOptions = [] } = useQuery({
    queryKey: ["b2b-logs-users"],
    queryFn: async () => {
      const { data } = await supabase
        .from("b2b_tour_logs")
        .select("user_name")
        .not("user_name", "is", null)
        .limit(500);
      const set = new Set<string>();
      (data ?? []).forEach((r: any) => r.user_name && set.add(r.user_name));
      return Array.from(set).sort();
    },
  });

  const summary = monthSummary ?? { view_detail: 0, download_itinerary: 0, create_booking: 0 };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {(["view_detail", "download_itinerary", "create_booking"] as const).map((key) => {
          const cfg = actionConfig[key];
          const Icon = cfg.icon;
          return (
            <Card key={key}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">{cfg.label} (tháng này)</div>
                  <div className="text-2xl font-bold mt-1">{summary[key]}</div>
                </div>
                <Icon className="h-8 w-8 text-muted-foreground/40" />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select value={filterUser} onValueChange={setFilterUser}>
            <SelectTrigger><SelectValue placeholder="Nhân viên" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả nhân viên</SelectItem>
              {userOptions.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} placeholder="Từ ngày" />
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} placeholder="Đến ngày" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Nhân viên</TableHead>
                  <TableHead>Mã Tour</TableHead>
                  <TableHead>Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const cfg = actionConfig[log.action];
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">{format(new Date(log.created_at), "dd/MM HH:mm")}</TableCell>
                      <TableCell>{log.user_name ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{log.tour_code}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {logs.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Chưa có nhật ký</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
        {logs.length === PAGE_SIZE && (
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Trước</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)}>Sau</Button>
          </div>
        )}
      </Card>
    </div>
  );
}
