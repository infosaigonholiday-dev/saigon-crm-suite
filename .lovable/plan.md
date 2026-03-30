

## Fix bảo mật mật khẩu mặc định & Thêm liên kết nhân viên

### Thay đổi

**1. Edge Function `manage-employee-accounts/index.ts`** -- Xóa mật khẩu khỏi response message:
- Line 135: `"Tài khoản đã được tạo thành công cho ${email}"` (bỏ phần mật khẩu)
- Line 255: `"Đã reset mật khẩu về mặc định"` (bỏ `(${DEFAULT_PASSWORD})`)
- Line 319: `"Đã reset mật khẩu ${resetCount}/${allProfiles.length} tài khoản về mặc định"` (bỏ `(${DEFAULT_PASSWORD})`)

**2. `SettingsAccountsTab.tsx`** -- 3 sửa đổi:

a) Xóa text `sgh123456` khỏi 3 chỗ trong UI:
- Line 243: DialogDescription tạo tài khoản
- Line 288: AlertDialog reset 1 tài khoản
- Line 313: AlertDialog reset tất cả

b) Thêm state `employee_id` vào formData, thêm query employees chưa liên kết (`profile_id IS NULL`, `deleted_at IS NULL`)

c) Thêm Select "Liên kết nhân viên" vào form tạo tài khoản, gửi `employee_id` kèm request create. Khi chọn nhân viên, tự động điền Họ tên và Email từ dữ liệu nhân viên (nếu có)

### Files thay đổi

| File | Nội dung |
|------|----------|
| `supabase/functions/manage-employee-accounts/index.ts` | Xóa mật khẩu khỏi 3 response messages |
| `src/components/settings/SettingsAccountsTab.tsx` | Xóa text mật khẩu + thêm dropdown liên kết nhân viên |

