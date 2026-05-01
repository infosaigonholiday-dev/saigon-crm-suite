## Mục tiêu
Sửa flow đặt lại mật khẩu để link từ email luôn vào được form mới, không bị trắng/đá về login, hoạt động trên cả production (`app.saigonholiday.vn`), Lovable preview/published, và localhost.

## Nguyên nhân lỗi hiện tại
1. `src/pages/ResetPassword.tsx` dựa vào `detectSessionInUrl` (hành vi mặc định của supabase-js) để âm thầm exchange `?code=`, rồi **polling `getSession()` tới 8 giây**. Nếu exchange chậm/lỗi mạng, user thấy màn loading lâu rồi nhảy thẳng "Link không hợp lệ" — đúng triệu chứng đang gặp.
2. Không xử lý tường minh hash callback (`#access_token=...&refresh_token=...&type=recovery`) — Supabase có thể trả về dạng này tuỳ template / phiên bản.
3. `src/integrations/supabase/client.ts` không khai báo `flowType` rõ ràng. Mặc định là `pkce`, đúng với `?code=`, nhưng cần khoá để chắc chắn và để code của trang reset đoán đúng kiểu callback.
4. `AuthContext.onAuthStateChange` đã bỏ qua `PASSWORD_RECOVERY` ✅ — giữ nguyên.

## Phạm vi
- KHÔNG đổi DB / RLS / role / module khác.
- Chỉ sửa: `src/pages/ResetPassword.tsx`, `src/integrations/supabase/client.ts` (thêm `flowType: 'pkce'`, `detectSessionInUrl: false` để trang tự xử lý), và một dòng nhỏ trong `AuthContext` nếu cần để không bị clobber.

## Thay đổi chi tiết

### 1. `src/integrations/supabase/client.ts`
Thêm `flowType: 'pkce'` và `detectSessionInUrl: false` vào `auth` options. Lý do:
- `flowType: 'pkce'` → khoá flow PKCE (link email Supabase mặc định gửi `?code=`).
- `detectSessionInUrl: false` → tắt auto-exchange toàn cục để trang `/reset-password` chủ động `exchangeCodeForSession(code)` đúng theo yêu cầu, tránh race với `AuthProvider`.
- Tắt detect không ảnh hưởng login thường (login dùng password).

### 2. `src/pages/ResetPassword.tsx` — viết lại logic init
3 state: `verifying` | `expired` | `ready` (+ `success`).

```text
on mount:
  url = new URL(window.location.href)
  code = url.searchParams.get('code')
  errorDesc = url.searchParams.get('error_description')
  hash = parseHash(window.location.hash)   // access_token, refresh_token, type

  if errorDesc → expired (show errorDesc)
  else if code:
    { error } = await supabase.auth.exchangeCodeForSession(code)
    if error → expired
    else → ready
  else if hash.access_token && hash.refresh_token && hash.type === 'recovery':
    { error } = await supabase.auth.setSession({ access_token, refresh_token })
    if error → expired else ready
  else:
    // không có artifact → expired ngay (không polling)
    expired

  finally: clear query + hash khỏi URL (history.replaceState)
```

Listener `onAuthStateChange`:
- Nếu nhận `PASSWORD_RECOVERY` hoặc `SIGNED_IN` với session hợp lệ → set ready (phòng trường hợp Supabase bắn event sớm hơn promise).

Submit:
- Validate ≥ 8 ký tự, có hoa & số, khớp confirm (đồng bộ với `FirstLoginChangePassword`).
- `supabase.auth.updateUser({ password })`.
- Update `profiles.must_change_password = false`.
- `signOut()` → state `success` → nút "Đăng nhập ngay" về `/login`.
- Disable nút submit khi `loading`.

UI tiếng Việt:
- `verifying`: spinner + "Đang xác thực liên kết đặt lại mật khẩu..."
- `expired`: icon ✕ + "Liên kết không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu gửi lại từ màn hình đăng nhập." + nút quay về login.
- `ready`: form 2 input + nút "Đặt mật khẩu mới".
- `success`: ✓ + "Đổi mật khẩu thành công" + nút "Đăng nhập ngay".

### 3. Không đổi
- `Login.tsx` (`resetPasswordForEmail` đã dùng `getResetPasswordUrl()` đúng).
- `authRedirect.ts` đã trả URL theo origin hiện tại — đáp ứng production / preview / localhost.
- `AuthContext.tsx` đã skip `PASSWORD_RECOVERY` và `SIGNED_IN` trong `RECOVERY_PATHS` ✅.

## Cấu hình Supabase (admin tự kiểm)
Nhắc admin vào **Auth → URL Configuration**:
- Site URL: `https://app.saigonholiday.vn`
- Redirect URLs (add cả 3):
  - `https://app.saigonholiday.vn/reset-password`
  - `https://saigon-holiday-nexus.lovable.app/reset-password`
  - `https://id-preview--1632605d-2e2c-4155-8254-0b9de359ce51.lovable.app/reset-password`
  - `http://localhost:5173/reset-password` (nếu test local)

## Test (tự chạy sau khi triển khai)
- TC1 Gửi email reset từ Login → nhận mail.
- TC2 Click link production → vào form.
- TC3 Click link preview → vào form, không lỗi.
- TC4 `?code=` → exchange OK, ready.
- TC5 Hash `access_token` → setSession OK, ready.
- TC6 Link đã dùng → màn "Liên kết không hợp lệ", không crash, không lặp polling.
- TC7 Mật khẩu yếu / không khớp → toast lỗi, không update.
- TC8 Đổi xong → login bằng pass mới OK, pass cũ fail.

## Verify
1. Không trắng màn / crash. 2. Không bị đá về `/login`. 3. Console sạch. 4. Network không có URL mismatch. 5. Login lại OK. 6. Expired hiện đúng. 7. Build pass 0 error.
