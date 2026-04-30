import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, ShieldOff, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  /** Loại entity hiển thị tiếng Việt: "Lead", "Khách hàng", "Booking", ... */
  kind: string;
  /** Lý do: 'not_found' (đã xoá/huỷ) hoặc 'forbidden' (RLS chặn) */
  reason?: "not_found" | "forbidden";
  /** Đường về danh sách. Nếu không truyền → navigate(-1) */
  backTo?: string;
  /** Nhãn nút quay lại */
  backLabel?: string;
}

/**
 * Hiển thị thông báo "graceful 404" thay vì 404 thô khi:
 * - Entity gốc đã bị xoá / huỷ → reason="not_found"
 * - User không có quyền xem (RLS chặn) → reason="forbidden"
 *
 * Dùng ở các trang detail (CustomerDetail, BookingDetail, ...) khi link
 * trong notification trỏ đến entity user không truy cập được.
 */
export function EntityNotAccessible({
  kind,
  reason = "not_found",
  backTo,
  backLabel = "Quay lại danh sách",
}: Props) {
  const navigate = useNavigate();
  const isForbidden = reason === "forbidden";

  return (
    <div className="container max-w-2xl py-12">
      <Alert variant={isForbidden ? "destructive" : "default"}>
        {isForbidden ? (
          <ShieldOff className="h-5 w-5" />
        ) : (
          <Trash2 className="h-5 w-5" />
        )}
        <AlertTitle>
          {isForbidden
            ? `Bạn không có quyền xem ${kind} này`
            : `${kind} này đã bị xoá hoặc không còn truy cập được`}
        </AlertTitle>
        <AlertDescription className="mt-2 space-y-3">
          <p className="text-sm">
            {isForbidden
              ? `Có thể ${kind.toLowerCase()} đã được chuyển cho người khác hoặc thuộc phạm vi không bao gồm tài khoản của bạn. Liên hệ Quản lý nếu cần truy cập.`
              : `Có thể ${kind.toLowerCase()} đã bị huỷ, đã được hợp nhất hoặc đã bị xoá khỏi hệ thống. Đường dẫn trong thông báo có thể đã hết hạn.`}
          </p>
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
