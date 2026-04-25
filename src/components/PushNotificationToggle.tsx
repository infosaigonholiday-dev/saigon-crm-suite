import { useState } from "react";
import { Bell, BellOff, ExternalLink, Send, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { usePushSubscription, type PushSubscribeError } from "@/hooks/usePushSubscription";
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

export function PushNotificationToggle() {
  const { user } = useAuth();
  const { isSupported, isSubscribed, permission, loading, inIframe, subscribe, unsubscribe } =
    usePushSubscription();
  const [testing, setTesting] = useState(false);
  const [resubscribing, setResubscribing] = useState(false);
  const [lastTestFailed, setLastTestFailed] = useState(false);

  const handleTestPush = async () => {
    if (!user) return;
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
        toast.error("Chưa có thiết bị nào đăng ký push cho tài khoản này.");
        setLastTestFailed(true);
      } else {
        toast.error(`Push thất bại (sent=${sent}, failed=${failed}). Nhấn "Đăng ký lại" bên dưới.`);
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
        toast.error("Không đăng ký lại được: " + (r.detail || r.error || "lỗi không rõ"));
      }
    } finally {
      setResubscribing(false);
    }
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

      <div className="rounded-md border border-border bg-card p-4">
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
              {permission === "denied" && (
                <p className="text-xs text-destructive">
                  Bạn đã chặn quyền thông báo. Mở biểu tượng 🔒 trên thanh địa chỉ → Cho phép thông báo → tải lại trang.
                </p>
              )}
            </div>
          </div>
          <Switch
            id="push-toggle"
            checked={isSubscribed}
            onCheckedChange={handleToggle}
            disabled={loading || permission === "denied" || inIframe}
          />
        </div>

        {isSubscribed && (
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
            <p className="text-xs text-muted-foreground">
              Gửi một thông báo thử để kiểm tra Web Push hoạt động trên thiết bị này.
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleTestPush}
              disabled={testing}
            >
              {testing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Đang gửi…</>
              ) : (
                <><Send className="h-4 w-4 mr-2" /> Gửi thử push</>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
