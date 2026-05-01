# Hiển thị "Điểm Nổi Bật" cho B2B Tour

Cột `highlights` (text, phân cách `|`) đã được thêm vào bảng `b2b_tours`. Print template `public/print/booking-confirmation.html` đã sẵn block `data-field="highlights_list"`. Chỉ cần 2 thay đổi code.

## 1. `src/pages/B2BTours.tsx` — thêm cột "Điểm Nổi Bật"

- Thêm `highlights` vào `select(...)` của query `b2b-tours` (dòng 94).
- Thêm `<TableHead>Điểm Nổi Bật</TableHead>` vào header (sau cột "Điểm đến").
- Thêm `<TableCell>` render danh sách: split chuỗi `highlights` bằng `|`, trim, bỏ rỗng → render dạng các `<Badge variant="outline">` xếp `flex flex-wrap gap-1`. Nếu rỗng → `—`. Giới hạn hiển thị 4 mục đầu, dư thì `+N`, hover (title) hiện full để không vỡ layout.
- Cập nhật `colSpan` của row "Chưa có tour nào" từ 10 → 11.
- Cập nhật type `B2BTour` trong `src/components/b2b-tours/B2BTourDetailSheet.tsx` (chỉ thêm field `highlights?: string | null`) để TS không báo lỗi — không sửa UI sheet.

## 2. `src/pages/BookingConfirmationPrint.tsx` — nạp highlights vào phiếu in

- Mở rộng `select` của query `print-b2b-tour` (dòng ~107) để lấy thêm `highlights`.
- Thay logic build `highlights: string[]` (dòng 222-228):
  - Ưu tiên: nếu `b2bTour.highlights` có giá trị → split bằng `|`, trim, bỏ rỗng, slice 12.
  - Fallback (giữ tương thích cũ): nếu không có `highlights` mà có `notes` → giữ logic split cũ bằng `\n;•-`.
- Phần `dataMap` (dòng 259) giữ nguyên: chỉ gắn `highlights_list` khi mảng > 0 — template HTML đã tự render.

## Kỹ thuật

- Không đổi schema DB, không đổi RLS, không sửa edge function.
- Không động đến print template HTML (đã hỗ trợ sẵn `highlights_list`).
- File `src/integrations/supabase/types.ts` đã tự động có cột `highlights` (đã grep thấy) → query select hợp lệ.

## Test

1. Vào `/lkh-tour-2026`: cột "Điểm Nổi Bật" hiển thị các badge tách bằng `|`.
2. Tạo booking từ 1 tour có `highlights` → mở phiếu in → mục "Điểm Nổi Bật" liệt kê đúng từng item.
3. Tour không có `highlights` nhưng có `notes` → vẫn render như cũ (fallback).
4. Tour không có cả 2 → mục highlights ẩn (template có sẵn behavior này).
