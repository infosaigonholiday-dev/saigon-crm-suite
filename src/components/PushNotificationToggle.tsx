import { Bell, BellOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { toast } from "sonner";

export function PushNotificationToggle() {
  const { isSupported, isSubscribed, permission, loading, subscribe, unsubscribe } =
    usePushSubscription();

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
      } else if (r.error === "denied") {
        toast.error("Trình duyệt đã chặn quyền thông báo. Mở 🔒 trên thanh địa chỉ → Cho phép.");
      } else {
        toast.error("Không thể bật thông báo. Vui lòng thử lại.");
      }
    } else {
      const r = await unsubscribe();
      if (r.ok) toast.success("Đã tắt thông báo Web Push trên thiết bị này");
    }
  };

  return (
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
          disabled={loading || permission === "denied"}
        />
      </div>
    </div>
  );
}
