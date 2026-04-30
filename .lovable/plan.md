## Bug root cause

`/reset-password` rerun-exchange-code race:

1. Supabase Go API redirects back to `https://app.saigonholiday.vn/reset-password?code=XXX` (PKCE flow).
2. `supabase-js` v2 với `detectSessionInUrl: true` (mặc định) **tự động** exchange `?code=XXX` ngay khi import client → fires `SIGNED_IN` → `AuthContext` set session.
3. `ResetPassword.tsx` `useEffect` đọc lại `?code=XXX` từ `window.location.search` (URL chưa được clean) và gọi `supabase.auth.exchangeCodeForSession(code)` lần thứ hai.
4. Code đã bị consumed → trả lỗi `invalid request: code verifier not found / Auth session missing` → component gọi `markExpired(error.message)` → hiện màn "Liên kết không hợp lệ".

User thấy: bấm link Gmail → màn báo "Liên kết đã hết hạn", dù link còn fresh và session thực ra đã được tạo thành công.

Phụ trợ: nếu user đã login trên cùng browser, supabase tự exchange xong nhưng URL còn `?code=` → màn báo lỗi vẫn hiện ra che mất form.

## Phạm vi sửa

### 1. `src/pages/ResetPassword.tsx` — Sửa logic init

Bỏ việc tự gọi `exchangeCodeForSession`. Thay bằng:

- Lắng nghe `onAuthStateChange` cho 2 events: `PASSWORD_RECOVERY` (hash flow) và `SIGNED_IN` (PKCE flow — supabase-js tự exchange xong sẽ fire event này).
- Trên mount: `await supabase.auth.getSession()`. Nếu đã có session → ready ngay.
- Nếu URL có `?code=` hoặc hash `type=recovery` mà chưa có session → đợi event tối đa 8s rồi mới mark expired.
- Sau khi mark ready, dùng `window.history.replaceState` để xóa `?code=...` khỏi URL (tránh re-trigger nếu user F5).
- Thông điệp expired bằng tiếng Việt, không paste raw error message từ Supabase (gây hoang mang khi nó là "Auth session missing").
- Sau khi `updateUser({ password })` thành công: cập nhật `must_change_password=false`, `signOut`, redirect về `/login` kèm toast "Đã đổi mật khẩu thành công, vui lòng đăng nhập lại".

### 2. `src/contexts/AuthContext.tsx` — Không phá flow recovery

Hiện tại `RECOVERY_PATHS` đã bao gồm `/reset-password` nên `SIGNED_OUT` sau khi user submit không bị toast "Phiên kết thúc". Giữ nguyên. Bổ sung:

- Trong `onAuthStateChange`, nếu `event === "PASSWORD_RECOVERY"` thì **không** chạy `syncAuthState` (tránh trigger query profiles → mustChangePassword redirect). Để `ResetPassword.tsx` xử lý độc lập.
- Trên path `/reset-password`, **không** redirect về `/first-login-change-password` cả khi `mustChangePassword=true`. (`ProtectedRoutes` không bao `/reset-password` rồi, nhưng phòng trường hợp user đã có session active mở link recovery.)

### 3. `src/lib/authRedirect.ts` — Giữ nguyên

`getResetPasswordUrl()` đã trả `${window.location.origin}/reset-password`, đúng cho cả production `app.saigonholiday.vn`, published `saigon-holiday-nexus.lovable.app`, và preview `id-preview--*.lovable.app`.

### 4. Supabase Auth URL Configuration — Người dùng cần verify

Đây là cấu hình ngoài code, AI không tự sửa được. Sau khi push code, user cần vào
**Supabase Dashboard → Authentication → URL Configuration** và đảm bảo:

- **Site URL:** `https://app.saigonholiday.vn`
- **Redirect URLs** chứa đầy đủ:
  - `https://app.saigonholiday.vn/reset-password`
  - `https://app.saigonholiday.vn/**` (wildcard cho phép mọi sub-path)
  - `https://saigon-holiday-nexus.lovable.app/reset-password`
  - `https://saigon-holiday-nexus.lovable.app/**`
  - `https://id-preview--1632605d-2e2c-4155-8254-0b9de359ce51.lovable.app/reset-password`

Nếu Redirect URL không khớp, Supabase sẽ silently fallback về Site URL và link Gmail sẽ về `/` thay vì `/reset-password` → user thấy như "không vào được màn đổi mật khẩu". Sẽ liệt kê link dashboard cho user click sau khi apply code.

### 5. Email template `recovery.tsx` — Không cần sửa

Đã dùng `{confirmationUrl}` (chính là `payload.data.url` từ webhook), Supabase build sẵn URL `…/auth/v1/verify?token=…&type=recovery&redirect_to=…`. Không can thiệp.

## Acceptance test sau khi sửa

- Gmail → click link → mở thẳng form đổi mật khẩu (không hiện "Liên kết không hợp lệ", không bị đá về `/login`).
- Đổi mật khẩu → toast thành công → quay về `/login` → đăng nhập bằng mật khẩu mới OK.
- Mở lại link cũ sau khi đã đổi → màn báo "Liên kết đã hết hạn hoặc đã được sử dụng. Vui lòng yêu cầu gửi lại." kèm nút "Quay về đăng nhập".
- Mở link trong tab ẩn danh trong khi link còn hạn → form đổi mật khẩu hiện ra bình thường.
- Test cả production `app.saigonholiday.vn` và preview Lovable.
