

## Fix: Gán `department_id` cho khách hàng

### Về câu hỏi mở rộng
**Được.** Bảng `departments` là bảng động. Khi cần mở thêm phòng KD Nội Địa 2, 3... chỉ cần:
- Thêm bản ghi mới vào `departments` (VD: "KD Nội Địa 2", code "DOMESTIC_2")
- Gán nhân viên vào `department_id` mới
- RLS + frontend filter theo `department_id` nên **không cần sửa code**

Nếu sau này muốn phân cấp cha-con (VD: "KD Nội Địa" → "KD NĐ 1", "KD NĐ 2"), chỉ cần thêm cột `parent_id` vào bảng `departments`. Hiện tại chưa cần.

### Kế hoạch fix hiện tại (đã duyệt, giữ nguyên)

#### 1. Migration SQL — Trigger + Backfill
- Tạo function `set_customer_department()`: khi INSERT hoặc UPDATE `assigned_sale_id`/`created_by` → tự lookup `department_id` từ `profiles` → gán vào KH
- Tạo trigger `trg_set_customer_department` trên bảng `customers`
- Backfill 14 KH hiện tại dựa trên `assigned_sale_id` hoặc `created_by`

#### 2. Frontend — `CustomerFormDialog.tsx`
- Query `department_id` của user hiện tại
- Gán kèm khi insert (phòng thủ thêm, dù trigger đã xử lý)

### File thay đổi

| File | Hành động |
|------|-----------|
| Migration SQL | Trigger `set_customer_department` + backfill data |
| `src/components/customers/CustomerFormDialog.tsx` | Gán `department_id` khi insert |

