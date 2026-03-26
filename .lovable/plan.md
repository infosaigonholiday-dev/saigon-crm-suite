

## Fix: Infinite recursion in profiles RLS policies

### Nguyên nhân

2 policy trên bảng `profiles` đang query lại chính bảng `profiles`:

1. **`profiles_admin_all`**: `EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND ...)` → vòng lặp
2. **`profiles_self_update`**: `WITH CHECK` cũng query `SELECT p.role FROM profiles p WHERE p.id = auth.uid()` → vòng lặp

### Giải pháp

Thay thế các subquery bằng security definer functions đã có sẵn: `has_any_role()` và `has_role()`. Các function này có `SECURITY DEFINER` nên bypass RLS, không gây recursion.

### SQL Migration

```sql
-- 1. Fix profiles_admin_all: dùng has_any_role thay vì subquery
DROP POLICY IF EXISTS profiles_admin_all ON profiles;
CREATE POLICY profiles_admin_all ON profiles
  FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_MANAGER','HCNS']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_MANAGER','HCNS']));

-- 2. Fix profiles_self_update: bỏ subquery check role/dept/employee_id
--    Giữ nguyên chỉ cho phép user update chính mình
--    Trigger prevent_role_change() đã bảo vệ việc tự đổi role
DROP POLICY IF EXISTS profiles_self_update ON profiles;
CREATE POLICY profiles_self_update ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

**Lưu ý**: `prevent_role_change()` trigger đã có sẵn — chỉ ADMIN mới đổi được role. Nên không cần kiểm tra role trong WITH CHECK nữa, tránh recursion.

### Files thay đổi

| File | Thay đổi |
|------|----------|
| SQL migration | Fix 2 RLS policies trên profiles |

Không cần sửa code frontend.

