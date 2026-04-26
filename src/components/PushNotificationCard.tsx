import { Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
 * Section "Thông báo" hiển thị trong trang Hồ sơ cá nhân (EmployeeDetail khi xem bản thân).
 */
export function PushNotificationCard() {
  const { isSupported, isSubscribed, permission, loading, inIframe, subscribe, unsubscribe } =
    usePushSubscription();

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      const r = await subscribe();
      if (r.ok) {
        toast.success("Đã bật thông báo Web Push trên thiết bị này");
      } else if (r.error) {
        const msg = ERROR_MESSAGES[r.error] || "Không thể bật thông báo.";
        toast.error(r.detail ? `${msg} (${r.detail})` : msg);
      }
    } else {
      const r = await unsubscribe();
      if (r.ok) toast.success("Đã tắt thông báo trên thiết bị này");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          Thông báo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isSupported ? (
          <p className="text-sm text-muted-foreground">
            Trình duyệt không hỗ trợ. Vui lòng dùng Chrome / Edge / Firefox trên máy tính hoặc Android.
            Trên iPhone cần cài app vào màn hình chính (PWA).
          </p>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <Label htmlFor="profile-push-toggle" className="text-sm font-medium cursor-pointer">
                  Thông báo trình duyệt
                </Label>
                <p className="text-xs text-muted-foreground">
                  Nhận thông báo trực tiếp trên thiết bị này khi có @mention, lead cần follow-up,
                  sinh nhật khách hàng, v.v.
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <Switch
                  id="profile-push-toggle"
                  checked={isSubscribed}
                  onCheckedChange={handleToggle}
                  disabled={loading || permission === "denied" || inIframe}
                />
                {isSubscribed ? (
                  <Badge variant="outline" className="bg-success/15 text-success border-success/30">
                    Đã bật
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-muted text-muted-foreground">
                    Chưa bật
                  </Badge>
                )}
              </div>
            </div>
            {permission === "denied" && (
              <p className="text-xs text-destructive">
                Bạn đã chặn quyền thông báo. Mở biểu tượng 🔒 trên thanh địa chỉ → Cho phép thông báo → tải lại trang.
              </p>
            )}
            {inIframe && (
              <p className="text-xs text-muted-foreground">
                Đang chạy trong iframe editor — hãy mở app trong tab riêng để bật thông báo.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
