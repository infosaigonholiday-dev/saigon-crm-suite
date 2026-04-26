import { useState } from "react";
import { Bell, BellOff, ExternalLink, AlertTriangle, CheckCircle2, AlertOctagon, Send, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useOneSignal } from "@/hooks/useOneSignal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ERROR_HINTS: Record<string, string> = {
  "App not configured for web push":
    "Hệ thống thông báo chưa được cấu hình xong trong OneSignal. Admin cần vào dashboard.onesignal.com → Settings → Web Configuration và kiểm tra Site URL = https://app.saigonholiday.vn",
};

function friendlyInitError(msg: string): string {
  for (const key in ERROR_HINTS) {
    if (msg.includes(key)) return ERROR_HINTS[key];
  }
  return msg;
}

export function PushNotificationToggle() {
  const {
    isSupported,
    isReady,
    initError,
    configured,
    isSubscribed,
    permission,
    loading,
    inIframe,
    subscribe,
    unsubscribe,
  } = useOneSignal();

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      const r = await subscribe();
      if (r.ok) toast.success("Đã bật thông báo trên thiết bị này");
      else if (r.error === "denied") toast.error("Bạn đã từ chối quyền thông báo.");
      else if (r.error === "iframe") toast.error("Hãy mở app trong tab thật để bật.");
      else if (r.error === "init_failed") toast.error("OneSignal chưa được cấu hình đúng. Liên hệ admin.");
      else toast.error("Không thể bật thông báo. Tải lại trang rồi thử lại.");
    } else {
      const r = await unsubscribe();
      if (r.ok) toast.success("Đã tắt thông báo trên thiết bị này");
    }
  };

  const [testing, setTesting] = useState(false);
  const handleTestPush = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.rpc("rpc_send_test_push");
      if (error) {
        toast.error(`Lỗi RPC: ${error.message}`);
        return;
      }
      const result = data as {
        ok?: boolean;
        status_code?: number;
        response?: string;
        hint?: string;
        stage?: string;
        error?: string;
      } | null;
      if (result?.ok) {
        toast.success("✅ OneSignal nhận push OK — kiểm tra thông báo trên màn hình", {
          description: result.hint,
          duration: 8000,
        });
      } else {
        toast.error(
          `❌ Push fail: ${result?.status_code ?? result?.stage ?? result?.error ?? "unknown"}`,
          { description: result?.hint || result?.response, duration: 15000 }
        );
        console.error("[push test] full result:", result);
      }
    } catch (e: any) {
      toast.error(`Lỗi: ${e?.message || String(e)}`);
    } finally {
      setTesting(false);
    }
  };

  const openInNewTab = () => {
    window.open(window.location.href, "_blank", "noopener,noreferrer");
  };

  if (!isSupported) {
    return (
      <div className="rounded-md border border-border bg-muted/30 p-4">
        <div className="flex items-start gap-3">
          <BellOff className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Thông báo</p>
            <p className="text-xs text-muted-foreground">
              Trình duyệt không hỗ trợ. Hãy dùng Chrome / Edge / Firefox trên máy tính hoặc Android.
              Trên iPhone cần cài app vào màn hình chính (PWA).
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="rounded-md border border-warning/40 bg-warning/10 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Chưa cấu hình OneSignal</p>
            <p className="text-xs text-muted-foreground">
              Admin cần cài đặt <code className="text-xs">VITE_ONESIGNAL_APP_ID</code> trong file
              <code className="text-xs"> .env </code> và lưu credentials vào bảng <code>system_config</code>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4">
        <div className="flex items-start gap-3">
          <AlertOctagon className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-foreground">Thông báo chưa hoạt động</p>
            <p className="text-xs text-foreground/90">{friendlyInitError(initError)}</p>
          </div>
        </div>
      </div>
    );
  }

  const status = isSubscribed
    ? { tone: "ok" as const, text: "Đã bật — thiết bị này sẽ nhận thông báo." }
    : permission === "denied"
    ? { tone: "err" as const, text: "Trình duyệt đã chặn. Mở 🔒 → Cho phép thông báo → tải lại trang." }
    : inIframe
    ? { tone: "warn" as const, text: "Đang chạy trong iframe — mở app trong tab thật để bật." }
    : !isReady
    ? { tone: "warn" as const, text: "Đang tải OneSignal SDK…" }
    : { tone: "warn" as const, text: "Chưa bật. Bật toggle để nhận thông báo." };

  const statusBorder =
    status.tone === "ok"
      ? "border-primary/40 bg-primary/10"
      : status.tone === "err"
      ? "border-destructive/40 bg-destructive/10"
      : "border-warning/40 bg-warning/10";
  const StatusIcon = status.tone === "ok" ? CheckCircle2 : AlertTriangle;

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
                  Trình duyệt chặn Service Worker / Push trong iframe editor.
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
                Thông báo
              </Label>
              <p className="text-xs text-muted-foreground">
                Nhận thông báo trực tiếp trên thiết bị (như Zalo) khi có @mention, lead cần follow-up,
                duyệt đơn nghỉ phép, v.v.
              </p>
            </div>
          </div>
          <Switch
            id="push-toggle"
            checked={isSubscribed}
            onCheckedChange={handleToggle}
            disabled={loading || !isReady || permission === "denied" || inIframe}
          />
        </div>

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
              SDK: <strong>{isReady ? "sẵn sàng" : "đang tải"}</strong> · Quyền: <strong>{permission}</strong>
            </p>
          </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-1 border-t border-border/50">
          <p className="text-[11px] text-muted-foreground">
            Bấm để hệ thống gửi 1 push thử và hiển thị kết quả thật từ OneSignal.
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleTestPush}
            disabled={testing}
            className="shrink-0"
          >
            {testing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
            Gửi thử push
          </Button>
        </div>
      </div>
    </div>
  );
}
