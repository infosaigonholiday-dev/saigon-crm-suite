

# Fix 4 vấn đề bảo mật còn lại

## Tổng quan

Scan bảo mật mới nhất phát hiện 4 vấn đề (2 lỗi nghiêm trọng, 2 cảnh báo). Các mục "Lỗi thời" đã được fix hoặc ignore từ trước.

## Các vấn đề và cách fix

### 1. [ERROR] Contract files - mọi user đều download được
**Vấn đề**: Policy `contract_files_read` cho phép TẤT CẢ authenticated user đọc file hợp đồng, trong khi bảng `contracts` chỉ cho phép ADMIN/DIEUHAN/KETOAN.

**Fix**: Thắt chặt storage policy chỉ cho phép đúng role được đọc file.

### 2. [ERROR] SOP đọc được khi chưa đăng nhập
**Vấn đề**: Policy `sop_read` trên bảng `department_sops` áp dụng cho role `public` (bao gồm anonymous). SOP có `department_id = NULL` sẽ bị lộ ra ngoài.

**Fix**: Đổi policy `sop_read` sang `TO authenticated`.

### 3. [WARN] SOP files bucket public
**Vấn đề**: Bucket `sop-files` đang là public, ai cũng truy cập được URL file.

**Fix**: Chuyển bucket sang private, dùng signed URL trong code thay vì `getPublicUrl`.

### 4. [WARN] Function search_path mutable
**Vấn đề**: Hàm `prevent_profile_field_change()` thiếu `SET search_path`.

**Fix**: Thêm `SET search_path TO 'public'`.

## Chi tiết kỹ thuật

### Migration SQL

```sql
-- 1. Fix contract storage policy
DROP POLICY IF EXISTS "contract_files_read" ON storage.objects;
CREATE POLICY "contract_files_read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'contract-files'
  AND has_any_role(auth.uid(), ARRAY['ADMIN','DIEUHAN','KETOAN'])
);

-- 2. Fix SOP read policy
DROP POLICY IF EXISTS "sop_read" ON public.department_sops;
CREATE POLICY "sop_read" ON public.department_sops FOR SELECT TO authenticated
USING (department_id IS NULL OR department_id = get_my_department_id());

-- 3. Make sop-files bucket private
UPDATE storage.buckets SET public = false WHERE id = 'sop-files';

-- 4. Fix search_path
CREATE OR REPLACE FUNCTION public.prevent_profile_field_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF auth.uid() = NEW.id AND NOT has_any_role(auth.uid(), ARRAY['ADMIN']) THEN
    IF NEW.department_id IS DISTINCT FROM OLD.department_id THEN
      RAISE EXCEPTION 'Không được tự thay đổi phòng ban';
    END IF;
    IF NEW.employee_id IS DISTINCT FROM OLD.employee_id THEN
      RAISE EXCEPTION 'Không được tự thay đổi mã nhân viên';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
```

### Code changes

| File | Thay doi |
|------|----------|
| `src/pages/SOPLibrary.tsx` | Doi `getPublicUrl` sang `createSignedUrl` (vi bucket chuyen private) |
| `src/components/contracts/ContractDetailDialog.tsx` | Doi `getPublicUrl` sang `createSignedUrl` cho contract files |

### Ket qua
- Contract files chi role ADMIN/DIEUHAN/KETOAN doc duoc
- SOP chi user da dang nhap moi xem duoc
- File SOP khong con public URL
- Khong con console warning ve search_path

