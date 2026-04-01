

## Sửa các vấn đề P1/P2

### 1. Revenue chart N+1 query (`src/hooks/useDashboardData.ts`)

Thay 2 vòng loop 12 query bằng 1 query duy nhất cho mỗi hook:

- **`useBusinessDashboardData`** (line 107-138): Query tất cả bookings trong năm 1 lần, group by tháng ở client bằng `getMonth()` từ `created_at`
- **`usePersonalDashboardData`** (line 251-276): Tương tự, 1 query + group client-side

Không cần date-fns, dùng `new Date(row.created_at).getMonth()` là đủ.

### 2. Xóa toast trùng lặp

**Files cần sửa** (13 files import từ `use-toast`):

Chuyển tất cả sang `import { toast } from "sonner"`. Sonner toast API khác: `toast("title")` hoặc `toast.error("title", { description })`.

- Pattern `toast({ title: "X" })` → `toast("X")`
- Pattern `toast({ title: "X", description: "Y" })` → `toast("X", { description: "Y" })`
- Pattern `toast({ title: "X", variant: "destructive" })` → `toast.error("X")`
- Pattern `toast({ title: "X", description: "Y", variant: "destructive" })` → `toast.error("X", { description: "Y" })`
- Xóa `const { toast } = useToast()` — dùng import trực tiếp

**Xóa/cleanup**:
- `src/App.tsx`: xóa `<Toaster />` import và component, giữ `<Sonner />`
- `src/hooks/use-toast.ts`: xóa file (hoặc clear nội dung)
- `src/components/ui/use-toast.ts`: xóa file
- `src/components/ui/toaster.tsx`: xóa file

**Files cần migrate toast** (13 files):
- `src/pages/Login.tsx`, `ResetPassword.tsx`, `Leads.tsx`
- `src/components/payments/PaymentFormDialog.tsx`
- `src/components/quotations/QuotationFormDialog.tsx`
- `src/components/accommodations/AccommodationFormDialog.tsx`
- `src/components/itineraries/ItineraryFormDialog.tsx`
- `src/components/tour-packages/TourPackageFormDialog.tsx`
- `src/components/bookings/BookingItineraryTab.tsx`
- `src/components/customers/CustomerFormDialog.tsx`
- `src/components/leads/LeadFormDialog.tsx`
- `src/components/employees/EmployeeFormDialog.tsx`
- `src/components/settings/SettingsAccountsTab.tsx`

### 3. Fix branding (`index.html`)
- `<title>` → "Saigon Holiday CRM"
- `<meta description>` → "Hệ thống quản lý du lịch Saigon Holiday"
- `og:title` → "Saigon Holiday CRM"
- `og:description` → tương tự

### 4. Xóa App.css template (`src/App.css`)
- Xóa toàn bộ nội dung, giữ file rỗng

### 5. Fix loading check trùng (`src/App.tsx`)
- Trong `ProtectedRoutes` (line 35-40): bỏ đoạn loading check — `AppRoutes` đã handle rồi. Chỉ giữ session check.

### Files thay đổi
- `src/hooks/useDashboardData.ts` — optimize revenue query
- `src/App.tsx` — xóa Toaster + loading check
- `src/App.css` — clear content
- `index.html` — branding
- 13 component files — migrate toast sang sonner
- Xóa: `src/hooks/use-toast.ts`, `src/components/ui/use-toast.ts`, `src/components/ui/toaster.tsx`

