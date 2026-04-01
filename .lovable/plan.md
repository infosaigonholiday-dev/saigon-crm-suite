

## Kiểm tra phân quyền theo Role — Kết quả phân tích

### Hiện trạng

Sau khi review toàn bộ code, tôi phát hiện các vấn đề sau:

#### 1. Nút Xóa — CÓ LỖ HỔNG

| Trang | Trạng thái | Vấn đề |
|-------|-----------|--------|
| Employees.tsx (danh sách) | OK | Đã check `hasPermission("employees.delete")` |
| **EmployeeDetail.tsx** | **LỖI** | Nút Xóa hiển thị cho **tất cả** user, không check permission |
| **Vendors.tsx** | **LỖI** | Nút Xóa nằm trong `canEdit` — ai có quyền sửa đều thấy nút xóa |
| Customers, Leads, Bookings | OK | Không có nút xóa trong UI (chỉ RLS bảo vệ ở DB) |

#### 2. Data visibility (RLS) — OK

- **CEO/DIRECTOR**: RLS cho phép xem tất cả bảng chính (customers, bookings, employees, transactions...)
- **SALE_***: Chỉ thấy customers/leads/bookings mình tạo hoặc được assign (`sale_id = auth.uid()`, `assigned_sale_id = auth.uid()`)
- **HCNS**: Thấy employees, leave, payroll. Không thấy customers. Finance chỉ thấy record mình submit

#### 3. Sidebar — OK
- Đã dùng permission-based filtering, mỗi role chỉ thấy menu tương ứng

### Kế hoạch sửa (2 file)

**File 1: `src/pages/EmployeeDetail.tsx`**
- Thêm `usePermissions` hook
- Wrap nút Xóa trong điều kiện `hasPermission("employees.delete")`
- Chỉ ADMIN/SUPER_ADMIN mới thấy nút Xóa

**File 2: `src/pages/Vendors.tsx`**
- Tách nút Xóa ra khỏi block `canEdit`
- Thêm check `hasPermission("bookings.delete")` hoặc kiểm tra role ADMIN/SUPER_ADMIN riêng cho nút Xóa vendor

### Chi tiết kỹ thuật

EmployeeDetail.tsx: Thêm `const { hasPermission } = usePermissions()` và wrap `<AlertDialog>` trong `{hasPermission("employees.delete") && (...)}`

Vendors.tsx: Tách `<Button>` xóa ra ngoài `canEdit`, thêm biến `const canDelete = hasPermission("bookings.delete")` hoặc check role trực tiếp vì vendors chưa có permission key riêng. Giải pháp đơn giản nhất: chỉ hiện nút xóa cho ADMIN/SUPER_ADMIN bằng cách check `userRole`.

