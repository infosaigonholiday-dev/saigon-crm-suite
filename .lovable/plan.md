

## Kế hoạch fix bảo mật — 6 findings

### Ưu tiên 1: Lỗi nghiêm trọng (ERROR)

**Finding #4 — Deactivated users vẫn truy cập được dữ liệu**

Sửa hàm `has_role` và `has_any_role` để thêm điều kiện `AND is_active = true`. Khi user bị deactivate, mọi RLS policy dùng các hàm này sẽ tự động từ chối truy cập.

```sql
-- has_role: thêm AND is_active = true
CREATE OR REPLACE FUNCTION public.has_role(...)
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = _user_id AND role = _role AND is_active = true
  )

-- has_any_role: tương tự
CREATE OR REPLACE FUNCTION public.has_any_role(...)
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = _user_id AND role = ANY(_roles) AND is_active = true
  )
```

### Ưu tiên 2: Profile self-update quá rộng (WARN #2)

Siết chặt policy `profiles_self_update` — ngoài `role` và `is_active`, thêm kiểm tra `department_id` và `employee_id` không được tự thay đổi:

```sql
-- WITH CHECK thêm:
AND department_id = (SELECT department_id FROM profiles WHERE id = auth.uid())
```

Hoặc tạo trigger `prevent_profile_field_change` chặn user tự đổi `department_id`, `employee_id`.

### Ưu tiên 3: Xác minh tables thiếu RLS (WARN #5)

Chạy query kiểm tra xem có table nào trong schema `public` chưa có RLS policy. Nếu có, thêm policy phù hợp.

### Không cần fix ngay

- **Finding #1 (Leaked Password)**: Thao tác thủ công trên Supabase Dashboard → Auth → Settings → Password Security
- **Finding #3 (Documents admin overlap)**: Thiết kế hợp lý, chỉ lưu ý
- **Finding #6 (Employee PII)**: Cần thiết kế column-level security phức tạp hơn, có thể xử lý sau

### Chi tiết kỹ thuật

**File thay đổi:**

| File | Thay đổi |
|------|----------|
| Migration SQL mới | Sửa `has_role`, `has_any_role` thêm `is_active` check |
| Migration SQL mới | Siết `profiles_self_update` policy chặn đổi `department_id` |

**Tổng cộng**: 1 migration file, sửa 2 functions + 1 RLS policy

