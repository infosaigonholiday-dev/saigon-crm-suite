## Phát hiện quan trọng

Bug KHÔNG nằm ở Supabase Email Template Dashboard. Code hiện tại đã đúng kiến trúc — chỉ chưa được deploy/active.

**Bằng chứng:**
- `supabase/functions/auth-email-hook/index.ts` line 224-228: ĐÃ override `confirmationUrl` cho `emailType === 'recovery'` thành `https://app.saigonholiday.vn/reset-password?token_hash={RAW_TOKEN}&type=recovery` — đây chính xác là giải pháp user yêu cầu.
- Template `recovery.tsx` ĐÃ render `<Button href={confirmationUrl}>` → link trong email = link app trực tiếp.
- `ResetPassword.tsx` ĐÃ chỉ dùng `verifyOtp({ token_hash, type: 'recovery' })`, không còn `exchangeCodeForSession`.
- **Edge function logs trả về EMPTY** → Supabase Auth chưa gọi `auth-email-hook` lần nào → hook chưa active → Supabase đang gửi template mặc định (`supabase.co/auth/v1/verify?token=pkce_...`).

→ Lý do thực sự URL email vẫn `supabase.co/auth/v1/verify?...`: **Auth Email Hook chưa được kích hoạt trên project**. Phải deploy edge function để Lovable Cloud tự động register hook với Supabase Auth.

## Kế hoạch thực thi

### 1. Deploy lại `auth-email-hook`
Force redeploy để Lovable Cloud register Auth Email Hook với Supabase. Sau khi deploy, Supabase Auth sẽ gọi edge function này thay vì gửi email mặc định.

### 2. Verify hook đã active bằng test thực tế
Trigger 1 lần `resetPasswordForEmail` (qua màn `Login → Quên mật khẩu`) → đọc `auth-email-hook` logs:
- Phải thấy log `Received auth event { emailType: 'recovery', ... }`
- Phải thấy log `Auth email enqueued`
- Nếu KHÔNG có log → hook chưa active → cần kiểm tra Cloud → Emails dashboard

### 3. Verify URL trong email mới
Sau khi nhận email reset, URL phải có dạng:
```
https://app.saigonholiday.vn/reset-password?token_hash=pkce_xxxxxxxxxx&type=recovery
```
KHÔNG phải `https://aneazkhnqkkpqtcxunqd.supabase.co/auth/v1/verify?token=pkce_...`.

### 4. Defensive guard trong edge function (phòng trường hợp `token_hash` undefined)
Hiện tại line 226: `if (emailType === 'recovery' && tokenHash)` — nếu Supabase không gửi `token_hash` trong payload thì fallback về `payload.data.url` (link Supabase verify) → bug tái xuất.

Bổ sung: nếu `emailType === 'recovery'` mà `tokenHash` falsy → log warning rõ ràng `[auth-email-hook] WARNING: recovery payload missing token_hash, falling back to default URL — cross-device flow will fail` để debug nhanh nếu sau deploy vẫn lỗi.

### 5. Cập nhật `AUTH_CONFIG.md`
Sửa section #3 (Email Template): xác nhận **KHÔNG cần** sửa template Supabase Dashboard — toàn bộ override link recovery do `auth-email-hook` đảm nhiệm. Ghi rõ Tupun không cần đụng tới Email Templates ở Supabase nữa.

## File thay đổi
- `supabase/functions/auth-email-hook/index.ts` — thêm warning log khi `token_hash` thiếu
- `AUTH_CONFIG.md` — cập nhật ghi chú template
- Deploy `auth-email-hook` qua tool

## Test acceptance
- TC1 iPhone Safari: click link reset từ email mới → form đổi pass hiện ✅
- TC2 iPhone Gmail app: tương tự ✅
- TC3 Desktop Chrome: tương tự ✅
- TC4 Link cũ (đã reset rồi): hiện màn "Liên kết đã hết hạn" ✅
- Edge function logs có entry `Received auth event { emailType: 'recovery' }` ✅
- URL email là `app.saigonholiday.vn/reset-password?token_hash=...` (KHÔNG qua `supabase.co`) ✅

## Lưu ý cho Tupun
Sau khi tôi deploy xong, Tupun **KHÔNG cần** vào Supabase Dashboard sửa Email Template. Nếu hook không active sau deploy, sẽ phải vào **Cloud → Emails** trong Lovable kiểm tra trạng thái domain `notify.app.saigonholiday.vn` đã verified chưa.
