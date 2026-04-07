

# Refactor Auth/Account Management — Saigon Holiday CRM

## Tổng quan

Xây dựng hệ thống 3 flow rõ ràng: (1) Tạo tài khoản + mật khẩu mặc định + bắt buộc đổi lần đầu, (2) Đăng nhập lần đầu bắt buộc đổi mật khẩu, (3) Quên/Reset mật khẩu qua email recovery link. Loại bỏ race condition hiện tại.

---

## PHẦN A — Database Migration

Thêm 2 cột vào bảng `profiles`:

```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS must_change_password boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS first_login_at timestamptz;
```

- `must_change_password = true` mặc định cho tất cả user mới
- `first_login_at` ghi nhận thời điểm đổi mật khẩu lần đầu thành công

---

## PHẦN B — Edge Function: manage-employee-accounts

File: `supabase/functions/manage-employee-accounts/index.ts`

### B1. Action "create"
- Giữ `DEFAULT_PASSWORD = "sgh123456"`
- Tạo auth user với `password = DEFAULT_PASSWORD`, `email_confirm = true`
- Sau khi tạo xong, update `profiles` set `must_change_password = true`
- **BỎ** `generateLink({ type: "recovery" })` ở flow create
- Message: "Tài khoản đã được tạo cho {{email}} với mật khẩu mặc định nội bộ. Nhân viên cần đăng nhập lần đầu và đổi mật khẩu mới."

### B2. Action "reset_password" (1 user)
- Bước 1: `updateUserById` đặt password = DEFAULT_PASSWORD
- Bước 2: Update `profiles` set `must_change_password = true`
- Bước 3: Gọi `resetPasswordForEmail(email)` (dùng admin API hoặc `generateLink({ type: "recovery", email })`) để gửi email recovery
- Nếu gửi email lỗi → trả error cụ thể cho admin
- Message: "Đã reset mật khẩu. Email đặt lại mật khẩu đã được gửi. Nhân viên dùng link trong email hoặc đăng nhập bằng mật khẩu mặc định để đổi mật khẩu."

### B3. Action "reset_all_passwords"
- Reset từng user về DEFAULT_PASSWORD + set `must_change_password = true`
- Cố gắng gửi email recovery cho từng email (skip lỗi, không dừng cả batch)
- Trả report: bao nhiêu reset OK, bao nhiêu gửi email OK, bao nhiêu skip

### B4. Các action khác
- `activate`: set `must_change_password = true` khi reactivate (user cần đổi mật khẩu sau khi được kích hoạt lại)
- `findAuthUser`, `deactivate`, `update_email`, `cleanup_orphans`: giữ nguyên

---

## PHẦN C — AuthContext.tsx

File: `src/contexts/AuthContext.tsx`

### C1. Mở rộng context
- Thêm `mustChangePassword: boolean` vào `AuthContextType`
- Hàm `fetchRole` đổi thành `fetchProfile` → query cả `role` và `must_change_password`

### C2. Logic điều hướng
- Khi `INITIAL_SESSION` hoặc `SIGNED_IN`:
  - Fetch profile (role + must_change_password)
  - Set cả `session`, `userRole`, `mustChangePassword` cùng lúc (React 18 auto-batch)
- Khi `SIGNED_OUT`:
  - Bỏ qua redirect nếu pathname là `/reset-password` hoặc `/first-login-change-password`

### C3. Không redirect khi ở recovery pages
- Danh sách pathname được miễn redirect: `/reset-password`, `/first-login-change-password`

---

## PHẦN D — App.tsx (Routing)

File: `src/App.tsx`

### D1. Thêm route mới
```
/first-login-change-password → FirstLoginChangePassword (page mới)
```

### D2. ProtectedRoutes
- Kiểm tra `mustChangePassword` từ AuthContext
- Nếu `mustChangePassword === true` → redirect tất cả route về `/first-login-change-password`
- Nếu đang ở `/first-login-change-password` và `mustChangePassword === false` → redirect về `/`

---

## PHẦN E — Trang mới: FirstLoginChangePassword

File: `src/pages/FirstLoginChangePassword.tsx`

- UI: Card đơn giản với thông điệp "Đây là lần đăng nhập đầu tiên, vui lòng đổi mật khẩu"
- Form: Mật khẩu mới + Xác nhận mật khẩu
- Validation: >= 8 ký tự, phải có ít nhất 1 chữ hoa và 1 số
- Submit:
  1. `supabase.auth.updateUser({ password: newPassword })`
  2. Update `profiles` set `must_change_password = false`, `first_login_at = now()`
  3. Cập nhật `mustChangePassword` trong AuthContext
  4. Navigate về `/` (Dashboard)
- Nếu lỗi: toast lỗi

---

## PHẦN F — Sửa ResetPassword.tsx

File: `src/pages/ResetPassword.tsx`

### F1. Init logic
- Đọc `?code=` từ URL
- Nếu có code: `exchangeCodeForSession(code)` → thành công: `setReady(true)`, lỗi: `setExpired(true)` ngay
- Nếu có hash `type=recovery`: `setReady(true)`
- **BỎ** `supabase.auth.getSession()` check (nguyên nhân race condition hiện tại)

### F2. Timeout
- Tăng lên 60s
- `clearTimeout` ngay khi `setReady(true)` hoặc `setExpired(true)`
- Chỉ trigger nếu chưa có kết quả

### F3. Validation
- Mật khẩu >= 8 ký tự (nâng từ 6)

### F4. Sau updateUser thành công
- Update `profiles` set `must_change_password = false`
- Hiển thị success UI
- Gọi `supabase.auth.signOut()`
- Navigate về `/login`

---

## PHẦN G — Tổng kết files thay đổi

| File | Thay đổi |
|------|----------|
| **Migration SQL** | Thêm cột `must_change_password`, `first_login_at` vào `profiles` |
| `supabase/functions/manage-employee-accounts/index.ts` | Sửa create, reset_password, reset_all_passwords, activate |
| `src/contexts/AuthContext.tsx` | Thêm `mustChangePassword`, fetch profile thay vì chỉ role |
| `src/App.tsx` | Thêm route `/first-login-change-password`, logic redirect |
| `src/pages/FirstLoginChangePassword.tsx` | **Tạo mới** — trang đổi mật khẩu lần đầu |
| `src/pages/ResetPassword.tsx` | Sửa init logic, bỏ getSession, tăng timeout, nâng validation |

## Test flows

1. **Tạo tài khoản**: Admin tạo → user login bằng `sgh123456` → bị redirect sang `/first-login-change-password` → đổi mật khẩu → vào Dashboard
2. **Đăng nhập bình thường**: User đã đổi mật khẩu → login → vào Dashboard trực tiếp
3. **Admin reset**: Admin bấm reset → password về mặc định + email recovery gửi → user có thể login bằng mặc định (bị bắt đổi) HOẶC click link email → đặt mật khẩu mới
4. **Quên mật khẩu**: User bấm "Quên mật khẩu" → nhập email → nhận link → click link → trang `/reset-password` → đặt mật khẩu mới → signOut → login lại

