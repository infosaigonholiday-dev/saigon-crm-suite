

# Xuất tài liệu phân tích cấu trúc code & phân quyền (.docx)

## Tổng quan
Tạo file DOCX chi tiết phân tích toàn bộ kiến trúc dự án Saigon Holiday Travel CRM, bao gồm cây thư mục, hệ thống phân quyền 22 vai trò, ma trận quyền hạn, scope rules, và cấu trúc routing/sidebar.

## Nội dung tài liệu

### 1. Tổng quan dự án
- Tech stack: React 18 + Vite 5 + TypeScript + Tailwind CSS + Supabase
- Kiến trúc: SPA client-side với Supabase backend (Auth, DB, Storage, Edge Functions)

### 2. Cây thư mục dự án
- `src/pages/` — 28 trang (Dashboard, Customers, Leads, Bookings, Finance, Settings...)
- `src/components/` — 16 nhóm component (accommodations, bookings, contracts, employees, finance, settings, ui...)
- `src/contexts/` — AuthContext, PermissionsContext
- `src/hooks/` — usePermissions, useScopedQuery, useDashboardData
- `src/lib/` — positionRoleMapping, exportUtils, utils
- `supabase/migrations/` — 72 migration files
- `supabase/functions/` — 2 edge functions (daily-reminders, manage-employee-accounts)

### 3. Hệ thống phân quyền
- **22 vai trò** chia 4 cấp: Admin → Quản lý → Nhân viên → Thực tập
- **17 module** với 56 permission keys (dashboard, customers, leads, bookings, quotations, tour_packages, itineraries, accommodations, suppliers, contracts, payments, staff, leave, payroll, finance, workflow, settings)
- **Ma trận quyền**: Bảng chi tiết vai trò × quyền hạn (view/create/edit/delete/approve/export/submit)
- **Scope rules**: all / department / personal cho từng vai trò + module

### 4. Cấu trúc routing & bảo vệ
- Route → PermissionGuard → module + action mapping
- Sidebar filtering theo getVisibleModules()

### 5. Position-Role mapping
- 10 phòng ban × 7 vị trí → role tự động gợi ý

### 6. Dashboard types
- 4 loại: business (ADMIN/KETOAN), hr (HCNS/HR_MANAGER), manager (MANAGER/GDKD/DIEUHAN), personal (còn lại)

## Cách thực hiện
1. Tạo script Node.js sử dụng thư viện `docx` để generate file .docx
2. Bao gồm bảng biểu chi tiết (ma trận quyền, scope rules, position mapping)
3. Xuất file ra `/mnt/documents/SaigonHoliday_ProjectAnalysis.docx`

## File output
- `/mnt/documents/SaigonHoliday_ProjectAnalysis.docx`

