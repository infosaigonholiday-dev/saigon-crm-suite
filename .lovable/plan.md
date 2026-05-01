# Fix Reset Password — Xóa hoàn toàn `exchangeCodeForSession`

## Vấn đề
Console hiện log `[reset-password] exchangeCodeForSession failed AuthApiError: invalid flow state, flow state has expired` + Network 422 `?grant_type=pkce`. Nguyên nhân: `ResetPassword.tsx` vẫn còn nhánh fallback gọi `exchangeCodeForSession(code)` cho URL `?code=...`. Cross-device → không có `code_verifier` ở localStorage → 422.

Theo yêu cầu: **XÓA HOÀN TOÀN** mọi `exchangeCodeForSession`, chỉ dùng `verifyOtp` cho mọi loại token có trong URL.

## Thay đổi — chỉ 1 file: `src/pages/ResetPassword.tsx`

### 1. Xóa nhánh `if (code) { exchangeCodeForSession(code) ... }`
Toàn bộ block xử lý PKCE bị xóa.

### 2. Hợp nhất 3 tên param URL về cùng 1 nhánh `verifyOtp`
Đọc theo thứ tự ưu tiên: `token_hash` → `token` → `code` (Supabase đặt tên khác nhau tùy version/loại email).

```ts
const tokenFromUrl =
  url.searchParams.get("token_hash") ||
  url.searchParams.get("token") ||
  url.searchParams.get("code");
const otpType = url.searchParams.get("type") || "recovery"; // mặc định recovery cho /reset-password

if (tokenFromUrl) {
  console.log("[reset-password] verifyOtp called with token_hash");
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenFromUrl,
    type: "recovery",
  });
  if (error) {
    console.warn("[reset-password] verifyOtp failed", error);
    const lower = (error.message || "").toLowerCase();
    const friendly = lower.includes("expired") || lower.includes("invalid") || lower.includes("otp")
      ? "Liên kết đã hết hạn hoặc đã được sử dụng. Vui lòng yêu cầu gửi lại."
      : "Liên kết không hợp lệ. Vui lòng yêu cầu gửi lại.";
    markExpired(friendly);
  } else {
    console.log("[reset-password] verifyOtp success");
    markReady();
  }
  return;
}
```

### 3. Giữ nguyên các nhánh khác
- `onAuthStateChange` listener (subscribe trước khi parse URL) — fallback PASSWORD_RECOVERY/SIGNED_IN.
- Nhánh `#access_token=&refresh_token=` → `setSession()`.
- Nhánh đã có session → `markReady()`.
- Nhánh URL trần → `MIN_VERIFY_MS=5000ms` rồi redirect `/login`.
- Nhánh có `error_description` → `markExpired` với message tiếng Việt.

### 4. Kiểm tra lint
Đảm bảo không còn chuỗi `exchangeCodeForSession` trong file (grep verify sau khi sửa).

## Files KHÔNG đổi
- `src/integrations/supabase/client.ts` (giữ `flowType: 'pkce'` cho login).
- `supabase/functions/auth-email-hook/index.ts` (đã đúng — generate `?token_hash=...&type=recovery`).
- `AUTH_CONFIG.md` mục #7.2: cập nhật bảng — nhánh `?code=` giờ cũng đi qua `verifyOtp` (không còn `exchangeCodeForSession`).

## Verify sau khi áp dụng
1. `grep exchangeCodeForSession src/pages/ResetPassword.tsx` → KHÔNG match.
2. Network: click link reset → KHÔNG còn request `?grant_type=pkce`.
3. Console: thấy `[reset-password] verifyOtp called with token_hash` + `verifyOtp success`.
4. Cross-device Desktop→iPhone Safari: form đổi pass hiện.
5. Same-device Desktop: form hiện.
6. Click link cũ đã dùng: hiện màn "Liên kết đã hết hạn".
