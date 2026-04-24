

## Cấp quyền `settings.view` cho TẤT CẢ thực tập sinh để bật được thông báo

### Vấn đề
Đã thêm tab "Thông báo" trong Cài đặt cho mọi user, nhưng 8 role INTERN_* không có `settings.view` → không vào được trang Cài đặt → không bật được Web Push → vô nghĩa hoàn toàn.

### Sẽ sửa

**File:** `src/hooks/usePermissions.ts`

Thêm `"settings.view"` vào default permissions của 8 role thực tập sinh:

| Role | Dòng hiện tại |
|---|---|
| `INTERN_SALE_DOMESTIC` | ~263 |
| `INTERN_SALE_OUTBOUND` | ~274 |
| `INTERN_SALE_MICE` | ~285 |
| `INTERN_SALE_INBOUND` | ~296 |
| `INTERN_DIEUHAN` | ~307 |
| `INTERN_MKT` | ~315 |
| `INTERN_HCNS` | ~323 |
| `INTERN_KETOAN` | ~330 |

Mỗi role chỉ thêm 1 dòng `"settings.view",` ngay sau `"dashboard.view",`.

### Đồng bộ DB (BẮT BUỘC)

**File migration mới:** cập nhật function `get_default_permissions_for_role` trong DB — thêm `'settings.view'` vào perms của 8 INTERN role tương ứng để khớp với client (nguyên tắc Client-Server Sync trong memory).

Sau migration, chạy:
```sql
UPDATE role_permissions rp
SET permissions = array_append(permissions, 'settings.view')
WHERE rp.role LIKE 'INTERN_%'
  AND NOT ('settings.view' = ANY(permissions));
```
(nếu hệ thống có lưu `role_permissions` cache — kiểm tra trước, nếu không có thì bỏ qua bước UPDATE)

### Kết quả sau khi sửa
- INTERN đăng nhập → menu Cài đặt **xuất hiện** ở sidebar
- Vào Cài đặt → chỉ thấy 2 tab: **"Quyền hạn"** + **"Thông báo"** (bị filter bởi `ACCOUNT_MANAGER_ROLES`, `isAdmin`, `isHR` — đã có sẵn logic)
- Bật toggle Web Push thành công → nhận thông báo @mention, follow-up, sinh nhật KH

### Test
1. Đăng nhập bằng tài khoản INTERN_SALE_DOMESTIC → sidebar hiện "Cài đặt"
2. Click vào → thấy 2 tab "Quyền hạn" + "Thông báo"
3. Bật toggle Web Push → trình duyệt hỏi quyền → Cho phép → toast success
4. Các role INTERN khác (HCNS, KETOAN, MKT, DIEUHAN) cùng hành vi

