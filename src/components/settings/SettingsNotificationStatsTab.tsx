import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, BellOff, AlertTriangle, Users } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

export function SettingsNotificationStatsTab() {
  const { data: byUser = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["notif-stats-by-user"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_notification_unread_by_user");
      if (error) throw error;
      return (data as any[]) || [];
    },
    refetchInterval: 60000,
  });

  const { data: overdue = [], isLoading: loadingOverdue } = useQuery({
    queryKey: ["notif-stats-overdue"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_notification_critical_overdue");
      if (error) throw error;
      return (data as any[]) || [];
    },
    refetchInterval: 60000,
  });

  const { data: overview } = useQuery({
    queryKey: ["notif-overview"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_notification_overview");
      if (error) throw error;
      return data as any;
    },
    refetchInterval: 60000,
  });

  const sent7d = Number(overview?.sent_7d ?? 0);
  const totalUnread = Number(overview?.unread ?? byUser.reduce((s: number, r: any) => s + Number(r.unread_total || 0), 0));
  const actionPending = Number(overview?.action_pending ?? 0);
  const actionOverdue = Number(overview?.action_overdue ?? overdue.length);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-medium text-muted-foreground">Đã gửi (7 ngày)</CardTitle>
            <BellOff className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{sent7d}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-medium text-muted-foreground">Chưa đọc</CardTitle>
            <BellOff className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalUnread}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-medium text-muted-foreground">Cần xử lý</CardTitle>
            <Users className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-700">{actionPending}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Action chưa hoàn tất</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-medium text-muted-foreground">Quá hạn xử lý</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{actionOverdue}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle className="text-base">Cao/Khẩn chưa đọc quá 24 giờ</CardTitle>
            <Badge variant="destructive" className="text-xs">{overdue.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Người nhận</TableHead>
                  <TableHead>Tiêu đề</TableHead>
                  <TableHead className="w-[110px]">Mức độ</TableHead>
                  <TableHead className="w-[160px]">Tạo lúc</TableHead>
                  <TableHead className="w-[100px] text-right">Trễ (giờ)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingOverdue && (
                  <TableRow><TableCell colSpan={5} className="text-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell></TableRow>
                )}
                {!loadingOverdue && overdue.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center py-6 text-sm text-muted-foreground">
                    Không có thông báo nào quá hạn 🎉
                  </TableCell></TableRow>
                )}
                {overdue.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">{r.recipient_name || "—"}</TableCell>
                    <TableCell className="text-sm">{r.title}</TableCell>
                    <TableCell>
                      <Badge variant={r.priority === "critical" ? "destructive" : "default"} className="text-[10px]">
                        {r.priority === "critical" ? "Khẩn" : "Cao"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {format(new Date(r.created_at), "dd/MM/yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-destructive">
                      {Number(r.hours_overdue).toFixed(1)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Top nhân sự nhiều thông báo chưa đọc</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nhân sự</TableHead>
                  <TableHead className="w-[140px]">Phòng ban</TableHead>
                  <TableHead className="w-[100px] text-right">Tổng chưa đọc</TableHead>
                  <TableHead className="w-[120px] text-right">Cao/Khẩn</TableHead>
                  <TableHead className="w-[180px]">Cũ nhất</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingUsers && (
                  <TableRow><TableCell colSpan={5} className="text-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell></TableRow>
                )}
                {!loadingUsers && byUser.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center py-6 text-sm text-muted-foreground">
                    Tất cả nhân sự đã đọc hết thông báo
                  </TableCell></TableRow>
                )}
                {byUser.map((r: any) => (
                  <TableRow key={r.user_id}>
                    <TableCell className="text-sm font-medium">{r.full_name || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.department || "—"}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{r.unread_total}</TableCell>
                    <TableCell className="text-right">
                      {Number(r.unread_high_critical) > 0 ? (
                        <Badge variant="destructive" className="text-[10px]">
                          {r.unread_high_critical}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.oldest_unread_at
                        ? formatDistanceToNow(new Date(r.oldest_unread_at), { addSuffix: true, locale: vi })
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            <strong>Lưu ý:</strong> "Đã đọc" chỉ nghĩa là nhân sự đã xem thông báo, KHÔNG đồng nghĩa
            đã hoàn thành công việc. Các thông báo cần xử lý có cột riêng <code>action_completed_at</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
