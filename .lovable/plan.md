
# 🎯 Kế hoạch tối ưu hệ thống — 6 hạng mục đồng bộ

> **Mục tiêu đo lường**: Bundle chính < 600KB (hiện 2.3MB) · Dashboard load < 3s (hiện ~6s) · Giảm 80% query Dashboard · Hết spam thông báo

---

## 1️⃣ Lazy Loading Routes + Code Splitting

**File: `src/App.tsx`**
- Chuyển 25 page imports sang `React.lazy(() => import(...))`
- Giữ nguyên `Login`, `NotFound` import tĩnh (cần ngay khi vào app)
- Bọc `<Routes>` trong `<Suspense fallback={<LoadingScreen />}>` với spinner Loader2 căn giữa
- Tạo component `LoadingScreen` nội bộ tái dùng

**File: `vite.config.ts`** — thêm `build.rollupOptions.output.manualChunks`:
```ts
manualChunks: {
  'vendor-react': ['react','react-dom','react-router-dom'],
  'vendor-ui': ['@radix-ui/react-dialog','@radix-ui/react-dropdown-menu',
                '@radix-ui/react-select','@radix-ui/react-popover',
                '@radix-ui/react-tabs','@radix-ui/react-toast','lucide-react'],
  'vendor-charts': ['recharts'],
  'vendor-supabase': ['@supabase/supabase-js'],
  'vendor-query': ['@tanstack/react-query'],
  'vendor-forms': ['react-hook-form','@hookform/resolvers','zod'],
  'vendor-date': ['date-fns','react-day-picker'],
}
```
- Thêm `chunkSizeWarningLimit: 800`

**Kết quả dự kiến**: Initial bundle ~500KB, từng page load on-demand 30-150KB.

---

## 2️⃣ Gộp 39 Queries Dashboard → 3 RPC (cho phép tinh giản nhẹ)

### Migration tạo 3 RPC functions:

**a. `rpc_dashboard_business(p_user_id, p_scope, p_dept_id)` → JSONB**
```json
{
  "stats": { "monthly_revenue", "new_bookings", "new_leads", "customer_count" },
  "revenue_by_month": [{ "month": "T1", "value": 0 }, ...],
  "deadlines": [{ "customer", "tour", "type", "amount" }]
}
```
Một query duy nhất với CTEs gộp: bookings, leads, customers, deadlines.

**b. `rpc_dashboard_ceo(p_user_id, p_dept_id)` → JSONB**  
Trả về: `customer_overview` (tổng/mới/tier), `pipeline_funnel` (count theo status), `sale_performance` (top 10 sales theo revenue tháng), `revenue_cost_profit` (12 tháng).

**c. `rpc_dashboard_personal(p_user_id)` → JSONB**  
Trả về: `my_bookings`, `my_leads`, `my_customers`, `my_revenue`, `monthly_chart`.

Tất cả `SECURITY DEFINER`, kiểm tra `auth.uid() = p_user_id` hoặc role admin để chống lạm dụng.

### Refactor frontend:
- **`src/hooks/useDashboardData.ts`**: viết lại `useBusinessDashboardData` và `usePersonalDashboardData` chỉ gọi 1 RPC mỗi cái, `staleTime: 5 * 60 * 1000`, `refetchOnWindowFocus: false`.
- Tạo mới `useCeoDashboardData()` cho khối CEO.
- **`src/pages/Dashboard.tsx`**: thay loạt `useQuery` rời thành các hook RPC ở trên. Bỏ widget `lead-kpis` rời (đã gộp vào `rpc_dashboard_business`).
- **Tinh giản nhẹ** (sẽ liệt kê trước khi xóa): bỏ `careCount` realtime trên dashboard (chỉ giữ trên trang Leads), bỏ widget "interested_count" trùng với pipeline funnel.
- **`src/components/dashboard/CeoDashboardCharts.tsx`**, `CeoCustomerOverview.tsx`, `SalePerformanceTable.tsx`, `PipelineFunnel.tsx`, `WeeklyTrendChart.tsx`: nhận dữ liệu qua **prop** từ `useCeoDashboardData()` thay vì tự fetch.

**Kết quả**: 39 → 3 round-trips. Cache 5 phút.

---

## 3️⃣ Indexes Database

Migration thêm 4 indexes (KHÔNG dùng `CONCURRENTLY` — Supabase migration chạy trong transaction):
```sql
CREATE INDEX IF NOT EXISTS idx_profiles_role_active ON profiles(role) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_raw_contacts_created_by ON raw_contacts(created_by);
CREATE INDEX IF NOT EXISTS idx_raw_contacts_department ON raw_contacts(department_id);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC);
```
Bonus indexes hỗ trợ Dashboard mới:
```sql
CREATE INDEX IF NOT EXISTS idx_bookings_sale_id_created ON bookings(sale_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_dept_created ON bookings(department_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_dept_status ON leads(department_id, status);
```

---

