import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, ShieldOff, Trash2, Ban } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  /** Loại entity hiển thị tiếng Việt: "Lead", "Khách hàng", "Booking", ... */
  kind: string;
  /** Lý do (legacy): 'not_found' (đã xoá/huỷ) hoặc 'forbidden' (RLS chặn) */
  reason?: "not_found" | "forbidden";
  /**
   * Lý do (alias mới — dùng cho TC12/TC13):
   *  - 'forbidden'  → user không có quyền xem (RLS chặn)
   *  - 'cancelled'  → entity tồn tại nhưng đã bị huỷ / nghỉ việc / soft-deleted
   *  - 'not_found'  → entity không còn trong DB
   */
  mode?: "forbidden" | "cancelled" | "not_found";
  /** Đường về danh sách. Nếu không truyền → navigate(-1) */
  backTo?: string;
  /** Nhãn nút quay lại */
  backLabel?: string;
}

/**
 * Hiển thị thông báo "graceful 403/404" thay vì 404 thô khi:
 * - User không có quyền xem (RLS chặn) → mode="forbidden"
 * - Entity tồn tại nhưng đã bị huỷ      → mode="cancelled"
 * - Entity đã bị xoá khỏi hệ thống      → mode="not_found"
 *
 * Dùng ở các trang detail (CustomerDetail, BookingDetail, ...) khi link
 * trong notification trỏ đến entity user không truy cập được.
 */
export function EntityNotAccessible({
  kind,
  reason,
  mode,
  backTo,
  backLabel = "Quay lại danh sách",
}: Props) {
  const navigate = useNavigate();
  // mode mới thắng reason cũ; default = not_found
  const effective: "forbidden" | "cancelled" | "not_found" =
    mode ?? reason ?? "not_found";

  const isForbidden = effective === "forbidden";
  const isCancelled = effective === "cancelled";

  const Icon = isForbidden ? ShieldOff : isCancelled ? Ban : Trash2;
  const variant = isForbidden || isCancelled ? "destructive" : "default";

  const title = isForbidden
    ? `Bạn không có quyền xem ${kind} này`
    : isCancelled
    ? `${kind} này đã bị huỷ`
    : `${kind} này đã bị xoá hoặc không còn truy cập được`;

  const desc = isForbidden
    ? `Có thể ${kind.toLowerCase()} đã được chuyển cho người khác hoặc thuộc phạm vi không bao gồm tài khoản của bạn. Liên hệ Quản lý nếu cần truy cập.`
    : isCancelled
    ? `${kind} này đã chuyển sang trạng thái huỷ / nghỉ việc. Đường dẫn trong thông báo vẫn còn nhưng nội dung không còn được duy trì.`
    : `Có thể ${kind.toLowerCase()} đã bị huỷ, đã được hợp nhất hoặc đã bị xoá khỏi hệ thống. Đường dẫn trong thông báo có thể đã hết hạn.`;

  return (
    <div className="container max-w-2xl py-12">
      <Alert variant={variant}>
        <Icon className="h-5 w-5" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription className="mt-2 space-y-3">
          <p className="text-sm">{desc}</p>
          <p className="text-xs text-muted-foreground">
            Lưu ý: Đường dẫn trong thông báo chỉ là phương tiện điều hướng — trạng
            thái "đã xử lý" của thông báo không phụ thuộc vào việc bạn có truy cập
            được entity này hay không.
          </p>
          <div className="flex gap-2 pt-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {backLabel}
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/canh-bao")}>
              Về Trung tâm cảnh báo
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
