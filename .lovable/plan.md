
## HR Module - Final Build v3: COMPLETED

### Đã thực hiện

| # | Bước | Trạng thái |
|---|------|------------|
| 1 | SQL Migration: SEASONAL constraint + deleted_at column + index | ✅ Done |
| 2 | Edge Function: Fix auth (getUser), role check mở rộng, atomic create + cleanup | ✅ Done + Deployed |
| 3 | EmployeeRoleTab: Form tạo tài khoản + password countdown 60s | ✅ Done |
| 4 | EmployeeDetail: Props mới, soft delete + AlertDialog, extract InfoItem | ✅ Done |
| 5 | EmployeeFormDialog: Validation, SEASONAL, auto employee_code, labels tiếng Việt | ✅ Done |
| 6 | Employees: Debounce 300ms, SEASONAL filter, server-side pagination, deleted_at filter | ✅ Done |
| 7 | AuthContext: Session expiry handling (SIGNED_OUT + TOKEN_REFRESHED) | ✅ Done |

### Xung đột đã sửa
- `base_salary` (không phải `basic_salary`) trong employee_salaries
- `handle_new_user` trigger conflict → edge function UPDATE profiles thay vì INSERT
- `deleted_at` chưa có trong types.ts → dùng `as any` cast
- `employee_code` → gửi null để DB trigger tự sinh SHT-xxx
- Department filter dùng UUID thay vì tên
