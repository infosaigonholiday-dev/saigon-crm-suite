

## Chèn profile ADMIN cho admin@saigonholiday.com

### Thực hiện

Sử dụng **insert tool** (không phải migration vì đây là thao tác INSERT data, không phải thay đổi schema) để chèn record vào bảng `profiles`:

```sql
INSERT INTO profiles (id, email, full_name, role, is_active)
VALUES (
  '21587d06-9c1e-47c2-aa78-f7daadea4ddb',
  'admin@saigonholiday.com',
  'Admin',
  'ADMIN',
  true
);
```

Sau khi chèn xong, tài khoản `admin@saigonholiday.com` sẽ:
- Có quyền ADMIN cao nhất trong hệ thống
- Truy cập được mục "Quản lý tài khoản nhân viên" trong trang Cài đặt
- Được phép đọc/ghi tất cả profiles, audit_logs, và các bảng có RLS policy cho ADMIN

