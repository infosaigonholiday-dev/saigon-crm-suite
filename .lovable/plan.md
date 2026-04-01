

# BÁO CÁO SECURITY AUDIT TOÀN HỆ THỐNG

---

## A. CREDENTIALS

### 1. File .env trong .gitignore
**❌ CẦN FIX** — File `.gitignore` hiện tại KHÔNG chứa `.env` hoặc `.env*`. Các file `.env` có thể bị commit vào Git, làm lộ credentials.
- **Fix**: Thêm `.env`, `.env.*`, `.env.local` vào `.gitignore`.

### 2. client.ts dùng import.meta.env
**✅ OK** — File `src/integrations/supabase/client.ts` sử dụng `import.meta.env.VITE_SUPABASE_URL` và `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY`. Không hardcode.

### 3. API key/secret hardcode trong source
**✅ OK** — Không tìm thấy JWT token, `sk-`, hay secret nào hardcode trong `src/` hoặc `supabase/functions/`. Các kết quả tìm kiếm chỉ trả về từ "password" trong form Login/ResetPassword (hợp lệ).

---

## B. RLS POLICIES — 5 bảng nhạy cảm

### 4. Bảng `customers`
**✅ OK**
- KETOAN: có SELECT ✅ (trong array `KETOAN`)
- MANAGER: filter theo `department_id = get_my_department_id()` ✅
- SALE: chỉ thấy `assigned_sale_id = auth.uid()` hoặc `created_by = auth.uid()` ✅

### 5. Bảng `leads`
**✅ OK**
- MANAGER: filter `department_id = get_my_department_id()` ✅
- SALE: chỉ thấy `assigned_to = auth.uid()` ✅
- KETOAN: có SELECT (hợp lý để đối soát) ✅

### 6. Bảng `bookings`
**✅ OK**
- KETOAN: có SELECT ✅
- MANAGER: filter `department_id = get_my_department_id()` ✅
- SALE: chỉ thấy `sale_id = auth.uid()` ✅

### 7. Bảng `transactions`
**✅ OK**
- HCNS: INSERT được — chỉ khi `submitted_by = auth.uid()` VÀ `approval_status IN ('DRAFT','PENDING_REVIEW')` ✅
- HCNS: SELECT chỉ khi `submitted_by = auth.uid()` (không thấy toàn bộ) ✅
- Admin/KETOAN/DIRECTOR: toàn quyền ✅

### 8. Bảng `employee_salaries`
**✅ OK** — Chỉ `ADMIN, HCNS, HR_MANAGER, HR_HEAD, DIRECTOR` có quyền ALL. Không role nào khác truy cập được.

---

## C. DELETE POLICIES

### 9. Tất cả bảng có DELETE policy

| Bảng | Ai được DELETE |
|------|---------------|
| booking_itineraries | ADMIN, SUPER_ADMIN ✅ |
| booking_special_notes | ADMIN, SUPER_ADMIN ✅ |
| bookings | ADMIN, SUPER_ADMIN ✅ |
| budget_estimates | ADMIN, SUPER_ADMIN ✅ |
| budget_settlements | ADMIN, SUPER_ADMIN ✅ |
| contracts | ADMIN, SUPER_ADMIN ✅ |
| customers | ADMIN, SUPER_ADMIN ✅ |
| department_sops | ADMIN, SUPER_ADMIN ✅ |
| **documents** | **uploaded_by = auth.uid()** ❌ |
| **employee_kpis** | **ADMIN, SUPER_ADMIN, DIRECTOR, HR_HEAD** ❌ |
| employees | ADMIN, SUPER_ADMIN ✅ |
| leads | ADMIN, SUPER_ADMIN ✅ |
| leave_requests | ADMIN, SUPER_ADMIN ✅ |
| marketing_expenses | ADMIN, SUPER_ADMIN ✅ |
| office_expenses | ADMIN, SUPER_ADMIN ✅ |
| other_expenses | ADMIN, SUPER_ADMIN ✅ |
| payroll | ADMIN, SUPER_ADMIN ✅ |
| sop_acknowledgements | ADMIN, SUPER_ADMIN ✅ |
| tour_services | ADMIN, SUPER_ADMIN ✅ |
| transactions | ADMIN, SUPER_ADMIN ✅ |
| vendors | ADMIN, SUPER_ADMIN ✅ |

**❌ CẦN FIX (2 bảng)**:
- **`documents`**: Cho phép bất kỳ user nào xóa file mình upload. Nên giới hạn chỉ ADMIN/SUPER_ADMIN xóa, hoặc giữ nguyên nếu chấp nhận user xóa file riêng.
- **`employee_kpis`**: Cho phép DIRECTOR và HR_HEAD xóa — vi phạm nguyên tắc "chỉ CEO xóa". Fix: thu hẹp về ADMIN, SUPER_ADMIN.

