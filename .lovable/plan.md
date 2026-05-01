# Plan: Recovery Email qua Resend (bypass Supabase Auth Hook)

## Bối cảnh
- Supabase Free plan → không enable được Send Email Hook native.
- Domain `saigonholiday.vn` đã verified trên Resend (DKIM/SPF/MX OK).
- API key đã có: `re_cYy59t8X_L3fxGPZQckKbLvVQzxkLKYdD` → sẽ lưu vào Supabase Edge Function Secrets.

## Việc sẽ làm

### 1. Tạo edge function mới `send-recovery-email`
File: `supabase/functions/send-recovery-email/index.ts`

Logic:
- Nhận `{ email }` từ frontend (public, no JWT — vì user chưa login).
- Validate email bằng Zod.
- Dùng service_role client gọi `supabase.auth.admin.generateLink({ type: 'recovery', email, options: { redirectTo: 'https://app.saigonholiday.vn/reset-password' } })`.
- Nếu user không tồn tại → vẫn return 200 (chống user enumeration), KHÔNG gửi mail.
- Render HTML template tiếng Việt brand Saigon Holiday (màu #E8963A, link recovery).
- POST trực tiếp `https://api.resend.com/emails` với header `Authorization: Bearer ${RESEND_API_KEY}`, From: `Saigon Holiday CRM <noreply@saigonholiday.vn>`.
- Log vào console (Edge Function logs) để debug.
- Rate limit nhẹ: 1 request / email / 60s (in-memory Map, đủ cho phase này).
- `verify_jwt = false` trong `supabase/config.toml`.

### 2. Sửa `src/pages/Login.tsx`
- Tìm handler "Quên mật khẩu" hiện tại đang gọi `supabase.auth.resetPasswordForEmail(...)`.
- Đổi sang `supabase.functions.invoke('send-recovery-email', { body: { email } })`.
- Toast tiếng Việt: "Nếu email tồn tại, link reset đã được gửi. Vui lòng kiểm tra hộp thư (kể cả Spam)."

### 3. Sửa `src/pages/ResetPassword.tsx` (nếu cần)
- Verify route đã handle `?token_hash=...&type=recovery` qua `supabase.auth.verifyOtp({ token_hash, type: 'recovery' })`.
- Nếu chưa, bổ sung.

### 4. Add secret `RESEND_API_KEY`
- Trigger UI add_secret cho anh paste key vào.

## Sau khi code xong — hướng dẫn anh

### A. Add RESEND_API_KEY
Em sẽ trigger dialog → anh paste `re_cYy59t8X_L3fxGPZQckKbLvVQzxkLKYdD` → Save. Edge function tự pickup.

### B. Xóa hook Supabase Dashboard
1. https://supabase.com/dashboard/project/aneazkhnqkkpqtcxunqd/auth/hooks
2. Tìm "Send Email Hook" → toggle OFF → Save.
3. Xác nhận status: Disabled.

### C. Test plan
1. **Desktop Chrome**: Login page → Quên mật khẩu → nhập email admin → check inbox → click link → đổi password → login lại.
2. **iPhone Safari**: Mở app.saigonholiday.vn → Quên mật khẩu → mở mail trong Mail app → click link → confirm mở đúng Safari → reset OK.
3. **iPhone Gmail app**: Tương tự, click link trong Gmail app → confirm chuyển sang Safari/in-app browser → reset OK.
4. Check Edge Function logs: `send-recovery-email` có log `email sent successfully, resend_id=...`.
5. Check Resend dashboard → Emails → thấy delivery status `Delivered`.

## Kỹ thuật chi tiết
- Edge function dùng `verify_jwt = false` (public endpoint).
- `generateLink` trả về `action_link` chứa `token_hash` — em parse và build URL `https://app.saigonholiday.vn/reset-password?token_hash=...&type=recovery`.
- CORS: allow origin `*` (hoặc whitelist `app.saigonholiday.vn` + preview).
- Error handling: log đủ chi tiết nhưng response ra ngoài chỉ generic message.

Confirm "OK" → em switch build mode và code ngay.