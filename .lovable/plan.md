

## Kế hoạch triển khai (đã cập nhật)

### Nguyên tắc

Thực tập sinh KD, Trưởng phòng KD (MANAGER), và Giám đốc KD (GDKD) đều **chỉ được sửa khách hàng do chính mình tạo hoặc được phân công** — không được sửa khách hàng của người khác. Database RLS đã bảo vệ điều này sẵn.

### Phần 1: Thêm quyền `customers.edit` (frontend + DB)

**Các vai trò cần thêm `customers.edit`:**
- `GDKD` (Giám đốc Kinh doanh)
- `MANAGER` (Trưởng phòng)
- `INTERN_SALE_DOMESTIC`, `INTERN_SALE_OUTBOUND`, `INTERN_SALE_MICE`, `INTERN_SALE_INBOUND`

**File thay đổi:**
- `src/hooks/usePermissions.ts` — thêm `"customers.edit"` vào 6 nhóm trên
- **Migration SQL** — cập nhật hàm `get_default_permissions_for_role` thêm `'customers.edit'` vào các case tương ứng

**Bảo vệ phía database (đã có sẵn):**
RLS policy `customers_update` chỉ cho phép UPDATE khi `created_by = auth.uid()` hoặc `assigned_sale_id = auth.uid()`. Nếu cố sửa khách hàng của người khác → bị database chặn.

### Phần 2: Tạo file PDF hướng dẫn sử dụng

Tạo tại `/mnt/documents/` — nội dung tiếng Việt:

1. **Quy trình tạo tài khoản & nhân sự mới** (Admin, HCNS)
2. **Hướng dẫn theo vai trò:**
   - **ADMIN**: Toàn quyền quản trị hệ thống
   - **HCNS**: Nhân sự, nghỉ phép, bảng lương
   - **Điều hành (DIEUHAN)**: Booking, dự toán, nhà cung cấp, khách hàng
   - **Thực tập sinh KD**: Xem/tạo/sửa khách hàng **của mình**, leads, đặt tour
   - **GDKD & MANAGER**: Quản lý phòng ban, xem/tạo/sửa khách hàng **của mình**

### Phần 3: Trang hướng dẫn trong app

- Tạo `src/pages/UserGuide.tsx` — hiển thị hướng dẫn theo role hiện tại
- Thêm route `/huong-dan` và mục "Hướng dẫn" vào sidebar

