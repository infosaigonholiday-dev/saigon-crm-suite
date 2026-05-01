/**
 * Trả về base URL chuẩn cho mọi auth callback (reset password, email confirm...).
 *
 * Thứ tự ưu tiên:
 *  1. VITE_APP_URL (cứng từ build production)
 *  2. window.location.origin (nếu KHÔNG phải localhost/127.0.0.1)
 *  3. https://app.saigonholiday.vn (khi đang chạy production build hoặc trên mobile)
 *  4. window.location.origin (cuối cùng — dev local)
 *
 * KHÔNG hardcode URL ở nơi khác. Mọi chỗ cần base URL phải gọi hàm này.
 */
const PRODUCTION_URL = "https://app.saigonholiday.vn";

function isLocalOrigin(origin: string): boolean {
  return /localhost|127\.0\.0\.1/i.test(origin);
}

function isMobileUA(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
}

export function getAppBaseUrl(): string {
  // 1. Env override (build prod sẽ có VITE_APP_URL)
  const envUrl = import.meta.env.VITE_APP_URL as string | undefined;
  if (envUrl && envUrl.trim()) {
    return envUrl.replace(/\/+$/, "");
  }

  // 2. Origin hiện tại nếu không phải local
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    if (origin && !isLocalOrigin(origin)) {
      return origin;
    }

    // 3. Fallback production khi đang prod build hoặc mobile UA
    if (import.meta.env.PROD || isMobileUA()) {
      return PRODUCTION_URL;
    }

    // 4. Dev local
    return origin;
  }

  // SSR/edge fallback
  return PRODUCTION_URL;
}
