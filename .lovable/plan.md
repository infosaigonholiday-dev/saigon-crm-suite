

## Đồng bộ Permission: Client ↔ DB Function

### Phân tích mismatch hiện tại

So sánh chi tiết 16 roles giữa `usePermissions.ts` và `get_default_permissions_for_role()`:

| Role | Vấn đề |
|------|--------|
| **DIRECTOR** | Client thiếu `finance.submit` (DB có) |
| **HCNS** | Cần thêm: `leave.approve`, `payroll.edit`, `finance.create` (theo yêu cầu) |
| **Còn lại 14 roles** | Đã khớp 100% |

Ngoài ra, `finance.create` chưa tồn tại trong `ALL_PERMISSION_KEYS` — cần thêm mới.

### Kế hoạch thực hiện

**1. Thêm permission key `finance.create` vào hệ thống**
- `ALL_PERMISSION_KEYS`: thêm `"finance.create"`
- `PERMISSION_GROUPS.finance`: thêm `"finance.create"` vào danh sách keys
- Cập nhật type `PermissionKey` (tự động từ const)

**2. Sửa `DEFAULT_PERMISSIONS` trong `usePermissions.ts`**
- **DIRECTOR**: thêm `finance.submit`
- **HCNS**: thêm `leave.approve`, `payroll.edit`, `finance.create`
- Giữ nguyên `settings.view` cho HCNS (đã có cả 2 nơi)
- **ADMIN/SUPER_ADMIN**: tự động có `finance.create` vì spread từ ALL_PERMISSION_KEYS

**3. Cập nhật DB function `get_default_permissions_for_role()`** (migration)
- HCNS: thêm `leave.approve`, `payroll.edit`, `finance.create`
- Giữ nguyên tất cả role khác (đã khớp)

### Files thay đổi
- `src/hooks/usePermissions.ts` — thêm `finance.create`, sửa DIRECTOR và HCNS
- Migration SQL — `CREATE OR REPLACE FUNCTION get_default_permissions_for_role()` cập nhật HCNS

### Kết quả sau khi sửa — HCNS
```text
employees.view, employees.create, employees.edit,
leave.view, leave.create, leave.approve,
payroll.view, payroll.create, payroll.edit,
finance.create, finance.submit,
settings.view
```