## 4️⃣ Sắp lại Sidebar theo luồng nghiệp vụ

**File: `src/components/AppSidebar.tsx`** — tách `crmItems` thành 2 nhóm:

```ts
// 💼 KINH DOANH
businessItems = [
  Kho Data, Tiềm năng, Khách hàng,
  Báo giá, Đặt tour, Hợp đồng, Thanh toán
]

// 📦 SẢN PHẨM TOUR
productItems = [
  Gói tour, Lịch trình, Lưu trú, Nhà cung cấp, LKH Tour 2026
]
```
Render thành 2 `SidebarGroup` riêng với label "KINH DOANH" và "SẢN PHẨM". Giữ nguyên HR / Tài chính / Quy trình / Cài đặt / Hướng dẫn / Cảnh báo.

---

## 5️⃣ Fix Notification Spam

### Migration:
- Thêm cột `kt_assigned_id UUID REFERENCES profiles(id)` vào `budget_estimates` và `budget_settlements` (nullable).
- Sửa trigger `notify_budget_estimate_change()` và `notify_budget_settlement_change()`:
  - Nếu `kt_assigned_id IS NOT NULL` → chỉ gửi cho người đó.
  - Else → gửi 1 KETOAN active đầu tiên (sort theo `created_at`) + ADMIN.
- Sửa trigger `notify_leave_request_change()`:
  - **NV thường** (không phải manager): chỉ gửi `MANAGER/GDKD cùng phòng` + `HR_MANAGER/HCNS`. **KHÔNG gửi ADMIN.**
  - **Manager-level** (MANAGER/GDKD/DIEUHAN/PHO_PHONG/TRUONG_PHONG): gửi `HR_MANAGER` + `ADMIN/SUPER_ADMIN`.
  - **Admin xin nghỉ**: gửi ADMIN khác + HR_MANAGER (giữ logic hiện tại).

### UI gán KT phụ trách:
- **`src/components/finance/BudgetEstimatesTab.tsx`** + **`BudgetSettlementsTab.tsx`**: thêm dropdown "KT phụ trách" trong form (chỉ hiện cho ADMIN/KETOAN), load danh sách `profiles` role=`KETOAN` is_active.
- Cột mới "KT phụ trách" trong table (hiển thị tên).

---

## 6️⃣ Chuẩn hóa UI

### a. RawContacts → tách Dialog thành component
- Tạo mới **`src/components/raw-contacts/RawContactFormDialog.tsx`** (~250 dòng)
- Trích logic form tạo/sửa từ `src/pages/RawContacts.tsx` (728 dòng → ~470 dòng)
- Props: `open`, `onOpenChange`, `contact?` (để edit), `onSuccess`
- Đồng bộ pattern với `LeadFormDialog`, `CustomerFormDialog`

### b. B2BTours → **GIỮ Sheet** (theo chọn lựa của bạn)
- Không đổi B2BTourDetailSheet
- Thay vào đó: kiểm tra các module khác xem có pattern Sheet nào dùng cho detail view không, ghi note coding-standard rằng "Sheet OK cho detail view phức tạp; Dialog cho form CRUD đơn".

---

## 📋 Thứ tự thực hiện (1 lượt)

1. **Migration #1**: indexes + cột `kt_assigned_id` + sửa 3 trigger notifications
2. **Migration #2**: tạo 3 RPC dashboard functions
3. **Code: vite.config.ts** — manualChunks
4. **Code: App.tsx** — lazy + Suspense
5. **Code: useDashboardData.ts** + tạo `useCeoDashboardData.ts` — gọi RPC
6. **Code: Dashboard.tsx** + 5 component CEO — nhận props
7. **Code: AppSidebar.tsx** — tách 2 group
8. **Code: RawContactFormDialog.tsx** mới + refactor RawContacts.tsx
9. **Code: BudgetEstimatesTab + BudgetSettlementsTab** — dropdown KT
10. **Verify**: build, đo bundle size, mở Dashboard test < 3s

## ⚠️ Rủi ro & Mitigation

| Rủi ro | Mitigation |
|--------|------------|
| RPC mới sai data so với code cũ | So sánh số liệu trước/sau trên 1 user test |
| Lazy loading flicker khi chuyển trang | Suspense fallback giữ skeleton/spinner ngắn |
| Trigger leave gửi thiếu người quan trọng | Test 3 case: NV thường, Manager, Admin |
| Cột `kt_assigned_id` cũ NULL → vẫn gửi cho 1 KT đầu tiên | Fallback đã có sẵn |

## 🧪 Verification cuối

- `bun run build` → check `dist/assets/*.js` chia thành nhiều chunk, main < 600KB
- Mở `/` → Network tab: chỉ 1 RPC call cho dashboard data (thay vì 39)
- Tạo 1 leave request từ NV thường → chỉ HR + Manager phòng nhận, ADMIN không nhận
- Sidebar hiển thị đúng 2 group "KINH DOANH" và "SẢN PHẨM"

