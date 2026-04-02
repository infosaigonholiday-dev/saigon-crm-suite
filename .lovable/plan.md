

# Phân tích: `staff_department_view` trên bảng `profiles`

## Vấn đề nghiêm trọng

SQL bạn gửi sẽ **gây infinite recursion** vì dùng `EXISTS (SELECT 1 FROM profiles viewer ...)` ngay trên chính bảng `profiles` — Postgres sẽ áp dụng RLS khi đọc `profiles` bên trong policy, tạo vòng lặp vô hạn.

## Hiện trạng bảng `profiles`

| Policy | Command | Logic |
|--------|---------|-------|
| `admin_full_access` | ALL | `has_role(auth.uid(), 'ADMIN')` |
| `hr_manage_profiles` | ALL | `has_any_role(auth.uid(), ['HR_MANAGER', 'HCNS'])` |
| `profiles_self_read` | SELECT | `auth.uid() = id` |
| `profiles_self_update` | UPDATE | `auth.uid() = id` (+ immutability check) |

## Phân tích yêu cầu

Bạn muốn: nhân viên cùng phòng ban có thể xem profile của nhau. Hiện tại chỉ có `profiles_self_read` (chỉ xem chính mình).

**Cách triển khai an toàn**: Dùng `get_my_department_id()` (security definer, không gây recursion) thay vì raw EXISTS:

```sql
CREATE POLICY "profiles_department_read" ON profiles
FOR SELECT USING (
  auth.uid() = id                              -- xem chính mình
  OR department_id = get_my_department_id()     -- xem cùng phòng ban
);
```

Policy này sẽ **thay thế** `profiles_self_read` hiện tại (vì đã bao gồm `auth.uid() = id`).

ADMIN và HR đã được cover bởi `admin_full_access` và `hr_manage_profiles`.

## Thực hiện

1. **Drop** policy `profiles_self_read`
2. **Tạo** policy `profiles_department_read` (SELECT) với logic: `auth.uid() = id OR department_id = get_my_department_id()`

## Không thay đổi frontend

