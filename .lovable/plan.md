## Bug

`duplicate key value violates unique constraint "bookings_code_key"` xảy ra khi:
- Sale tạo booking từ tour B2B lần 2 (code prefill = `BK-${tour_code}` cố định, không tự tăng).
- Hoặc 2 tab/2 user submit cùng base code → race condition.

## Root cause

`src/components/bookings/BookingFormDialog.tsx` line 80 + 254:
- Code được prefill `BK-${prefillData.tour_code}` từ B2B tour, KHÔNG check DB trước khi insert.
- Insert thẳng → vi phạm unique `bookings_code_key`.

DB hiện có sẵn pattern `-01`, `-02` (vd `BK-OS5N5D-260430-03`), nhưng chỉ là gõ tay → không nhất quán.

Dialog **chỉ tạo mới** (không có prop edit) → KHÔNG cần thêm logic edit-mode. (TC3 sẽ pass mặc định vì không có path edit qua dialog này.)

## Thay đổi

### 1. Migration (SQL — apply qua Supabase SQL Editor)

Tạo file `supabase/migrations/20260501090000_generate_unique_booking_code.sql`:

```sql
CREATE OR REPLACE FUNCTION public.generate_unique_booking_code(base TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_base TEXT;
  candidate TEXT;
  max_suffix INT;
  next_suffix INT;
  base_pattern TEXT;
BEGIN
  clean_base := trim(base);
  IF clean_base IS NULL OR clean_base = '' THEN
    RAISE EXCEPTION 'base code không được rỗng';
  END IF;

  -- Strip -NN nếu base truyền vào sẵn có suffix
  clean_base := regexp_replace(clean_base, '-\d{2,}$', '');

  -- Advisory lock chống race 2 tab cùng tạo
  PERFORM pg_advisory_xact_lock(hashtext('booking_code:' || clean_base));

  base_pattern := '^' || regexp_replace(clean_base, '([.+*?^$()\[\]{}|\\])', '\\\1', 'g') || '-\d{2,}$';

  SELECT COALESCE(MAX((regexp_match(code, '-(\d{2,})$'))[1]::INT), 0)
    INTO max_suffix FROM bookings WHERE code ~ base_pattern;

  -- Base trần còn trống và không có biến thể → dùng base
  IF max_suffix = 0 AND NOT EXISTS (SELECT 1 FROM bookings WHERE code = clean_base) THEN
    RETURN clean_base;
  END IF;

  next_suffix := max_suffix + 1;
  candidate := clean_base || '-' || lpad(next_suffix::TEXT, 2, '0');
  WHILE EXISTS (SELECT 1 FROM bookings WHERE code = candidate) LOOP
    next_suffix := next_suffix + 1;
    candidate := clean_base || '-' || lpad(next_suffix::TEXT, 2, '0');
  END LOOP;
  RETURN candidate;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_unique_booking_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_unique_booking_code(TEXT) TO authenticated;
```

### 2. `src/components/bookings/BookingFormDialog.tsx`

**`mutationFn`** (line 224-256):
- Bước 1: Gọi `supabase.rpc('generate_unique_booking_code', { base: form.code.trim() })` → lấy `safeCode`.
- Bước 2: Nếu `safeCode !== form.code.trim()` → toast info "Mã đã tồn tại, hệ thống dùng `safeCode`".
- Bước 3: Insert với `code: safeCode`.
- Bước 4: Bắt `error.code === '23505'` (race rất hiếm sau RPC) → retry 1 lần với `generate_unique_booking_code` again. Nếu vẫn fail → toast tiếng Việt "Mã booking đã tồn tại, vui lòng thử lại".

**`onError`** (line 262-264): map message tiếng Anh sang tiếng Việt:
- `23505` → "Mã booking đã tồn tại, hệ thống đang tạo mã mới"
- Khác → giữ message gốc nhưng prefix "Lỗi:".

Nút Lưu đã có `disabled={mutation.isPending}` + spinner (line 527-530) → TC5 đã pass, không cần sửa.

### 3. KHÔNG sửa

- `BookingFormDialog` không có mode edit → không cần phân biệt create/update.
- `B2BTours.tsx` chỉ truyền `prefillData.tour_code` xuống dialog → không cần đổi.
- Không xóa unique constraint, không đổi schema khác.

## Verify

| TC | Cách test | Kỳ vọng |
|---|---|---|
| TC1 | Tạo booking từ tour B2B `OS5N5D-260430` lần 1 | Code = `BK-OS5N5D-260430` (hoặc `-04` nếu DB đã có -01..-03) |
| TC2 | Tạo lần 2 cùng tour | Code tự tăng suffix, không lỗi 23505 |
| TC3 | Edit booking | Không qua dialog này → không insert mới (đã pass mặc định) |
| TC4 | Code trùng sẵn | RPC trả mã mới, toast info hiện |
| TC5 | Double-click Lưu | Nút disabled sau click 1 (đã có) |
| TC6 | Lỗi tiếng Việt | onError map 23505 → "Mã booking đã tồn tại..." |
| TC7 | Sau lưu | `qc.invalidateQueries(["bookings"])` đã có → list refresh |
| TC8 | Race 2 tab | `pg_advisory_xact_lock` serialize 2 RPC call → 2 code khác nhau |

## Bước apply migration

Sau khi approve plan này:
1. Tôi sẽ tạo file migration + sửa `BookingFormDialog.tsx`.
2. **User cần apply migration**: mở SQL Editor Supabase, paste nội dung file `.sql`, run.
   (Trong agent mode kế tiếp tôi sẽ dùng migration tool tự động — không cần thao tác tay.)

## Files

- `supabase/migrations/20260501090000_generate_unique_booking_code.sql` (mới)
- `src/components/bookings/BookingFormDialog.tsx` (sửa mutationFn + onError)
