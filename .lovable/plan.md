## Bug đã xác nhận

URL hiện tại trong email: `https://<project>.supabase.co/auth/v1/verify?token=pkce_xxx&type=recovery&redirect_to=https://app.saigonholiday.vn/reset-password`

Quy trình PKCE yêu cầu **code_verifier** lưu ở `localStorage` của **chính device** đã gọi `resetPasswordForEmail`. Khi user gửi email từ Desktop nhưng click link trên iPhone → iPhone không có `code_verifier` → `exchangeCodeForSession` luôn fail → phase `expired`.

Đây là hạn chế cố hữu của PKCE và **không phù hợp với password recovery** (vốn cross-device là use-case chính).

## Giải pháp

Chuyển recovery flow sang **`verifyOtp({ token_hash, type: 'recovery' })`**. OTP token tự nó đã là proof of possession (chỉ ai có inbox mới đọc được), không cần code_verifier. Vẫn **giữ nguyên `flowType: 'pkce'`** cho login flow chính.

Cách triển khai:
- **Email template** đổi link đích: thay vì dùng `payload.data.url` (link `/auth/v1/verify?token=pkce_...`), build link trực tiếp về app: `https://app.saigonholiday.vn/reset-password?token_hash={hash}&type=recovery`. Bỏ qua hoàn toàn endpoint `/auth/v1/verify` cho recovery → không bị Supabase tự áp PKCE.
- **`ResetPassword.tsx`** mount logic mới (theo thứ tự ưu tiên):
  1. Nếu URL có `?token_hash=` + `?type=recovery` → gọi `supabase.auth.verifyOtp({ token_hash, type: 'recovery' })`. **Đây là path chính cho mọi case (same/cross-device)**.
  2. Nếu URL có `?code=` (legacy / PKCE same-device) → thử `exchangeCodeForSession`, nếu fail vì code_verifier → fallback expired (vẫn để code này phòng email cũ chưa hết hạn).
  3. Nếu URL có `#access_token=...&refresh_token=...` (implicit fallback) → `setSession`.
  4. Đã có session sẵn → ready.
  5. URL trần → /login sau `MIN_VERIFY_MS`.
  6. Có dấu hiệu callback nhưng thiếu cả `token_hash` và `code` → expired.
- **`onAuthStateChange`** subscribe trước parse URL để bắt event `PASSWORD_RECOVERY` mà `verifyOtp` fire (race condition safety).

## Files thay đổi

1. **`supabase/functions/auth-email-hook/index.ts`** — chỉ cho `emailType === 'recovery'`: override `confirmationUrl` thành `https://app.saigonholiday.vn/reset-password?token_hash={payload.data.token_hash}&type=recovery`. Các loại email khác (signup, invite, magic link, email_change) **giữ nguyên** `payload.data.url` để không phá flow khác.
2. **`src/pages/ResetPassword.tsx`** — thêm nhánh `token_hash + type=recovery` ưu tiên cao nhất, gọi `verifyOtp`. Giữ các nhánh `code`, `hash`, `session`, fallback hiện tại làm safety net.
3. **`src/integrations/supabase/client.ts`** — **KHÔNG đổi**. Vẫn `flowType: 'pkce'` + `detectSessionInUrl: false`.
4. **`src/pages/Login.tsx`** — **KHÔNG đổi**. `resetPasswordForEmail(email, { redirectTo: getResetPasswordUrl() })` giữ nguyên.
5. **`AUTH_CONFIG.md`** — cập nhật mục #7: ghi rõ "Recovery flow dùng `verifyOtp({ token_hash, type: 'recovery' })`, không phụ thuộc PKCE storage. Email template build link app trực tiếp, bỏ qua `/auth/v1/verify`."

## Tại sao không sửa client.ts như đề xuất ban đầu

Spec đề xuất phương án "thử `exchangeCodeForSession` trước, fail thì fallback `verifyOtp`". Vấn đề: với URL hiện tại `?token=pkce_xxx` từ Supabase verify endpoint, sau khi Supabase verify xong nó **chỉ trả về `?code=`** (PKCE) hoặc **không trả gì** (case c đã document) — token gốc đã bị Supabase nuốt, FE không còn `token_hash` để gọi `verifyOtp`. **Bắt buộc phải sửa email template** để FE nhận được `token_hash` raw.

## Verify checklist

```text
TC1 cross-device: Desktop → click iPhone Safari → form đổi pass HIỆN
TC2 cross-device: Desktop → click iPhone Gmail app → form HIỆN
TC3 same-device: Desktop → Desktop → OK
TC4 same-device: iPhone → iPhone → OK
TC5 click link cũ (đã verify hoặc >60s) → expired đúng
TC6 vào /reset-password trần → redirect /login
TC7 console log "[reset-password] verifyOtp success" khi click link valid
TC8 console KHÔNG còn lỗi "code verifier" / "invalid code"
```

## Không làm

- Không bỏ PKCE cho login flow chính.
- Không sửa Site URL / Redirect URLs allowlist.
- Không đổi template các email khác (signup/invite/magiclink/email_change).
- Không xoá nhánh `?code=` ở `ResetPassword.tsx` — giữ làm safety net cho email pending trong inbox user.
