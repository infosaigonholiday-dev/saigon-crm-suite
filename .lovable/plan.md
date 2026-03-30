

## Bổ sung thông tin khách hàng

### Phân tích hiện trạng

Bảng `customers` đã có sẵn: `address`, `company_name`, `tax_code`, `segment`, `total_bookings`, `total_revenue`, `total_paid`, `assigned_sale_id`, `zalo_id`, `created_at`. Chỉ cần thêm các cột mới còn thiếu.

### 1. Database Migration -- Thêm cột mới

Thêm 9 cột vào bảng `customers`:

| Cột | Kiểu | Mục đích |
|-----|------|----------|
| `date_of_birth` | date | Ngày sinh |
| `gender` | text | Nam/Nữ/Khác |
| `id_number` | text | CCCD/Passport |
| `source` | text | Nguồn KH (Facebook, Zalo...) |
| `company_address` | text | Địa chỉ công ty |
| `contact_person` | text | Người liên hệ |
| `contact_position` | text | Chức vụ người LH |
| `company_email` | text | Email công ty |
| `founded_date` | date | Ngày thành lập |
| `employee_count` | integer | Quy mô nhân sự |

Giữ nguyên các cột đã tồn tại (`address`, `company_name`, `tax_code`, `assigned_sale_id`, `segment`, `total_bookings`, `total_revenue`, `total_paid`).

### 2. Cập nhật CustomerFormDialog

Chuyển form thành 2 tabs dùng Radix Tabs:

**Tab "Thông tin cơ bản":**
- Họ tên (required), SĐT (required), Email, Ngày sinh (date picker), Giới tính (radio), CCCD/Passport, Địa chỉ, Nguồn (select), Zalo ID, Sale phụ trách (select -- query profiles với role SALE_*)

**Tab "Thông tin công ty":**
- Tên công ty, MST (validate 10 số), Địa chỉ công ty, Người liên hệ, Chức vụ, Email công ty, Ngày thành lập, Quy mô nhân sự

**Validation bổ sung:**
- MST: `/^\d{10}$/`
- Ngày sinh < today
- SĐT trở thành required

### 3. Cập nhật danh sách Customers.tsx

- Thêm cột "Nguồn" và "Sale phụ trách" vào bảng
- Query thêm `source`, `assigned_sale_id` + join profiles để lấy tên sale
- Badge phân hạng đã có sẵn (segment)

### Files thay đổi

| File | Thay đổi |
|------|----------|
| Migration SQL | ALTER TABLE add 9 columns |
| `src/components/customers/CustomerFormDialog.tsx` | Thêm tabs, thêm fields, thêm query profiles |
| `src/pages/Customers.tsx` | Thêm cột nguồn + sale, update query |
| `src/integrations/supabase/types.ts` | Auto-updated |

