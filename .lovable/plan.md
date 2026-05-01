## Bối cảnh

PKCE flow + `exchangeCodeForSession` + `PASSWORD_RECOVERY` listener + popup hết hạn ĐÃ được implement đầy đủ trong sprint trước (`client.ts`, `ResetPassword.tsx`, `Login.tsx`). Tôi xác nhận bằng grep:

- `flowType: 'pkce'` + `detectSessionInUrl: false` → đã có
- `Login.tsx` đã gọi `resetPasswordForEmail(..., { redirectTo: getResetPasswordUrl() })`
- `ResetPassword.tsx` đã đọc `?code`, gọi `exchangeCodeForSession`, có 4 phase UI

Sprint này chỉ cần **5 chỉnh sửa nhỏ** để khớp 100% BẢNG.

## Thay đổi

### 1. `src/pages/ResetPassword.tsx`

- Thêm `console.log("[reset-password] exchangeCodeForSession success")` sau khi PKCE exchange thành công (Verify #3).
- Thêm "delay tối thiểu 2s" cho phase `verifying` để chống flash trên iOS chậm (UI #1): track `startedAt`, nếu resolve sớm hơn 2s thì `setTimeout` phần còn lại.
- **TC5**: nếu URL không có `?code`, không có hash token, KHÔNG có session → `navigate("/login", { replace: true })` thay vì hiển thị phase `expired`. Phase `expired` CHỈ dành cho link đã dùng / hết hạn (có `error_description` hoặc `exchangeCodeForSession` fail).
- Phase `expired`: thêm nút thứ 2 **"Yêu cầu gửi lại link"** → `navigate("/login")` và pre-open dialog Quên mật khẩu (đặt query `?forgot=1`).

### 2. `src/pages/Login.tsx`

- `useEffect` đọc `searchParams.get("forgot") === "1"` → tự động `setForgotOpen(true)` để hỗ trợ flow "Yêu cầu lại" từ ResetPassword.

### 3. `AUTH_CONFIG.md`

- Thêm section **"7. Auth Flow"** ghi rõ:
  > Project dùng **PKCE flow** (`flowType: 'pkce'` trong `supabase/client.ts`). Email reset link có dạng `?code=xxx` (không phải `#access_token=`) — bắt buộc để iOS Safari/Gmail không strip URL fragment.

### 4. Không đổi

- `client.ts`: giữ nguyên (đã PKCE).
- DB schema: không đổi.
- Edge functions: không đổi.

## Test sau khi sửa

| TC | Hành vi mong đợi |
|---|---|
| TC1 iOS Safari/Gmail | Link `?code=...` → spinner 2s → form đổi pass |
| TC2 Android Chrome | Form đổi pass |
| TC3 Desktop | Form đổi pass + console log "exchangeCodeForSession success" |
| TC4 Link đã dùng | Phase `expired` + 2 nút (Đăng nhập / Yêu cầu lại) |
| TC5 Vào `/reset-password` trực tiếp | Redirect `/login` ngay |

## File chạm

- `src/pages/ResetPassword.tsx` (chính)
- `src/pages/Login.tsx` (auto-open forgot dialog khi `?forgot=1`)
- `AUTH_CONFIG.md` (thêm section PKCE)
