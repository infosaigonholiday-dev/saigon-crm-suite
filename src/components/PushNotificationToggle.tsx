import { useState } from "react";
import { Bell, BellOff, ExternalLink, Send, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { usePushSubscription, type PushSubscribeError, type PushStatusReason } from "@/hooks/usePushSubscription";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const ERROR_MESSAGES: Record<PushSubscribeError, string> = {
  unsupported: "Trình duyệt không hỗ trợ Web Push.",
  iframe: "Đang chạy trong iframe editor — hãy mở trang trong tab mới.",
  denied: "Trình duyệt đã chặn quyền thông báo. Mở 🔒 trên thanh địa chỉ → Cho phép.",
  sw_unreachable: "Không tải được Service Worker (/sw.js). Vui lòng tải lại trang.",
  sw_register_failed: "Đăng ký Service Worker thất bại.",
  vapid_invalid: "Khoá VAPID không hợp lệ. Liên hệ admin.",
  subscribe_failed: "Trình duyệt từ chối đăng ký push (có thể do iframe hoặc mạng).",
  db_failed: "Lưu đăng ký lên server thất bại.",
  error: "Lỗi không xác định khi bật thông báo.",
};

const STATUS_LABEL: Record<PushStatusReason, { tone: "ok" | "warn" | "err"; text: string }> = {
  ready: { tone: "ok", text: "Đã sẵn sàng — thiết bị này sẽ nhận thông báo." },
  missing_vapid_env: { tone: "err", text: "Thiếu VITE_VAPID_PUBLIC_KEY trong .env. Liên hệ admin." },
  unsupported: { tone: "err", text: "Trình duyệt không hỗ trợ Web Push." },
  iframe_blocked: { tone: "warn", text: "Đang chạy trong iframe — mở app trong tab mới để bật push." },
  permission_denied: { tone: "err", text: "Bạn đã chặn quyền thông báo. Mở 🔒 trên thanh địa chỉ → Cho phép." },
  permission_default: { tone: "warn", text: "Chưa cấp quyền thông báo. Bật toggle để cấp quyền." },
  no_browser_sub: { tone: "warn", text: "Chưa đăng ký push trên thiết bị này. Bật toggle để đăng ký." },
  vapid_mismatch: { tone: "warn", text: "Khoá VAPID đã đổi — subscription cũ bị xoá. Đang đăng ký lại…" },
  db_row_missing: { tone: "warn", text: "Trình duyệt có sub nhưng DB thiếu — đã tự đồng bộ lại." },
  unknown: { tone: "warn", text: "Chưa xác định trạng thái push." },
};

export function PushNotificationToggle() {
  const { user } = useAuth();
  const {
    isSupported,
    isSubscribed,
    permission,
    loading,
    inIframe,
    statusReason,
    hasBrowserSubscription,
    hasDbSubscription,
    subscribe,
    unsubscribe,
  } = usePushSubscription();
  const [testing, setTesting] = useState(false);
  const [resubscribing, setResubscribing] = useState(false);
  const [lastTestFailed, setLastTestFailed] = useState(false);

  const handleTestPush = async () => {
    if (!user) {
      toast.error("Bạn cần đăng nhập để gửi thử push.");
      return;
    }
    setTesting(true);
    setLastTestFailed(false);
    try {
      const { data, error } = await supabase.functions.invoke("send-notification", {
        body: {
          user_id: user.id,
          title: "🔔 Test Web Push",
          message: "Nếu bạn thấy thông báo này trên màn hình → cấu hình push hoạt động tốt!",
          url: "/cai-dat",
          tag: "test-push-" + Date.now(),
        },
      });
      if (error) throw error;
      const sent = (data as { sent?: number; failed?: number; reason?: string })?.sent ?? 0;
      const failed = (data as { failed?: number })?.failed ?? 0;
      const reason = (data as { reason?: string })?.reason;
      if (sent > 0) {
        toast.success(`Đã gửi push tới ${sent} thiết bị (${failed} lỗi). Kiểm tra màn hình.`);
      } else if (reason === "no_subscriptions") {
        toast.error("Chưa có thiết bị nào đăng ký push cho tài khoản này. Bấm 'Đăng ký lại' bên dưới.");
        setLastTestFailed(true);
      } else {
        toast.error(`Push thất bại (sent=${sent}, failed=${failed}). Bấm "Đăng ký lại" bên dưới.`);
        setLastTestFailed(true);
      }
    } catch (e: any) {
      console.error("[push] test failed", e);
      toast.error("Không gọi được send-notification: " + (e?.message || String(e)));
      setLastTestFailed(true);
    } finally {
      setTesting(false);
    }
  };

  const handleResubscribe = async () => {
    setResubscribing(true);
    try {
      await unsubscribe();
      const r = await subscribe();
      if (r.ok) {
        toast.success("Đã đăng ký lại subscription mới. Bấm 'Gửi thử push' để test.");
        setLastTestFailed(false);
      } else {
        const msg = r.error ? ERROR_MESSAGES[r.error] : "Không đăng ký lại được.";
        toast.error(`${msg}${r.detail ? ` (${r.detail})` : ""}`);
      }
    } finally {
      setResubscribing(false);
    }
  };

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      const r = await subscribe();
      if (r.ok) {
        toast.success("Đã bật thông báo Web Push trên thiết bị này");
      } else if (r.error) {
        const msg = ERROR_MESSAGES[r.error] || "Không thể bật thông báo.";
        toast.error(r.detail ? `${msg} (${r.detail})` : msg);
      } else {
        toast.error("Không thể bật thông báo. Vui lòng thử lại.");
      }
    } else {
      const r = await unsubscribe();
      if (r.ok) toast.success("Đã tắt thông báo Web Push trên thiết bị này");
    }
  };

  const openInNewTab = () => {
    const url = window.location.href;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (!isSupported) {
    return (
      <div className="rounded-md border border-border bg-muted/30 p-4">
        <div className="flex items-start gap-3">
          <BellOff className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Thông báo Web Push</p>
            <p className="text-xs text-muted-foreground">
              Trình duyệt hiện tại không hỗ trợ. Hãy dùng Chrome / Edge / Firefox trên máy tính
              hoặc Android. Trên iPhone cần cài app vào màn hình chính (PWA).
            </p>
          </div>
        </div>
      </div>
    );
  }

  const status = STATUS_LABEL[statusReason] ?? STATUS_LABEL.unknown;
  const statusBorder =
    status.tone === "ok"
      ? "border-primary/40 bg-primary/10"
      : status.tone === "err"
      ? "border-destructive/40 bg-destructive/10"
      : "border-warning/40 bg-warning/10";
  const StatusIcon = status.tone === "ok" ? CheckCircle2 : AlertTriangle;

  // Test button is enabled whenever we have a logged-in user, are not in iframe,
  // permission is not denied, and feature is supported. It does NOT depend on isSubscribed,
  // because the user might want to diagnose "why didn't I receive anything?".
  const canTest = !!user && !inIframe && permission !== "denied";

  return (
    <div className="space-y-3">
      {inIframe && (
        <div className="rounded-md border border-primary/40 bg-primary/10 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <ExternalLink className="h-5 w-5 text-primary mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Cần mở trang trong tab riêng để bật thông báo
                </p>
                <p className="text-xs text-muted-foreground">
                  Trình duyệt chặn Service Worker / Push trong iframe editor. Hãy mở app trong tab mới
                  rồi bật toggle bên dưới.
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={openInNewTab}>
              Mở tab mới
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-md border border-border bg-card p-4 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Bell className="h-5 w-5 text-primary mt-0.5" />
            <div className="space-y-1">
              <Label htmlFor="push-toggle" className="text-sm font-medium text-foreground cursor-pointer">
                Thông báo Web Push
              </Label>
              <p className="text-xs text-muted-foreground">
                Nhận thông báo trực tiếp trên thiết bị (giống Zalo) khi có người tag bạn trong ghi chú,
                khi có lead cần follow-up, sinh nhật khách hàng, v.v.
              </p>
            </div>
          </div>
          <Switch
            id="push-toggle"
            checked={isSubscribed}
            onCheckedChange={handleToggle}
            disabled={loading || permission === "denied" || inIframe}
          />
        </div>

        {/* Status diagnostic — luôn hiển thị */}
        <div className={`flex items-start gap-2 rounded-md border ${statusBorder} p-3`}>
          <StatusIcon
            className={`h-4 w-4 mt-0.5 ${
              status.tone === "ok"
                ? "text-primary"
                : status.tone === "err"
                ? "text-destructive"
                : "text-warning"
            }`}
          />
          <div className="flex-1 space-y-1">
            <p className="text-xs font-medium text-foreground">{status.text}</p>
            <p className="text-[11px] text-muted-foreground">
              Browser sub: <strong>{hasBrowserSubscription ? "có" : "không"}</strong> · DB row:{" "}
              <strong>{hasDbSubscription ? "có" : "không"}</strong> · Quyền: <strong>{permission}</strong>
            </p>
          </div>
        </div>

        {/* Khu vực test push & đăng ký lại — LUÔN hiển thị, không ẩn theo isSubscribed */}
        <div className="border-t border-border pt-3 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-muted-foreground flex-1 min-w-[200px]">
              Gửi một thông báo thử để kiểm tra Web Push hoạt động trên thiết bị này.
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleResubscribe}
                disabled={resubscribing || testing || inIframe || permission === "denied" || !user}
              >
                {resubscribing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Đang đăng ký…</>
                ) : (
                  "Đăng ký lại"
                )}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleTestPush}
                disabled={testing || resubscribing || !canTest}
              >
                {testing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Đang gửi…</>
                ) : (
                  <><Send className="h-4 w-4 mr-2" /> Gửi thử push</>
                )}
              </Button>
            </div>
          </div>

          {lastTestFailed && (
            <div className="rounded-md border border-warning/40 bg-warning/10 p-3">
              <p className="text-xs font-medium text-foreground">Push test thất bại</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Có thể do subscription cũ không khớp khoá VAPID hiện tại, hoặc trình duyệt chưa đăng ký push.
                Bấm <strong>“Đăng ký lại”</strong> ở trên rồi thử lại.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