### 10. DEFAULT_PERMISSIONS — role nào có `.delete`
**✅ OK** — Chỉ ADMIN và SUPER_ADMIN (có `ALL_PERMISSION_KEYS` bao gồm `.delete`). Không role nào khác có key `.delete` trong `DEFAULT_PERMISSIONS`.

---

## D. ROUTE PROTECTION

### 11. Routes trong App.tsx
**❌ CẦN FIX (1 route)** — Route `/nha-cung-cap` (Vendors) KHÔNG có PermissionGuard:
```
<Route path="/nha-cung-cap" element={<ErrorBoundary><Vendors /></ErrorBoundary>} />
```
Tất cả route khác đều có PermissionGuard. Cần thêm guard cho Vendors (ví dụ `quotations.view` hoặc tạo key `vendors.view`).

### 12. Route /login và /reset-password
**✅ OK** — Cả hai nằm ngoài `ProtectedRoutes`, không bị guard chặn. `/login` có redirect nếu đã đăng nhập.

---

## E. PERMISSION SYNC (Client vs Server)

### 13. So sánh DEFAULT_PERMISSIONS vs get_default_permissions_for_role()

**❌ CẦN FIX — Có sự khác biệt đáng kể:**

| Role | Client (usePermissions.ts) | Server (DB function) | Khác biệt |
|------|---------------------------|---------------------|------------|
| ADMIN | Có `sop.view`, `sop.create` | **KHÔNG có** `sop.view`, `sop.create` | ❌ Client thừa |
| SUPER_ADMIN | Có `sop.view`, `sop.create` | **KHÔNG có** `sop.view`, `sop.create` | ❌ Client thừa |
| DIRECTOR | Có `sop.view`, `sop.create` | **KHÔNG có** | ❌ Client thừa |
| HCNS | Có `sop.view`, `sop.create` | **KHÔNG có** | ❌ Client thừa |
| HR_MANAGER | Có `sop.view`, `sop.create` | **KHÔNG có** | ❌ Client thừa |
| HR_HEAD | Có `sop.view`, `sop.create` | **KHÔNG có** | ❌ Client thừa |
| KETOAN | Có `sop.view` | **KHÔNG có** | ❌ Client thừa |
| MANAGER | Có `sop.view`, `sop.create` | **KHÔNG có** | ❌ Client thừa |
| DIEUHAN | Có `sop.view`, `sop.create` | **KHÔNG có** | ❌ Client thừa |
| SALE_* | Có `sop.view` | **KHÔNG có** | ❌ Client thừa |
| TOUR | Có `sop.view` | **KHÔNG có** | ❌ Client thừa |
| MKT | Có `sop.view` | **KHÔNG có** | ❌ Client thừa |
| INTERN | Có `sop.view` | **KHÔNG có** | ❌ Client thừa |

**Nguyên nhân**: Khi thêm module SOP, chỉ cập nhật client-side `DEFAULT_PERMISSIONS` mà **quên cập nhật** DB function `get_default_permissions_for_role()`.

---

## F. PHÁT HIỆN BỔ SUNG

### 14. Leaked Password Protection
**⚠️ CẢNH BÁO** — Supabase linter báo: Leaked password protection đang bị TẮT. Nên bật trong Supabase Dashboard → Auth → Settings.

---

## TÓM TẮT

| Mục | Trạng thái | Ưu tiên |
|-----|-----------|---------|
| A1. .env trong .gitignore | ❌ CẦN FIX | CAO |
| A2. client.ts dùng env vars | ✅ OK | — |
| A3. Không hardcode secrets | ✅ OK | — |
| B4-B8. RLS 5 bảng nhạy cảm | ✅ OK | — |
| C9. DELETE policies — documents | ❌ xem xét | THẤP |
| C9. DELETE policies — employee_kpis | ❌ CẦN FIX | TRUNG BÌNH |
| C10. Permissions .delete chỉ ADMIN | ✅ OK | — |
| D11. Route /nha-cung-cap thiếu guard | ❌ CẦN FIX | CAO |
| D12. Login/Reset không bị chặn | ✅ OK | — |
| E13. Permission sync client↔server | ❌ CẦN FIX | CAO |
| F14. Leaked password protection | ⚠️ CẢNH BÁO | TRUNG BÌNH |

## KẾ HOẠCH FIX (nếu phê duyệt)

1. **Thêm `.env*` vào `.gitignore`**
2. **Cập nhật DB function `get_default_permissions_for_role()`** — thêm `sop.view` và `sop.create` cho tất cả roles tương ứng với client
3. **Thu hẹp DELETE policy `employee_kpis`** — chỉ ADMIN, SUPER_ADMIN
4. **Thêm PermissionGuard cho route `/nha-cung-cap`**
5. **Bật Leaked Password Protection** trong Supabase Dashboard (thao tác thủ công)

