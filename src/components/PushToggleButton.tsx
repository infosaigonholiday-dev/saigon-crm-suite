import { BellRing, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useOneSignal } from "@/hooks/useOneSignal";
import { toast } from "sonner";

/**
 * Icon button đặt cạnh NotificationBell trong header.
 * - Chưa bật → BellOff màu muted
 * - Đã bật → BellRing màu primary với chấm xanh
 * - Trình duyệt không hỗ trợ hoặc chưa cấu hình OneSignal → ẩn
 */
export function PushToggleButton() {
  const { isSupported, configured, isSubscribed, permission, loading, inIframe, subscribe, unsubscribe } =
    useOneSignal();

  if (!isSupported || !configured) return null;

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
      toast.success("Đã bật thông báo 🔔");
    } else if (r.error === "denied") {
      toast.error("Bạn đã từ chối quyền thông báo.");
    } else {
      toast.error("Không thể bật thông báo. Hãy thử tải lại trang.");
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
