

# Áp dụng pattern `admin_full_access` cho toàn bộ hệ thống

## Nguyên tắc
Thêm 1 policy duy nhất `admin_full_access` (FOR ALL) cho **mỗi bảng** trong schema `public`. ADMIN có toàn quyền CRUD trên mọi bảng — không cần check thêm ở bất kỳ policy nào khác.

## Lưu ý kỹ thuật quan trọng
- **Không dùng trực tiếp** `EXISTS (SELECT 1 FROM profiles ...)` trên bảng `profiles` vì sẽ gây **infinite recursion**.
- Thay vào đó dùng function `has_role(auth.uid(), 'ADMIN')` (security definer, đã tồn tại) cho tất cả bảng.
- Sau khi thêm `admin_full_access`, **loại bỏ `'ADMIN'`** khỏi mảng role trong các policy khác để tránh logic trùng lặp.

## Phạm vi: 60 bảng

### Nhóm A — Đã có admin trong policy phức tạp (cần refactor ~40 bảng)
Thêm `admin_full_access` mới, sau đó xóa `'ADMIN'` khỏi `has_any_role()` trong các policy còn lại.

Ví dụ bảng `bookings` hiện tại:
```text
bookings_read (SELECT): has_any_role(..., ARRAY['ADMIN', 'DIEUHAN', ...])
bookings_update (UPDATE): has_any_role(..., ARRAY['ADMIN', 'DIEUHAN', ...])
bookings_delete (DELETE): has_any_role(..., ARRAY['ADMIN'])
bookings_write (INSERT): non-admin logic
```
Sau refactor:
```text
admin_full_access (ALL): has_role(auth.uid(), 'ADMIN')
bookings_read (SELECT): has_any_role(..., ARRAY['DIEUHAN', ...])  -- bỏ ADMIN
bookings_update (UPDATE): has_any_role(..., ARRAY['DIEUHAN', ...])  -- bỏ ADMIN
bookings_delete (DELETE): DROP (đã cover bởi admin_full_access)
bookings_write (INSERT): giữ nguyên logic non-admin
```

### Nhóm B — Bảng chỉ có admin-only policy (chuyển sang pattern mới ~10 bảng)
VD: `audit_logs`, `accounts_payable`, `cashflow_monthly`... — đổi tên/thay thế policy hiện tại thành `admin_full_access`.

### Nhóm C — Bảng `profiles` (đặc biệt)
Giữ `has_role()` thay vì raw EXISTS. Cập nhật `profiles_admin_all` thành `admin_full_access` chỉ cho ADMIN (hiện đang bao gồm cả HR_MANAGER, HCNS — cần tách riêng).

### Nhóm D — Bảng `notifications`, `user_preferences` (personal data)
Thêm `admin_full_access` nhưng giữ nguyên policy cá nhân.

## Thực hiện: 1 migration SQL lớn

Migration sẽ:
1. Thêm policy `admin_full_access` FOR ALL USING `has_role(auth.uid(), 'ADMIN')` cho tất cả 60 bảng
2. Cập nhật ~40 policy hiện tại: xóa `'ADMIN'` khỏi mảng role
3. Drop các policy chỉ dành riêng cho ADMIN (đã redundant): VD `bookings_delete`, `booking_itineraries_delete`, `booking_notes_delete`...
4. Đổi tên/thay thế policy admin-only hiện tại

## Không thay đổi frontend
Không cần sửa code frontend — chỉ restructure RLS policies.

