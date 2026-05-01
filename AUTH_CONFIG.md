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

## 7. Auth Flow — PKCE cho Login, verifyOtp cho Recovery (BẮT BUỘC)

Project sử dụng **PKCE flow** cho login flow chính, và **verifyOtp(token_hash)** cho password recovery (cross-device safe).

Cấu hình tại `src/integrations/supabase/client.ts`:
```ts
auth: {
  flowType: 'pkce',
  detectSessionInUrl: false, // /reset-password tự xử lý exchangeCodeForSession
}
```

Hệ quả:
- Email reset link có dạng `https://app.saigonholiday.vn/reset-password?code=xxx` (query string).
- KHÔNG dùng dạng cũ `#access_token=...` (hash fragment) — iOS Safari/Gmail thường strip URL fragment khi mở link từ app email → user bị đá về `/login`. PKCE `?code=` không bị strip.
- Trang `/reset-password` đọc `?code` → gọi `supabase.auth.exchangeCodeForSession(code)` → log `[reset-password] exchangeCodeForSession success` khi thành công.

### 7.1 Recovery flow — verifyOtp(token_hash), KHÔNG dùng PKCE

**Vấn đề PKCE với recovery:** PKCE lưu `code_verifier` ở `localStorage` của device đã gọi `resetPasswordForEmail`. Nếu user gửi email từ Desktop nhưng click link trên iPhone → iPhone không có verifier → `exchangeCodeForSession` LUÔN fail. Đây là use-case chính của recovery (cross-device) → PKCE không phù hợp.

**Giải pháp:**
- Edge function `auth-email-hook` (file `supabase/functions/auth-email-hook/index.ts`) override `confirmationUrl` cho `emailType === 'recovery'`: build link app trực tiếp `https://app.saigonholiday.vn/reset-password?token_hash={hash}&type=recovery` thay vì dùng `payload.data.url` (link `/auth/v1/verify?token=pkce_...`).
- `ResetPassword.tsx` ưu tiên đọc `?token_hash=` + `?type=recovery` → gọi `supabase.auth.verifyOtp({ token_hash, type: 'recovery' })`. Token này tự là proof-of-possession (chỉ ai có inbox mới đọc được) → không cần code_verifier → cross-device OK.

### 7.2 Các nhánh fallback `/reset-password` vẫn xử lý

Để tương thích ngược (email pending trong inbox user, hoặc Supabase server version khác), `ResetPassword.tsx` xử lý theo thứ tự ưu tiên:

| # | URL trả về | Cách xử lý |
|---|---|---|
| 0 | `/reset-password?token_hash=...&type=recovery` | **`verifyOtp` — path chính** |
| 1 | `/reset-password?code=xxx` | `exchangeCodeForSession(code)` (legacy PKCE same-device) |
| 2 | `/reset-password#access_token=...&refresh_token=...` | `setSession(...)` |
| 3 | `/reset-password` (không kèm gì) — đã có session | đợi `PASSWORD_RECOVERY` event trong `MIN_VERIFY_MS` (5000ms) |
| 4 | `/reset-password` trần, không session, không param | redirect `/login` |
| 5 | có dấu hiệu callback nhưng thiếu cả `token_hash` và `code` | `phase = expired` |

Quy tắc bắt buộc:
- `onAuthStateChange` PHẢI subscribe **trước** khi parse URL (race condition safety).
- `MIN_VERIFY_MS = 5000ms` cho iOS chậm.
- Giữ `flowType: 'pkce'` + `detectSessionInUrl: false` ở `client.ts` — không đổi (vì login flow vẫn cần PKCE).

❌ KHÔNG xoá nhánh `?code=` ở ResetPassword — giữ làm safety net cho email pending trong inbox của user.

---
_Cập nhật lần cuối: 02/05/2026 — sprint Fix Reset Password Cross-Device (chuyển recovery sang verifyOtp(token_hash), giữ PKCE cho login)._
