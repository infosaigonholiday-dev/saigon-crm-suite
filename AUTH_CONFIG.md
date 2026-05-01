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

**KHÔNG cần** sửa template Reset Password trong Supabase Dashboard. Toàn bộ link recovery được override bởi edge function `auth-email-hook` (file `supabase/functions/auth-email-hook/index.ts`).

Cụ thể: với `emailType === 'recovery'`, hook bỏ qua `payload.data.url` (link `https://aneazkhnqkkpqtcxunqd.supabase.co/auth/v1/verify?token=pkce_...`) và build link app trực tiếp:
```
https://app.saigonholiday.vn/reset-password?token_hash=<RAW_PKCE_TOKEN>&type=recovery
```

Lý do: link `/auth/v1/verify` redirect qua Supabase rồi consume token → FE chỉ nhận UUID code, không phải token_hash gốc → `verifyOtp` fail. Override này gửi token_hash GỐC từ email thẳng vào FE → cross-device an toàn (không cần code_verifier ở localStorage), iOS Safari ITP không block (không có cross-domain redirect).

Nếu Tupun lỡ sửa template Dashboard cũng không sao — `auth-email-hook` vẫn override. Giữ Dashboard ở mặc định (`{{ .ConfirmationURL }}`) để đỡ nhầm lẫn.

❌ KHÔNG bao giờ tự nối `{{ .SiteURL }}/...` thủ công trong template — sẽ mất `token_hash`.

⚠️ **Điều kiện bắt buộc để override hoạt động**: Auth Email Hook PHẢI active. Kiểm tra: vào **Cloud → Emails** trong Lovable, đảm bảo domain `notify.app.saigonholiday.vn` ở trạng thái `active` (DNS verified). Nếu hook không active, Supabase sẽ gửi email mặc định (link `supabase.co/auth/v1/verify`) → bug cross-device tái xuất.

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

### ⚠️ KIẾN TRÚC RESET PASSWORD — DO NOT MODIFY

Sprint 02/05/2026: chuyển hoàn toàn sang Resend + edge function tự custom, KHÔNG còn dùng Supabase Auth Email flow cho recovery. Lý do: Supabase Free plan không cho dùng Auth Hook reliably + iOS cross-device fail với PKCE.

❌ TUYỆT ĐỐI KHÔNG:
- Gọi `supabase.auth.resetPasswordForEmail()` ở `Login.tsx` (hoặc bất kỳ đâu trong FE)
- Bật "Send email hook" trong Supabase Dashboard → Auth → Hooks
- Sửa Email Template "Reset Password" trong Supabase Dashboard
- Dùng `exchangeCodeForSession()` trong `ResetPassword.tsx`
- Set `flowType: 'pkce'` cho recovery flow (PKCE chỉ dùng cho login chính)
- Dùng link dạng `https://<ref>.supabase.co/auth/v1/verify?token=pkce_...`

✅ PHẢI:
- `Login.tsx` → `supabase.functions.invoke('send-recovery-email', { body: { email } })`
- `ResetPassword.tsx` → `supabase.auth.verifyOtp({ token_hash, type: 'recovery' })`
- Email gửi từ Resend, From: `Saigon Holiday CRM <noreply@saigonholiday.vn>`
- Link format: `https://app.saigonholiday.vn/reset-password?token_hash=<hash>&type=recovery`

Vi phạm sẽ bị chặn bởi: ESLint rule (`eslint.config.js` — block files `Login.tsx` + `ResetPassword.tsx`), Playwright e2e (`tests/auth/reset-password.spec.ts`), và edge function `check-auth-health` (gọi thủ công khi nghi ngờ regression).

---


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

### 7.2 Các nhánh `/reset-password` xử lý

`ResetPassword.tsx` **CHỈ dùng `verifyOtp`** cho mọi token trong URL — KHÔNG còn `exchangeCodeForSession` (đã xóa hoàn toàn vì PKCE fail cross-device với lỗi `invalid flow state, flow state has expired` / 422 `?grant_type=pkce`).

| # | URL trả về | Cách xử lý |
|---|---|---|
| 0 | `?token_hash=...` HOẶC `?token=...` HOẶC `?code=...` | **`verifyOtp({ token_hash: <bất kỳ>, type: 'recovery' })`** — path duy nhất |
| 1 | `#access_token=...&refresh_token=...` | `setSession(...)` |
| 2 | `/reset-password` (đã có session) | đợi `PASSWORD_RECOVERY` trong `MIN_VERIFY_MS` (5000ms) |
| 3 | URL trần, không session, không param | redirect `/login` |
| 4 | có `error_description` / `error` | `phase = expired` |

Quy tắc bắt buộc:
- `onAuthStateChange` PHẢI subscribe **trước** khi parse URL (race condition safety).
- `MIN_VERIFY_MS = 5000ms` cho iOS chậm.
- Giữ `flowType: 'pkce'` + `detectSessionInUrl: false` ở `client.ts` — không đổi (login flow vẫn cần PKCE).

❌ KHÔNG được thêm lại `exchangeCodeForSession` ở ResetPassword — sẽ lặp lại bug cross-device.

---
_Cập nhật lần cuối: 02/05/2026 — sprint Fix Reset Password Cross-Device (chuyển recovery sang verifyOtp(token_hash), giữ PKCE cho login)._
