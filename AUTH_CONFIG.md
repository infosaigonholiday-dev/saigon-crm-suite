# AUTH_CONFIG — Cấu hình Auth của Saigon Holiday CRM

> File này là **nguồn sự thật** về cấu hình Auth. Chỉ **Tupun (Admin)** được phép sửa cấu hình Supabase Auth. Mọi đổi cấu hình PHẢI cập nhật file này cùng commit.

## 1. Site URL (Supabase → Authentication → URL Configuration)

```
https://app.saigonholiday.vn
```

❌ KHÔNG bao giờ để `http://localhost:*` ở môi trường production.

## 2. Redirect URLs Allowlist (PHẢI add đủ tất cả)

Production:
- `https://app.saigonholiday.vn/reset-password`
- `https://app.saigonholiday.vn/auth/callback`

Lovable Published:
- `https://saigon-holiday-nexus.lovable.app/reset-password`
- `https://saigon-holiday-nexus.lovable.app/auth/callback`

Lovable Preview:
- `https://id-preview--1632605d-2e2c-4155-8254-0b9de359ce51.lovable.app/reset-password`
- `https://id-preview--1632605d-2e2c-4155-8254-0b9de359ce51.lovable.app/auth/callback`

Dev local (chỉ giữ khi cần test):
- `http://localhost:5173/reset-password`

> Quy tắc: nếu `redirectTo` gửi lên KHÔNG có trong allowlist, Supabase sẽ âm thầm fallback về Site URL → đây là nguyên nhân #1 sinh ra link `localhost` trong email.

## 3. Email Template — Reset Password

Body PHẢI dùng biến chuẩn của Supabase:
```
{{ .ConfirmationURL }}
```

❌ KHÔNG tự nối `{{ .SiteURL }}/...` — sẽ phá flow PKCE và dễ rớt query params.

## 4. Code rules (đã enforce)

- Mọi nơi cần base URL → gọi `getAppBaseUrl()` từ `src/lib/getAppBaseUrl.ts`.
- Mọi nơi cần URL reset password → gọi `getResetPasswordUrl()` từ `src/lib/authRedirect.ts`.
- ESLint rule `no-restricted-syntax` chặn literal `localhost:<port>` trong `src/`.
- Edge function `manage-employee-accounts`: nếu request origin là localhost → ép thành production trước khi build link.

## 5. Checklist khi báo "link reset chứa localhost"

1. Mở Supabase → Authentication → URL Configuration → kiểm Site URL = `https://app.saigonholiday.vn`.
2. Kiểm Redirect URLs allowlist có đủ mục #2 ở trên.
3. Kiểm template Reset Password → body có `{{ .ConfirmationURL }}` (không phải `{{ .SiteURL }}`).
4. Kiểm `.env.production` có `VITE_APP_URL=https://app.saigonholiday.vn`.
5. Chạy `bun run lint` → không có cảnh báo `no-restricted-syntax`.

## 6. Người được phép thay đổi

- **Tupun (ADMIN)** — duy nhất.
- Mọi yêu cầu đổi Site URL / Redirect URLs / Template phải có ticket + ghi log vào file này.

---
_Cập nhật lần cuối: 01/05/2026 — sprint Fix Reset Password + Anti-Regression Guard._
