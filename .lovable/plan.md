## Mục tiêu
Sửa dứt điểm lỗi link reset password chứa `localhost` + dựng 3 lớp chống tái phát (helper tập trung, ESLint chặn, doc cấu hình).

## Nguyên nhân thực sự của "localhost trong email"
Code FE đã dùng `getResetPasswordUrl()` đúng (origin hiện tại). Nguyên nhân email vẫn ra `localhost` thường là 1 trong 3:
1. **Supabase Site URL** trong dashboard đang để `http://localhost:3000` → template `{{ .ConfirmationURL }}` build từ Site URL khi `redirectTo` KHÔNG nằm trong Allowlist → fallback về Site URL.
2. `redirectTo` gửi lên không khớp Allowlist → Supabase im lặng dùng Site URL.
3. Edge function `manage-employee-accounts` lấy `origin` từ header request — nếu admin bấm reset từ máy dev (localhost) → email cũng sinh ra localhost.

→ Phải fix cả **cấu hình Supabase** lẫn **code** mới triệt để.

## Phạm vi
- KHÔNG đổi DB / RLS / module khác.
- Sửa: `src/lib/getAppBaseUrl.ts` (mới), `src/lib/authRedirect.ts`, `supabase/functions/manage-employee-accounts/index.ts`, `eslint.config.js`, `.env.production` (mới), `AUTH_CONFIG.md` (mới).
- Hướng dẫn admin chỉnh Supabase dashboard (không tự động được).

## Thay đổi chi tiết

### 1. `src/lib/getAppBaseUrl.ts` (mới)
Hàm duy nhất quyết định base URL cho mọi auth callback:
```text
priority:
  1. import.meta.env.VITE_APP_URL                     (cứng, prod build)
  2. window.location.origin                           (nếu KHÔNG chứa "localhost" và KHÔNG chứa "127.0.0.1")
  3. fallback "https://app.saigonholiday.vn"          (CHỈ khi import.meta.env.PROD || /Mobi|Android|iPhone/.test(navigator.userAgent))
  4. window.location.origin (cuối cùng, dev local)
```

### 2. `src/lib/authRedirect.ts`
Refactor `getResetPasswordUrl()` → gọi `getAppBaseUrl() + "/reset-password"`. Giữ nguyên export name để các call site không phải đổi. `getResetPasswordUrlForEdge` giữ nguyên (edge dùng request origin).

### 3. `supabase/functions/manage-employee-accounts/index.ts`
Đổi cách build `resetRedirectUrl`:
```text
const PRODUCTION_URL = "https://app.saigonholiday.vn";
const origin = req.headers.get("origin") || "";
// Nếu origin là localhost → ép production để email không bao giờ chứa localhost
const safeOrigin = /localhost|127\.0\.0\.1/.test(origin) ? PRODUCTION_URL : (origin || PRODUCTION_URL);
const resetRedirectUrl = `${safeOrigin}/reset-password`;
```

### 4. `.env.production` (mới)
```
VITE_APP_URL=https://app.saigonholiday.vn
```
Vite tự load khi build production → `getAppBaseUrl()` ưu tiên giá trị này.

### 5. `eslint.config.js` — thêm rule chặn hardcode
Thêm vào block `rules`:
```text
"no-restricted-syntax": ["error", {
  "selector": "Literal[value=/localhost:[0-9]+/]",
  "message": "Không hardcode localhost — dùng getAppBaseUrl()"
}]
```
(loại trừ thư mục `src/test/`, `playwright*`, `vite.config.ts` qua `ignores`).

### 6. `AUTH_CONFIG.md` (mới — root)
Ghi rõ:
- Site URL đúng: `https://app.saigonholiday.vn`
- Redirect URLs allowlist (production + Lovable preview + published + localhost dev), mỗi cái thêm `/reset-password` và `/auth/callback`.
- Email template dùng `{{ .ConfirmationURL }}`, **không** tự nối `{{ .SiteURL }}/...`.
- Người duy nhất được đổi cấu hình: Tupun.
- Checklist khi reset link sai domain.

### 7. Hành động cần admin tự làm (KHÔNG tự động)
Supabase Dashboard → **Authentication → URL Configuration**:
- Site URL: `https://app.saigonholiday.vn`
- Redirect URLs (add đủ):
  - `https://app.saigonholiday.vn/reset-password`, `/auth/callback`
  - `https://saigon-holiday-nexus.lovable.app/reset-password`, `/auth/callback`
  - `https://id-preview--1632605d-2e2c-4155-8254-0b9de359ce51.lovable.app/reset-password`, `/auth/callback`
  - `http://localhost:5173/reset-password` (dev only)

Authentication → **Email Templates → Reset Password**: body chứa `{{ .ConfirmationURL }}`, không nối tay `{{ .SiteURL }}`.

### 8. KHÔNG triển khai trong sprint này
- **Bước 7 gốc — Smoke test CI Playwright/GitHub Actions**: dự án Lovable không có pipeline GitHub Actions tự chạy (build/test do Lovable runner). Thêm `.github/workflows` không có hiệu lực. → **Bỏ**, thay bằng test thủ công TC1–TC8 trong DoD và rule ESLint (lớp chống regression khả thi).
- Nếu sau này dự án mirror sang GitHub thật, sẽ bổ sung workflow riêng.

## Test (chạy sau khi triển khai)
- TC1 Login → Quên mật khẩu → email không chứa `localhost`.
- TC2 Click link trên iPhone Safari → vào form reset, không lỗi.
- TC3 Click link Chrome desktop → vào form reset.
- TC4 Admin reset từ Settings (production) → email đúng domain.
- TC5 Admin reset từ Settings (localhost dev) → email VẪN ra production (an toàn).
- TC6 Link đã dùng → màn "Liên kết không hợp lệ".
- TC7 Đổi pass thành công → login OK.
- TC8 Lint: thử commit `const x = "http://localhost:3000"` → ESLint báo lỗi.

## Verify (DoD)
1. Email không còn `localhost`. 2. iPhone mở OK. 3. ESLint chặn hardcode. 4. `AUTH_CONFIG.md` tồn tại + đầy đủ. 5. Build pass 0 error. 6. Edge function fallback safe khi origin = localhost.
