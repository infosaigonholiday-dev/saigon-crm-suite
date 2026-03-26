

## Phân tích lỗi và kế hoạch fix

### Lỗi 1 (CRITICAL): Enum không khớp DB constraint
Network request trả về lỗi 400: `employees_employment_type_check` constraint violation.

**DB check constraints thực tế:**
- `employment_type`: chỉ cho phép `FULLTIME`, `PARTTIME`, `PROBATION`
- `status`: chỉ cho phép `ACTIVE`, `PROBATION`, `RESIGNED`, `TERMINATED`

**Code hiện tại gửi sai:**
- `FULL_TIME` → phải là `FULLTIME`
- `PART_TIME` → phải là `PARTTIME`
- `INTERN`, `CONTRACT` → không tồn tại trong constraint
- `ON_LEAVE` → không tồn tại trong constraint

**Giải pháp**: Cập nhật DB constraint để mở rộng, vì business cần nhiều loại hơn (INTERN, CONTRACT, ON_LEAVE...). Đồng thời đồng bộ code.

**Migration SQL:**
```sql
ALTER TABLE employees DROP CONSTRAINT employees_employment_type_check;
ALTER TABLE employees ADD CONSTRAINT employees_employment_type_check 
  CHECK (employment_type IN ('FULLTIME','PARTTIME','PROBATION','INTERN','CONTRACT'));

ALTER TABLE employees DROP CONSTRAINT employees_status_check;
ALTER TABLE employees ADD CONSTRAINT employees_status_check 
  CHECK (status IN ('ACTIVE','PROBATION','RESIGNED','TERMINATED','ON_LEAVE','INTERN'));
```

**Code fix** (3 files): Đổi `FULL_TIME` → `FULLTIME`, `PART_TIME` → `PARTTIME` trong:
- `EmployeeFormDialog.tsx` (employmentTypes + default value)
- `Employees.tsx` (employmentTypes filter)
- `EmployeeDetail.tsx` (nếu có reference)

### Lỗi 2: Thiếu tab "Phân quyền / Chức vụ"
User muốn có tab để gán role hệ thống cho nhân viên (liên kết employee → profile → role).

**Giải pháp**: Thêm tab "Phân quyền" trong `EmployeeDetail.tsx` hiển thị:
- Role hiện tại của profile liên kết (nếu có `profile_id`)
- Dropdown chọn role (ADMIN, HCNS, KETOAN, MANAGER, SALE_DOMESTIC, etc.)
- Chỉ ADMIN mới được đổi role (gọi update profiles)
- Hiển thị thông tin tài khoản đăng nhập (email, trạng thái active)

### Tóm tắt thay đổi

| # | Hành động | File |
|---|-----------|------|
| 1 | Migration: mở rộng CHECK constraint cho employment_type và status | SQL migration |
| 2 | Fix enum values trong form + list | `EmployeeFormDialog.tsx`, `Employees.tsx` |
| 3 | Tạo component tab Phân quyền | `src/components/employees/EmployeeRoleTab.tsx` |
| 4 | Thêm tab Phân quyền vào detail page | `EmployeeDetail.tsx` |

