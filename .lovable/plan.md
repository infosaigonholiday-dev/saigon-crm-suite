

## Fix lỗi bảo mật còn lại

### Finding 1: profiles_self_update (CRITICAL)
**Vấn đề**: Policy hiện tại dùng `auth.jwt() ->> 'role'` = `'authenticated'` (PostgreSQL role), không phải app role → user có thể đổi role thành `'authenticated'` hoặc bất kỳ giá trị nào.

**Fix**: Đổi WITH CHECK sang subquery đúng cách như scanner đề xuất:
```sql
DROP POLICY IF EXISTS "profiles_self_update" ON profiles;
CREATE POLICY "profiles_self_update" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT p.role FROM profiles p WHERE p.id = auth.uid())
  );
```

Kết hợp với trigger `enforce_role_immutability` đã có → defense-in-depth.

### Finding 2: Leaked Password Protection
Không fix bằng SQL. Cần bật thủ công tại:
**Supabase Dashboard → Authentication → Settings → Enable Leaked Password Protection**

### Tóm tắt
| # | Hành động | Loại |
|---|-----------|------|
| 1 | Sửa policy `profiles_self_update` dùng subquery thay `auth.jwt()` | Migration SQL |
| 2 | Bật Leaked Password Protection | Thủ công trên Dashboard |

