import { Bell, AlertOctagon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useOneSignal } from "@/hooks/useOneSignal";
import { toast } from "sonner";

/**
 * Section "Thông báo" hiển thị trong trang Hồ sơ cá nhân (EmployeeDetail khi xem bản thân).
 */
export function PushNotificationCard() {
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
      else if (r.error === "iframe") toast.error("Hãy mở app trong tab thật.");
      else if (r.error === "init_failed") toast.error("OneSignal chưa hoạt động. Liên hệ admin.");
      else toast.error("Không thể bật thông báo.");
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
        ) : !configured ? (
          <p className="text-sm text-muted-foreground">
            Hệ thống thông báo đẩy chưa được cấu hình. Liên hệ admin.
          </p>
        ) : initError ? (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3">
            <AlertOctagon className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground">Thông báo chưa hoạt động</p>
              <p className="text-[11px] text-muted-foreground">Liên hệ admin để kiểm tra cấu hình OneSignal.</p>
            </div>
          </div>
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
                  disabled={loading || !isReady || permission === "denied" || inIframe}
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
