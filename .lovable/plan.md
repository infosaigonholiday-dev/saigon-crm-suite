

## Kế hoạch: Hiển thị phòng ban + Scoping phân bổ KH

### Vấn đề hiện tại
1. **Danh sách KH** không có cột "Phòng ban" → ADMIN không biết KH thuộc phòng nào
2. **Dropdown "Sale phụ trách"** trong form tạo KH hiện liệt kê **tất cả sale** từ mọi phòng → GDKD có thể gán nhầm KH cho sale phòng khác
3. GDKD cần chỉ phân bổ được cho nhân viên **cùng phòng ban** mình

### Thay đổi

#### 1. Thêm cột "Phòng ban" vào danh sách KH (`src/pages/Customers.tsx`)
- Query thêm `department_id` và join `departments(name)` để hiển thị tên phòng ban
- Thêm cột "Phòng ban" vào bảng — hiển thị cho tất cả scope (ADMIN thấy tên phòng, GDKD cũng thấy)
- ADMIN scope=all → thấy tất cả KH + cột phòng ban giúp phân biệt

#### 2. Scope dropdown "Sale phụ trách" theo phòng ban (`src/components/customers/CustomerFormDialog.tsx`)
- **ADMIN/SUPER_ADMIN**: Hiển thị tất cả sale (giữ nguyên)
- **GDKD/MANAGER**: Chỉ hiển thị sale cùng `department_id` với mình
- **SALE_*/INTERN_***: Mặc định gán chính mình (auto-fill `assigned_sale_id = user.id`)
- Thêm filter `.eq("department_id", myProfile.department_id)` vào query `salesProfiles` khi role không phải ADMIN

#### 3. Thêm cột "Phòng ban" cho GDKD (hiện đã có `department_id` nhờ trigger)
- GDKD có thể phân bổ lại bằng cách edit `assigned_sale_id` → trigger tự cập nhật `department_id`

### File thay đổi

| File | Thay đổi |
|------|----------|
| `src/pages/Customers.tsx` | Thêm cột "Phòng ban", join `departments(name)` |
| `src/components/customers/CustomerFormDialog.tsx` | Scope dropdown sale theo department khi role = GDKD/MANAGER |

### Không cần migration
Trigger `set_customer_department` đã hoạt động. Chỉ cần sửa frontend.

