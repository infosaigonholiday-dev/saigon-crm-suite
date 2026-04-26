import { BellRing, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { usePushSubscription, type PushSubscribeError } from "@/hooks/usePushSubscription";
import { toast } from "sonner";

const ERROR_MESSAGES: Record<PushSubscribeError, string> = {
  unsupported: "Trình duyệt không hỗ trợ Web Push.",
  iframe: "Đang chạy trong iframe — hãy mở trang trong tab mới.",
  denied: "Trình duyệt đã chặn quyền thông báo. Mở 🔒 trên thanh địa chỉ → Cho phép.",
  sw_unreachable: "Không tải được Service Worker. Vui lòng tải lại trang.",
  sw_register_failed: "Đăng ký Service Worker thất bại.",
  sw_not_active: "Service Worker chưa kích hoạt. Vui lòng tải lại trang.",
  vapid_invalid: "Khoá VAPID không hợp lệ. Liên hệ admin.",
  subscribe_failed: "Trình duyệt từ chối đăng ký push.",
  subscribe_blocked: "Trình duyệt chặn đăng ký push dù đã cấp quyền — hãy mở app ở tab thật, tải lại trang, hoặc tắt extension chặn notification.",
  db_failed: "Lưu đăng ký lên server thất bại.",
  error: "Lỗi không xác định khi bật thông báo.",
};

/**
 * Icon button đặt cạnh NotificationBell trong header.
 * - Chưa bật → icon BellOff màu muted, tooltip "Nhấn để bật thông báo"
 * - Đã bật → icon BellRing màu primary với chấm xanh, tooltip "Đã bật thông báo"
 * - Không hỗ trợ → ẩn hoàn toàn
 */
export function PushToggleButton() {
  const { isSupported, isSubscribed, permission, loading, inIframe, subscribe, unsubscribe } =
    usePushSubscription();

  if (!isSupported) return null;

  const handleClick = async () => {
    if (isSubscribed) {
      const r = await unsubscribe();
      if (r.ok) toast.success("Đã tắt thông báo trên thiết bị này");
      return;
    }
    if (inIframe) {
      toast.error("Hãy mở app trong tab mới (không phải iframe editor) để bật thông báo");
      return;
    }
    if (permission === "denied") {
      toast.error("Trình duyệt đã chặn. Mở 🔒 trên thanh địa chỉ → Cho phép thông báo → tải lại trang.");
      return;
    }
    const r = await subscribe();
    if (r.ok) {
      toast.success("Đã bật thông báo Web Push 🔔");
    } else if (r.error) {
      const msg = ERROR_MESSAGES[r.error] || "Không thể bật thông báo.";
      toast.error(r.detail ? `${msg} (${r.detail})` : msg);
    }
  };

  const tooltipText = isSubscribed
    ? "Đã bật thông báo — nhấn để tắt"
    : permission === "denied"
    ? "Trình duyệt đang chặn — mở 🔒 để cho phép"
    : "Nhấn để bật thông báo";

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClick}
            disabled={loading}
            className="relative"
            aria-label={tooltipText}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isSubscribed ? (
              <>
                <BellRing className="h-5 w-5 text-primary" />
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-success ring-2 ring-card" />
              </>
            ) : (
              <BellOff className="h-5 w-5 text-muted-foreground" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{tooltipText}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
