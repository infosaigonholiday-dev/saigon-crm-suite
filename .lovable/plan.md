

## Kế hoạch: Cập nhật hệ thống phân quyền (8 thay đổi)

### Tổng quan

Cập nhật đồng bộ 3 nơi: `DEFAULT_PERMISSIONS` (frontend), `SCOPE_RULES` (frontend), và `get_default_permissions_for_role()` (DB function). Thêm permission key mới `finance.approve` và `contracts.approve`. Xây thêm section "Tổng quan Khách hàng" trên CEO Dashboard.

### Phần A: Thêm permission keys mới

**File:** `src/hooks/usePermissions.ts`

Thêm vào `ALL_PERMISSION_KEYS`:
- `"finance.approve"` 
- `"contracts.approve"`

Cập nhật `PERMISSION_GROUPS`:
- finance: thêm `"finance.approve"`
- contracts: thêm `"contracts.approve"`

---

### Phần B: Cập nhật DEFAULT_PERMISSIONS (8 thay đổi)

**File:** `src/hooks/usePermissions.ts`

| # | Role | Thay đổi |
|---|------|----------|
| 1 | DIEUHAN | customers: bỏ `edit` → `[view, create]`; leads: bỏ `edit` → `[view, create]`; payments: bỏ `create, edit` → `[view]`; thêm `contracts.approve` |
| 2 | KETOAN | Thêm `finance.approve`; giữ nguyên phần còn lại (đã đúng) |
| 3 | SALE_* (4 loại) | Thêm `contracts.view` (hiện thiếu); phần còn lại đã đúng |
| 4 | TOUR | Đã đúng, không đổi |
| 5 | HCNS | Bỏ `finance.view`; thêm `contracts.view`, `contracts.create`, `contracts.edit`, `payments.view`, `suppliers.view` |
| 6 | HR_MANAGER | Thêm `finance.approve`; thêm `contracts.create`, `contracts.edit`; thêm `payments.view`, `suppliers.view` |
| 6 | GDKD | Thêm `contracts.approve`; bỏ `payments.create` nếu không cần (giữ nguyên theo yêu cầu) |
| 6 | MANAGER | Thêm `contracts.approve` |

---

### Phần C: Cập nhật SCOPE_RULES

**File:** `src/contexts/PermissionsContext.tsx`

Scope rules hiện tại cho GDKD và MANAGER đã là `default: "department"`, SALE_* và INTERN_SALE_* đã là `default: "personal"` — **đã đúng theo yêu cầu #7**.

DIEUHAN hiện có `default: "all"` — giữ nguyên vì DIEUHAN cần xem booking toàn bộ để điều hành tour.

---

### Phần D: Migration SQL — đồng bộ DB function

Tạo migration cập nhật `get_default_permissions_for_role()` khớp chính xác với DEFAULT_PERMISSIONS mới:
- DIEUHAN: bỏ `customers.edit`, `leads.edit`, `payments.create`, `payments.edit`; thêm `contracts.approve`
- KETOAN: thêm `finance.approve`
- HCNS: bỏ `finance.view`; thêm `contracts.view/create/edit`, `payments.view`, `suppliers.view`
- HR_MANAGER: thêm `finance.approve`, `contracts.create/edit`, `payments.view`, `suppliers.view`
- GDKD: thêm `contracts.approve`
- MANAGER: thêm `contracts.approve`
- SALE_*: thêm `contracts.view`

---

### Phần E: CEO Dashboard — Section "Tổng quan Khách hàng"

**File:** `src/components/dashboard/CeoCustomerOverview.tsx` (mới)

Component hiển thị cho ADMIN/SUPER_ADMIN:
1. **Tổng KH toàn công ty** — `SELECT count(*) FROM customers`
2. **KH mới tháng này** (so sánh % với tháng trước)
3. **Top 5 KH doanh thu cao nhất** — `ORDER BY total_revenue DESC LIMIT 5`
4. **Tỷ lệ chuyển đổi Lead → KH** — `leads (status=CONVERTED) / total leads`
5. **KH bỏ quên** (không booking > 3 tháng) — `WHERE last_booking_date < now() - interval '3 months'`
6. **Biểu đồ so sánh hiệu quả giữa các nhánh KD** — nhóm theo department

Data lấy từ bảng `customers`, `leads`, `bookings` — không tạo bảng mới.

**File:** `src/pages/Dashboard.tsx`

Import và render `CeoCustomerOverview` sau `CeoDashboardCharts`, chỉ khi `canViewRevenue` (ADMIN/KETOAN). Hoặc chính xác hơn: chỉ ADMIN/SUPER_ADMIN.

---

### Tóm tắt file thay đổi

| File | Hành động |
|------|-----------|
| `src/hooks/usePermissions.ts` | Thêm keys, cập nhật 10+ role |
| `src/contexts/PermissionsContext.tsx` | Không đổi (scope đã đúng) |
| `src/components/dashboard/CeoCustomerOverview.tsx` | Tạo mới |
| `src/pages/Dashboard.tsx` | Import + render component mới |
| Migration SQL | Cập nhật DB function |

