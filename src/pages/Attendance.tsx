// Page: Chấm công (Jibble sync)
// Tabs:
//   1. Tổng quan      - thống kê + lịch sử sync + bảng map Jibble
//   2. Chấm công ngày - bảng ca làm việc (NV, ngày, vào, ra, tổng giờ, đi muộn, về sớm)
//   3. Sự kiện        - log In/Out chi tiết từ Jibble
//   4. Vi phạm         - đi muộn / về sớm (tự sinh bởi trigger SQL)
import { useState, useMemo } from "react";

// === Helpers for CSV / Excel export ===
function csvEscape(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  // Escape nếu có dấu phẩy, nháy kép hoặc xuống dòng
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCSV(filename: string, rows: (string | number | null | undefined)[][]) {
  // BOM để Excel nhận diện UTF-8 (giữ nguyên tiếng Việt có dấu)
  const BOM = "\uFEFF";
  const csv = rows.map(r => r.map(csvEscape).join(",")).join("\r\n");
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatVNDateTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const vn = new Date(d.getTime() + 7 * 3600 * 1000);
  const dd = String(vn.getUTCDate()).padStart(2, "0");
  const mo = String(vn.getUTCMonth() + 1).padStart(2, "0");
  const yy = vn.getUTCFullYear();
  const hh = String(vn.getUTCHours()).padStart(2, "0");
  const mm = String(vn.getUTCMinutes()).padStart(2, "0");
  return `${dd}/${mo}/${yy} ${hh}:${mm}`;
}

function formatVNTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const vn = new Date(d.getTime() + 7 * 3600 * 1000);
  return `${String(vn.getUTCHours()).padStart(2, "0")}:${String(vn.getUTCMinutes()).padStart(2, "0")}`;
}
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2, RefreshCw, AlertTriangle, CheckCircle2, XCircle, Clock, Users, Database, Zap,
  Calendar, TrendingUp, Download,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const statusBadge: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Chờ mời", className: "bg-muted text-muted-foreground" },
  INVITED: { label: "Đã mời", className: "bg-warning/15 text-warning border-warning/30" },
  JOINED: { label: "Đã tham gia", className: "bg-success/15 text-success border-success/30" },
  FAILED: { label: "Lỗi", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

const trangThaiNgayBadge: Record<string, { label: string; className: string }> = {
  DU_CONG: { label: "Đủ công", className: "bg-success/15 text-success border-success/30" },
  DI_MUON: { label: "Đi muộn", className: "bg-warning/15 text-warning border-warning/30" },
  VE_SOM: { label: "Về sớm", className: "bg-warning/15 text-warning border-warning/30" },
  VANG: { label: "Vắng", className: "bg-destructive/15 text-destructive border-destructive/30" },
  NGHI_PHEP: { label: "Nghỉ phép", className: "bg-accent/15 text-accent border-accent/30" },
  CUOI_TUAN: { label: "Cuối tuần", className: "bg-muted text-muted-foreground" },
  LE: { label: "Lễ", className: "bg-muted text-muted-foreground" },
  QUEN_CHAM_RA: { label: "Quên chấm ra", className: "bg-destructive/15 text-destructive border-destructive/30" },
  QUEN_CHAM_VAO: { label: "Quên chấm vào", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

const loaiViPhamBadge: Record<string, { label: string; className: string }> = {
  DI_MUON: { label: "Đi muộn", className: "bg-warning text-warning-foreground" },
  VE_SOM: { label: "Về sớm", className: "bg-warning text-warning-foreground" },
  VANG: { label: "Vắng", className: "bg-destructive text-destructive-foreground" },
  QUEN_CHAM_RA: { label: "Quên chấm ra", className: "bg-destructive text-destructive-foreground" },
  QUEN_CHAM_VAO: { label: "Quên chấm vào", className: "bg-destructive text-destructive-foreground" },
};

const trangThaiVPLabel: Record<string, { label: string; className: string }> = {
  CHO_XAC_NHAN: { label: "Chờ duyệt", className: "bg-warning/15 text-warning border-warning/30" },
  DA_DAY_NE_NEP: { label: "Đã đẩy nội nếp", className: "bg-success/15 text-success border-success/30" },
  BO_QUA: { label: "Bỏ qua", className: "bg-muted text-muted-foreground" },
};

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });
}
function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}
function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN");
}
function formatDuration(min: number | null) {
  if (min == null || min === 0) return "0p";
  if (min < 60) return `${min}p`;
  return `${Math.floor(min / 60)}h${min % 60 ? ` ${min % 60}p` : ""}`;
}
function formatMsDuration(ms: number | null) {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
function isWeekend(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const dow = d.getUTCDay();
  return dow === 0 || dow === 6;
}

export default function Attendance() {
  const qc = useQueryClient();
  const { session } = useAuth();
  const [tab, setTab] = useState("overview");
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  // ---- Queries -----------------------------------------------------------
  const { data: maps = [], isLoading: mapsLoading, refetch: refetchMaps } = useQuery({
    queryKey: ["cc_maps"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cc_nhan_vien_map")
        .select("id, jibble_email, jibble_status, status, latest_jibble_time, invited_at, joined_at, last_error, employee:employees!cc_nhan_vien_map_employee_id_fkey(id, full_name, employee_code)")
        .order("invited_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ["cc_sync_log", 20],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cc_sync_log")
        .select("id, loai_sync, bat_dau, ket_thuc, so_phien_moi, so_phien_cap_nhat, so_vi_pham_phat_sinh, trang_thai, loi")
        .order("bat_dau", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["cc_su_kien_recent", from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cc_su_kien")
        .select("id, jibble_entry_id, loai, thoi_diem, belongs_to_date, is_manual, is_unusual, is_offline, is_outside_geofence, jibble_status, address, client_type, coordinates_lat, coordinates_lng, employee:employees!cc_su_kien_employee_id_fkey(full_name, employee_code)")
        .gte("belongs_to_date", from)
        .lte("belongs_to_date", to)
        .order("thoi_diem", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const { data: ngayList = [], isLoading: ngayLoading } = useQuery({
    queryKey: ["cc_ngay_range", from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cc_ngay")
        .select("id, employee_id, ngay, gio_vao_som_nhat, gio_ra_muon_nhat, tong_phut_lam, so_phien, trang_thai, phut_di_muon, phut_ve_som, da_xac_nhan, employee:employees!cc_ngay_employee_id_fkey(full_name, employee_code)")
        .gte("ngay", from)
        .lte("ngay", to)
        .order("ngay", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  const { data: violations = [] } = useQuery({
    queryKey: ["cc_vi_pham_recent", from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cc_vi_pham_tu_dong")
        .select("id, loai, chi_tiet, trang_thai_xet, created_at, employee_id, employee:employees!cc_vi_pham_tu_dong_employee_id_fkey(full_name, employee_code)")
        .gte("created_at", `${from}T00:00:00Z`)
        .lte("created_at", `${to}T23:59:59Z`)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  // === Export handlers ===
  function exportNgayCSV() {
    if (ngayList.length === 0) {
      toast.error("Không có dữ liệu để xuất");
      return;
    }
    const header = [
      "Mã NV", "Họ tên", "Ngày", "Giờ vào (ICT)", "Giờ ra (ICT)",
      "Tổng phút", "Số phiên", "Phút đi muộn", "Phút về sớm", "Trạng thái",
    ];
    const trangThaiVN: Record<string, string> = {
      DU_CONG: "Đủ công", DI_MUON: "Đi muộn", VE_SOM: "Về sớm",
      VANG: "Vắng", NGHI_PHEP: "Nghỉ phép", CUOI_TUAN: "Cuối tuần", LE: "Lễ",
      QUEN_CHAM_RA: "Quên chấm ra", QUEN_CHAM_VAO: "Quên chấm vào",
    };
    const rows: (string | number | null | undefined)[][] = [header];
    // Sắp xếp theo ngày tăng dần, theo mã NV (dễ đọc khi in)
    const sorted = [...ngayList].sort((a: any, b: any) =>
      a.ngay.localeCompare(b.ngay) || (a.employee?.employee_code || "").localeCompare(b.employee?.employee_code || "")
    );
    for (const n of sorted) {
      rows.push([
        n.employee?.employee_code ?? "",
        n.employee?.full_name ?? "",
        formatDate(n.ngay),
        formatVNTime(n.gio_vao_som_nhat),
        formatVNTime(n.gio_ra_muon_nhat),
        n.tong_phut_lam ?? 0,
        n.so_phien ?? 0,
        n.phut_di_muon ?? 0,
        n.phut_ve_som ?? 0,
        trangThaiVN[n.trang_thai] ?? n.trang_thai ?? "",
      ]);
    }
    // Tổng kết
    rows.push([]);
    rows.push(["", "", "TỔNG", "", "", stats.totalMin, "", stats.tongDiMuon, stats.tongVeSom, `${stats.ngayCoCong}/${ngayList.length} ngày có công`]);
    downloadCSV(`bang-cong_${from}_${to}.csv`, rows);
    toast.success(`Đã xuất ${ngayList.length} dòng (${from} → ${to})`);
  }

  function exportEventsCSV() {
    if (events.length === 0) {
      toast.error("Không có sự kiện để xuất");
      return;
    }
    const header = [
      "Mã NV", "Họ tên", "Loại", "Thời điểm (ICT)", "Ngày",
      "Loại client", "Địa chỉ / GPS", "Manual", "Unusual", "Offline", "Ngoài Geo",
    ];
    const rows: (string | number | null | undefined)[][] = [header];
    const sorted = [...events].sort((a: any, b: any) =>
      (a.thoi_diem || "").localeCompare(b.thoi_diem || "")
    );
    for (const e of sorted) {
      const addr = e.address || (e.coordinates_lat ? `${e.coordinates_lat.toFixed(4)},${e.coordinates_lng?.toFixed(4)}` : "");
      rows.push([
        e.employee?.employee_code ?? "",
        e.employee?.full_name ?? "",
        e.loai ?? "",
        formatVNDateTime(e.thoi_diem),
        formatDate(e.belongs_to_date),
        e.client_type ?? "",
        addr,
        e.is_manual ? "x" : "",
        e.is_unusual ? "x" : "",
        e.is_offline ? "x" : "",
        e.is_outside_geofence ? "x" : "",
      ]);
    }
    downloadCSV(`su-kien_${from}_${to}.csv`, rows);
    toast.success(`Đã xuất ${events.length} sự kiện`);
  }

  function exportViolationsCSV() {
    if (violations.length === 0) {
      toast.error("Không có vi phạm để xuất");
      return;
    }
    const header = ["Mã NV", "Họ tên", "Phát hiện (ICT)", "Loại", "Chi tiết", "Trạng thái"];
    const loaiVN: Record<string, string> = {
      DI_MUON: "Đi muộn", VE_SOM: "Về sớm", VANG: "Vắng",
      QUEN_CHAM_RA: "Quên chấm ra", QUEN_CHAM_VAO: "Quên chấm vào",
    };
    const trangThaiVP: Record<string, string> = {
      CHO_XAC_NHAN: "Chờ duyệt", DA_DAY_NE_NEP: "Đã đẩy nội nếp", BO_QUA: "Bỏ qua",
    };
    const rows: (string | number | null | undefined)[][] = [header];
    for (const v of violations) {
      const ct = (v.chi_tiet ?? {}) as { phut?: number; ngay?: string };
      const chiTiet = ct.phut
        ? `${ct.phut} phút${ct.ngay ? ` ngày ${formatDate(ct.ngay)}` : ""}`
        : (ct.ngay ? `ngày ${formatDate(ct.ngay)}` : "");
      rows.push([
        v.employee?.employee_code ?? "",
        v.employee?.full_name ?? "",
        formatVNDateTime(v.created_at),
        loaiVN[v.loai] ?? v.loai ?? "",
        chiTiet,
        trangThaiVP[v.trang_thai_xet] ?? v.trang_thai_xet ?? "",
      ]);
    }
    downloadCSV(`vi-pham_${from}_${to}.csv`, rows);
    toast.success(`Đã xuất ${violations.length} vi phạm`);
  }

  const stats = useMemo(() => {
    const totalMin = ngayList.reduce((s: number, n: any) => s + (n.tong_phut_lam || 0), 0);
    const tongDiMuon = ngayList.reduce((s: number, n: any) => s + (n.phut_di_muon || 0), 0);
    const tongVeSom = ngayList.reduce((s: number, n: any) => s + (n.phut_ve_som || 0), 0);
    return {
      total: maps.length,
      joined: maps.filter((m: any) => m.status === "JOINED").length,
      jibbleJoined: maps.filter((m: any) => m.jibble_status === "Joined" || m.jibble_status === "Active").length,
      withLatest: maps.filter((m: any) => m.latest_jibble_time).length,
      eventsCount: events.length,
      ngayCount: ngayList.length,
      ngayCoCong: ngayList.filter((n: any) => n.tong_phut_lam > 0).length,
      totalMin,
      tongDiMuon,
      tongVeSom,
      vpsChoDuyet: violations.filter((v: any) => v.trang_thai_xet === "CHO_XAC_NHAN").length,
    };
  }, [maps, events, ngayList, violations]);

  const sync = useMutation({
    mutationFn: async (payload: { type: string; from?: string; to?: string; days?: number; label: string }) => {
      if (!session?.access_token) throw new Error("Ch�a ��ng nh?p");
      const r = await fetch("https://aneazkhnqkkpqtcxunqd.supabase.co/functions/v1/cc-sync-jibble", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ ...payload, source: "ui" }),
      });
      const txt = await r.text();
      let data: any;
      try { data = JSON.parse(txt); } catch { data = { raw: txt }; }
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
      return { ...data, label: payload.label };
    },
    onSuccess: (data) => {
      toast.success(
        `[${data.label}] ${data.events_upserted} events | ${data.so_phien_moi} m?i | ${data.so_vi_pham_phat_sinh} vi ph?m | ${data.duration_ms}ms`,
      );
      qc.invalidateQueries({ queryKey: ["cc_sync_log"] });
      qc.invalidateQueries({ queryKey: ["cc_maps"] });
      qc.invalidateQueries({ queryKey: ["cc_su_kien_recent"] });
      qc.invalidateQueries({ queryKey: ["cc_ngay_range"] });
      qc.invalidateQueries({ queryKey: ["cc_vi_pham_recent"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Ch?m c�ng (Jibble)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tự động đồng bộ từ Jibble mỗi 30 phút qua cron (jibble-sync-default). Có thể bấm "Đồng bộ ngay" bên dưới để kéo data mới nhất.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              const today = new Date().toISOString().slice(0, 10);
              const ago60 = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
              sync.mutate({ type: "L2_FULL", from: ago60, to: today, days: 60, label: "�?ng b? 60 ng�y" });
            }}
            disabled={sync.isPending}
          >
            {sync.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Calendar className="h-4 w-4 mr-1" />}
            �?ng b? 60 ng�y
          </Button>
          <Button
            onClick={() => sync.mutate({ type: "L1_INCREMENTAL", label: "�?ng b? nhanh" })}
            disabled={sync.isPending}
          >
            {sync.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
            �?ng b? ngay
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label className="text-xs">T? ng�y</Label>
              <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-9 w-[160px]" />
            </div>
            <div>
              <Label className="text-xs">�?n ng�y</Label>
              <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-9 w-[160px]" />
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                const f = from, t = to;
                sync.mutate({ type: "MANUAL", from: f, to: t, label: `Range ${f} ? ${t}` });
              }}
              disabled={sync.isPending}
            >
              {sync.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
              �?ng b? range n�y
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">T?ng quan</TabsTrigger>
          <TabsTrigger value="ngay">Ch?m c�ng ng�y ({ngayList.length})</TabsTrigger>
          <TabsTrigger value="events">S? ki?n ({events.length})</TabsTrigger>
          <TabsTrigger value="violations">Vi ph?m ({violations.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card>
              <CardContent className="p-3">
                <p className="text-[10px] text-muted-foreground uppercase">T?ng NV map</p>
                <p className="text-2xl font-bold mt-1">{stats.total}</p>
                <p className="text-[10px] text-muted-foreground mt-1">JOINED: {stats.joined}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-[10px] text-muted-foreground uppercase">NV c� data ch?m</p>
                <p className="text-2xl font-bold mt-1">{stats.withLatest}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Jibble: {stats.jibbleJoined}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-[10px] text-muted-foreground uppercase">Events (range)</p>
                <p className="text-2xl font-bold mt-1">{stats.eventsCount}</p>
                <p className="text-[10px] text-muted-foreground mt-1">In/Out t? Jibble</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-[10px] text-muted-foreground uppercase">T?ng gi? l�m</p>
                <p className="text-2xl font-bold mt-1">{formatDuration(stats.totalMin)}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{stats.ngayCoCong} ng�y c� c�ng</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-[10px] text-muted-foreground uppercase">VP ch? duy?t</p>
                <p className="text-2xl font-bold mt-1 text-destructive">{stats.vpsChoDuyet}</p>
                <p className="text-[10px] text-muted-foreground mt-1">T?ng �M: {formatDuration(stats.tongDiMuon)}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-4 w-4" />
                L?ch s? �?ng b? (20 l?n g?n nh?t)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {logsLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : logs.length === 0 ? (
                <p className="text-center py-6 text-sm text-muted-foreground">Ch�a c� l?n �?ng b? n�o</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>B?t �?u</TableHead>
                      <TableHead>Lo?i</TableHead>
                      <TableHead>Tr?ng th�i</TableHead>
                      <TableHead className="text-right">M?i</TableHead>
                      <TableHead className="text-right">C?p nh?t</TableHead>
                      <TableHead className="text-right">VP</TableHead>
                      <TableHead>Th?i l�?ng</TableHead>
                      <TableHead>Ghi ch�</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((l: any) => {
                      const dur = l.bat_dau && l.ket_thuc
                        ? new Date(l.ket_thuc).getTime() - new Date(l.bat_dau).getTime()
                        : null;
                      return (
                        <TableRow key={l.id}>
                          <TableCell className="font-mono text-xs" title={`UTC: ${l.bat_dau}`}>
                            {formatDateTimeVN(l.bat_dau)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">{l.loai_sync}</Badge>
                          </TableCell>
                          <TableCell>
                            {l.trang_thai === "OK" ? (
                              <span className="inline-flex items-center gap-1 text-xs text-success">
                                <CheckCircle2 className="h-3 w-3" /> OK
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-destructive">
                                <XCircle className="h-3 w-3" /> L?i
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm">{l.so_phien_moi ?? 0}</TableCell>
                          <TableCell className="text-right text-sm">{l.so_phien_cap_nhat ?? 0}</TableCell>
                          <TableCell className="text-right text-sm">
                            {l.so_vi_pham_phat_sinh > 0 ? (
                              <Badge variant="destructive" className="text-[10px]">{l.so_vi_pham_phat_sinh}</Badge>
                            ) : "0"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatMsDuration(dur)}</TableCell>
                          <TableCell className="text-[10px] text-muted-foreground max-w-[200px] truncate" title={l.loi}>
                            {l.loi ?? "�"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Map Jibble ? Nh�n s? ({maps.length})
              </CardTitle>
              <Button size="sm" variant="ghost" onClick={() => refetchMaps()}>
                <RefreshCw className="h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {mapsLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>NV</TableHead>
                      <TableHead>Email Jibble</TableHead>
                      <TableHead>Tr?ng th�i n?i b?</TableHead>
                      <TableHead>Jibble status</TableHead>
                      <TableHead>L?n ch?m g?n nh?t</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {maps.map((m: any) => (
                      <TableRow key={m.id}>
                        <TableCell>
                          <div className="font-medium text-sm">{m.employee?.full_name ?? "�"}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{m.employee?.employee_code ?? "�"}</div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{m.jibble_email ?? "�"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusBadge[m.status]?.className}>
                            {statusBadge[m.status]?.label ?? m.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{m.jibble_status ?? "�"}</TableCell>
                        <TableCell>
                          {m.latest_jibble_time ? (
                            <span className="inline-flex items-center gap-1 text-xs">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              {formatDateTime(m.latest_jibble_time)}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">�</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ngay" className="space-y-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                B?ng ca lm vi?c ({ngayList.length} ngy, t?ng {formatDuration(stats.totalMin)})
              </CardTitle>
              <Button size="sm" variant="outline" onClick={exportNgayCSV} disabled={ngayList.length === 0}>
                <Download className="h-3 w-3 mr-1" />
                Xuất CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {ngayLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : ngayList.length === 0 ? (
                <p className="text-center py-6 text-sm text-muted-foreground">Ch�a c� d? li?u. B?m "�?ng b? range n�y" ho?c "�?ng b? 60 ng�y".</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>NV</TableHead>
                      <TableHead>Ng�y</TableHead>
                      <TableHead>V�o</TableHead>
                      <TableHead>Ra</TableHead>
                      <TableHead className="text-right">T?ng gi?</TableHead>
                      <TableHead className="text-right">�i mu?n</TableHead>
                      <TableHead className="text-right">V? s?m</TableHead>
                      <TableHead>Tr?ng th�i</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ngayList.map((n: any) => {
                      const isWE = isWeekend(n.ngay);
                      return (
                        <TableRow key={n.id} className={isWE ? "bg-muted/30" : ""}>
                          <TableCell>
                            <div className="font-medium text-sm">{n.employee?.full_name ?? "�"}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">{n.employee?.employee_code ?? "�"}</div>
                          </TableCell>
                          <TableCell className="text-xs">
                            {formatDate(n.ngay)}
                            <span className="text-[10px] text-muted-foreground ml-1">
                              {new Date(n.ngay).toLocaleDateString("vi-VN", { weekday: "short" })}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{formatTime(n.gio_vao_som_nhat)}</TableCell>
                          <TableCell className="font-mono text-xs">{formatTime(n.gio_ra_muon_nhat)}</TableCell>
                          <TableCell className="text-right font-medium">{formatDuration(n.tong_phut_lam)}</TableCell>
                          <TableCell className="text-right text-xs">
                            {n.phut_di_muon > 0 ? (
                              <span className="text-warning font-medium">+{formatDuration(n.phut_di_muon)}</span>
                            ) : <span className="text-muted-foreground">�</span>}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {n.phut_ve_som > 0 ? (
                              <span className="text-warning font-medium">-{formatDuration(n.phut_ve_som)}</span>
                            ) : <span className="text-muted-foreground">�</span>}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={trangThaiNgayBadge[n.trang_thai]?.className}>
                              {trangThaiNgayBadge[n.trang_thai]?.label ?? n.trang_thai}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                S? ki?n In/Out ({events.length} t? {formatDate(from)} ? {formatDate(to)})
              </CardTitle>
              <Button size="sm" variant="outline" onClick={exportEventsCSV} disabled={events.length === 0}>
                <Download className="h-3 w-3 mr-1" />
                Xuất CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {eventsLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : events.length === 0 ? (
                <p className="text-center py-6 text-sm text-muted-foreground">Ch�a c� s? ki?n n�o trong kho?ng n�y</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Th?i �i?m (VN)</TableHead>
                      <TableHead>NV</TableHead>
                      <TableHead>Lo?i</TableHead>
                      <TableHead>�?a ch? / GPS</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Flags</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((e: any) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-mono text-xs" title={`UTC: ${e.thoi_diem}`}>
                          {formatDateTimeVN(e.thoi_diem)}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{e.employee?.full_name ?? "�"}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{e.employee?.employee_code ?? "�"}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={e.loai === "In" ? "default" : "secondary"} className="text-[10px]">
                            {e.loai}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs max-w-[280px]">
                          {e.address ? (
                            <div className="truncate" title={e.address}>{e.address}</div>
                          ) : e.coordinates_lat ? (
                            <div className="font-mono text-[10px]">
                              {e.coordinates_lat.toFixed(4)}, {e.coordinates_lng?.toFixed(4)}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">�</span>
                          )}
                        </TableCell>
                        <TableCell className="text-[10px] text-muted-foreground">{e.client_type ?? "�"}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {e.is_manual && <Badge variant="outline" className="text-[9px] bg-warning/10 text-warning border-warning/30">Manual</Badge>}
                            {e.is_unusual && <Badge variant="outline" className="text-[9px] bg-warning/10 text-warning border-warning/30">Unusual</Badge>}
                            {e.is_offline && <Badge variant="outline" className="text-[9px] bg-muted text-muted-foreground">Offline</Badge>}
                            {e.is_outside_geofence && <Badge variant="outline" className="text-[9px] bg-destructive/10 text-destructive border-destructive/30">Ngo�i Geo</Badge>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="violations" className="space-y-4">
          {violations.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-2" />
                <p className="text-muted-foreground">Kh�ng c� vi ph?m n�o trong kho?ng n�y</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Vi ph?m ch?m cng ({violations.length})
                </CardTitle>
                <Button size="sm" variant="outline" onClick={exportViolationsCSV}>
                  <Download className="h-3 w-3 mr-1" />
                  Xuất CSV
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ph�t hi?n</TableHead>
                      <TableHead>NV</TableHead>
                      <TableHead>Lo?i</TableHead>
                      <TableHead>Chi ti?t</TableHead>
                      <TableHead>Tr?ng th�i</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {violations.map((v: any) => (
                      <TableRow key={v.id}>
                        <TableCell className="text-xs" title={`UTC: ${v.created_at}`}>
                          {formatDateTimeVN(v.created_at)}
                        </TableCell>
                        <TableCell className="text-sm">{v.employee?.full_name ?? "�"}</TableCell>
                        <TableCell>
                          <Badge className={loaiViPhamBadge[v.loai]?.className ?? ""}>
                            {loaiViPhamBadge[v.loai]?.label ?? v.loai}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {v.chi_tiet?.phut ? `${v.chi_tiet.phut} ph�t` : JSON.stringify(v.chi_tiet).slice(0, 60)}
                          {v.chi_tiet?.ngay && <span className="block text-[10px]">ng�y {v.chi_tiet.ngay}</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={trangThaiVPLabel[v.trang_thai_xet]?.className}>
                            {trangThaiVPLabel[v.trang_thai_xet]?.label ?? v.trang_thai_xet}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function formatDateTimeVN(iso: string | null) {
  if (!iso) return "�";
  const d = new Date(iso);
  const vn = new Date(d.getTime() + 7 * 3600 * 1000);
  const hh = String(vn.getUTCHours()).padStart(2, "0");
  const mm = String(vn.getUTCMinutes()).padStart(2, "0");
  const dd = String(vn.getUTCDate()).padStart(2, "0");
  const mo = String(vn.getUTCMonth() + 1).padStart(2, "0");
  const yy = vn.getUTCFullYear();
  return `${hh}:${mm} ${dd}/${mo}/${yy}`;
}
