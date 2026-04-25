# Đổi tên "Kho Tour B2B" → "LKH Tour 2026" triệt để

Còn 4 chỗ trong code chưa đổi tên. Sửa text/comment thuần, không động DB, không ảnh hưởng logic.

## Files sửa

### 1. `src/components/bookings/BookingFormDialog.tsx`
- **Dòng 122**: `<div className="font-semibold mb-1">Tạo từ tour B2B</div>` → `Tạo từ LKH Tour 2026` *(khung xanh anh thấy trong popup)*
- **Dòng 46**: Comment `// Pre-fill khi mở dialog từ Kho Tour B2B` → `// Pre-fill khi mở dialog từ LKH Tour 2026`

### 2. `src/hooks/usePermissions.ts`
- **Dòng 48**: `b2b_tours: { label: "Kho Tour B2B", ... }` → `label: "LKH Tour 2026"` *(ảnh hưởng UI Cài đặt → Phân quyền)*

### 3. `src/pages/Bookings.tsx`
- **Dòng 46**: Comment `// Đọc prefill_tour từ URL khi từ Kho Tour B2B chuyển sang` → đổi tương tự

## Không thay đổi
- Tên route `/kho-tour-b2b`, key permission `b2b_tours.*`, tên bảng DB, biến `prefillData.tour_code` — giữ nguyên (chỉ là định danh kỹ thuật, không hiển thị cho user).
