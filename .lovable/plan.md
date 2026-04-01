

## Tạo PermissionGuard và áp dụng cho protected routes

### File 1: Tạo mới `src/components/PermissionGuard.tsx`

Component nhận `permission` (PermissionKey) + `children`. Dùng `usePermissions()` để check quyền. Loading → spinner, không quyền → toast + redirect `/`, có quyền → render children. Dùng `useEffect` + `useRef` để toast chỉ fire 1 lần.

### File 2: Sửa `src/App.tsx`

- Bỏ loading check trong `ProtectedRoutes` (giữ lại trong `AppRoutes`)
- Bọc PermissionGuard cho 14 routes theo mapping user yêu cầu
- Di chuyển `<Route path="*" element={<NotFound />} />` vào trong ProtectedRoutes

### Route mapping

| Route | Permission |
|-------|-----------|
| `/khach-hang`, `/khach-hang/:id` | `customers.view` |
| `/tiem-nang` | `leads.view` |
| `/dat-tour`, `/dat-tour/:id` | `bookings.view` |
| `/bao-gia`, `/goi-tour`, `/lich-trinh`, `/luu-tru` | `quotations.view` |
| `/thanh-toan` | `payments.view` |
| `/nhan-su`, `/nhan-su/:id` | `employees.view` |
| `/nghi-phep` | `leave.view` |
| `/bang-luong` | `payroll.view` |
| `/tai-chinh` | `finance.view` |
| `/cai-dat` | `settings.view` |

### Không thay đổi

- Dashboard (`/`) không cần guard
- Sidebar filtering đã có sẵn — PermissionGuard là lớp bảo vệ thứ 2 chống truy cập trực tiếp URL
- Không thay đổi hooks, contexts, hay components khác

