

# Fix 3 vấn đề bảo mật còn lại

## Phân tích

### 1. [ERROR] SOP files DELETE quá rộng — CẦN FIX
Storage policy `Authenticated users can delete sop files` cho phép MỌI authenticated user xóa file SOP, kể cả file do người khác upload.

**Fix**: Thắt chặt policy chỉ cho ADMIN và HR_MANAGER xóa file SOP.

### 2. [WARN] Audit logs — IGNORE (an toàn)
Hiện tại chỉ ADMIN đọc được audit_logs. Scanner cảnh báo "phòng xa" nếu sau này thêm policy không cẩn thận. Không phải lỗ hổng thực tế.

**Action**: Đánh dấu ignore với lý do đã có policy bảo vệ đúng.

### 3. [WARN] Role protection race condition — IGNORE (đã có trigger)
Scanner lo ngại race condition lý thuyết trong `profiles_self_update`. Nhưng hệ thống đã có 2 trigger bảo vệ: `prevent_role_change()` và `enforce_role_immutability`.

**Action**: Đánh dấu ignore (đã có agent_security finding ignore trước đó).

## Migration SQL

```sql
-- Fix SOP files DELETE policy - chỉ ADMIN/HR_MANAGER mới xóa được
DROP POLICY IF EXISTS "Authenticated users can delete sop files" ON storage.objects;
CREATE POLICY "sop_files_delete_admin_only" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'sop-files'
  AND has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_MANAGER'])
);
```

## Security findings management
- Delete resolved findings (SOP read + bucket public đã fix)
- Ignore audit_logs warning (không phải lỗ hổng thực tế)
- Ignore profiles race condition (đã có trigger bảo vệ)

## Files cần sửa
Không cần sửa file frontend — chỉ migration SQL và cập nhật security findings.

## Kết quả
- File SOP chỉ ADMIN/HR_MANAGER xóa được
- Tất cả warnings được giải quyết hoặc đánh dấu chấp nhận
- Security scan sạch

