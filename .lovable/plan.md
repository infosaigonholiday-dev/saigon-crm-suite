## Bug

URL email Supabase: `supabase.co/auth/v1/verify?token=pkce_xxx&type=recovery&redirect_to=.../reset-password`

Sau khi server verify, redirect về `/reset-password` trong **3 trường hợp** khác nhau tuỳ version/config Supabase:
- (a) Kèm `?code=xxx` (PKCE chuẩn) — code hiện đã handle
- (b) Kèm `#access_token=...&type=recovery` (implicit fallback) — code hiện đã handle
- (c) **KHÔNG kèm gì cả** — server đã set session qua storage event và fire `PASSWORD_RECOVERY` qua `onAuthStateChange`. Đây là case đang fail.

Code hiện tại ở case (c): không có code, không có hash, `getSession()` lúc mount trả về null (event chưa fire) → gọi `redirectLogin()` ngay → đá user về `/login`.

## Files sửa

Chỉ 1 file: `src/pages/ResetPassword.tsx`

`client.ts` giữ nguyên (`flowType: 'pkce'`, `detectSessionInUrl: false`) — không đổi vì còn ảnh hưởng các flow khác.

## Logic sửa (useEffect mount)

```text
1. Subscribe onAuthStateChange TRƯỚC tất cả mọi thứ
   → khi nhận PASSWORD_RECOVERY hoặc SIGNED_IN có session → markReady()

2. Tăng MIN_VERIFY_MS: 2000 → 5000ms

3. Parse URL:
   - Nếu có error_description / error → markExpired() ngay (link hỏng)
   - Nếu có ?code= → exchangeCodeForSession → markReady/markExpired
   - Nếu có #access_token= → setSession → markReady/markExpired
   - Nếu đã có session sẵn (getSession) → markReady

4. Nếu chưa resolve được (không code/hash/session/error):
   → KHÔNG redirect ngay
   → setTimeout 5s đợi PASSWORD_RECOVERY event fire
   → Sau 5s vẫn chưa resolve:
       - Check URL: nếu user vào /reset-password "trần" (không param gì) → redirectLogin()
       - Nếu URL có dấu hiệu callback (vd path khớp + có search/hash khác) nhưng không có code → markExpired()
   → Phân biệt bằng cờ `hadCallbackParams = !!(code || hash.access_token || url.search || url.hash)`

5. Cleanup: clear timeout + unsubscribe khi unmount hoặc khi đã resolve
```

## Verify checklist

| TC | Bước | Kỳ vọng |
|---|---|---|
| TC1 | Click link mới <60s từ email Supabase | Form đổi pass hiện. Console log `PASSWORD_RECOVERY` HOẶC `exchangeCodeForSession success` |
| TC2 | Click link cũ đã dùng | Phase `expired`, message "Liên kết đã hết hạn" |
| TC3 | Vào `/reset-password` trực tiếp (URL trần) | Redirect `/login` sau ~5s grace period |
| TC4 | Test iOS Safari | Vào được form (không flash login) |
| TC5 | Test iOS Gmail app → mở link | Vào được form |

## Rủi ro & ràng buộc

- Không đổi `client.ts` — giữ `flowType: pkce`, `detectSessionInUrl: false`
- Không đổi `AuthContext.tsx` — đã skip `PASSWORD_RECOVERY` đúng
- TC3 sẽ chậm hơn (5s thay vì instant) — chấp nhận đánh đổi để fix iOS
- Cập nhật `AUTH_CONFIG.md` mục #7: bổ sung note về case (c) "URL không kèm code/hash, đợi PASSWORD_RECOVERY event"

## Deliverables

1. `src/pages/ResetPassword.tsx` — refactor `useEffect` mount theo logic trên
2. `AUTH_CONFIG.md` — thêm note case (c) vào mục #7
3. Báo kết quả test thực tế (console log + screenshot phase)
