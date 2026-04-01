

# BÁO CÁO PERFORMANCE & CODE QUALITY AUDIT

---

## A. N+1 QUERIES

**1. useDashboardData.ts — revenue chart query**
✅ OK — Single query fetches all bookings for the year (`select("total_value, created_at").gte(...).lt(...)`), then `groupByMonth()` groups client-side. No loop of 12 queries.

**2. Supabase query trong vòng loop**
✅ OK — No `.map(...)` or `.forEach(...)` calling `supabase.from(...)` found anywhere in `src/`.

---

## B. PAGINATION

**3. Customers.tsx — pagination**
✅ OK — `PAGE_SIZE = 20`, `.range(page * PAGE_SIZE, ...)`, page controls present. Resets `setPage(0)` on filter/search change.

**4. Leads.tsx — pagination**
❌ CẦN FIX — Has pagination (PAGE_SIZE=20, range query), but does NOT reset `setPage(0)` when filter changes. Leads uses Kanban view with no filter controls that call setPage, but the page state can get stale.

**5. Bookings.tsx — pagination**
❌ CẦN FIX — Has pagination (PAGE_SIZE=20, range query), but does NOT reset `setPage(0)` when any filter changes. No filter controls exist that reset page.

**6. Page size = 20? Reset page khi filter thay đổi?**
✅ / ❌ — Page size = 20 everywhere. Reset on filter: only Customers and Employees do it. Leads and Bookings don't (see items 4-5).

---

## C. ERROR HANDLING

**7. ErrorBoundary component tồn tại?**
✅ OK — `src/components/ErrorBoundary.tsx` exists with proper `getDerivedStateFromError` + reload button.

**8. Các route chính bọc ErrorBoundary?**
✅ OK — All routes in `App.tsx` wrapped with `<ErrorBoundary>`.

**9. Supabase queries handle error?**
✅ OK — Most queries use `if (error) throw error` pattern, which React Query catches and surfaces. Dashboard queries silently return empty arrays (acceptable for stats).

---

## D. TOAST SYSTEM

**10. Chỉ dùng Sonner?**
✅ OK — All imports use `import { toast } from "sonner"`. No Radix Toaster component found.

**11. use-toast.ts đã xóa?**
✅ OK — No file `use-toast.ts` exists. No imports found.

---

## E. CODE CLEANUP

**12. App.css — no Vite template CSS?**
✅ OK — `src/App.css` is empty (0 lines).

**13. index.html title = "Saigon Holiday CRM"?**
✅ OK — `<title>Saigon Holiday CRM</title>`. No "Lovable App".

**14. main.tsx — React.StrictMode?**
❌ CẦN FIX — `main.tsx` renders `<App />` directly without `React.StrictMode`. Should wrap with `<StrictMode>` for development checks.

**15. Loading check — no duplicate between ProtectedRoutes and AppRoutes?**
✅ OK — Only `AppRoutes` checks `loading`. `ProtectedRoutes` only checks `session`.

---

## F. TYPE SAFETY

**16. Bảng mới có type definitions trong types.ts?**
✅ OK — `types.ts` (3902 lines) contains definitions for `budget_estimates`, `budget_settlements`, `booking_special_notes`, and `notifications`.

**17. Form validation — Zod schema?**
❌ CẦN FIX — No Zod schemas found anywhere in `src/components/`. Only `VendorFormDialog` uses `react-hook-form` (without Zod). All other forms use uncontrolled state with manual validation. This is a significant gap — forms accept any input without schema validation.

---

## G. BUILD CHECK

**18. Build errors?**
Cannot run build in read-only mode. Recommend user runs `npm run build` to verify.

**19. Console warnings?**
✅ OK — No error logs found in browser console at time of check.

---

## TÓM TẮT

| # | Mục | Trạng thái |
|---|-----|-----------|
| 1 | Dashboard — no N+1 | ✅ OK |
| 2 | No loop queries | ✅ OK |
| 3 | Customers pagination | ✅ OK |
| 4 | Leads page reset on filter | ❌ Minor |
| 5 | Bookings page reset on filter | ❌ Minor |
| 6 | PAGE_SIZE = 20 | ✅ OK |
| 7 | ErrorBoundary exists | ✅ OK |
| 8 | Routes wrapped | ✅ OK |
| 9 | Error handling in queries | ✅ OK |
| 10 | Only Sonner toast | ✅ OK |
| 11 | use-toast removed | ✅ OK |
| 12 | App.css clean | ✅ OK |
| 13 | index.html title correct | ✅ OK |
| **14** | **StrictMode missing** | **❌ CẦN FIX** |
| 15 | No duplicate loading check | ✅ OK |
| 16 | Type definitions present | ✅ OK |
| **17** | **No Zod form validation** | **❌ CẦN FIX** |
| 18 | Build check | ⚠️ Cần chạy thủ công |
| 19 | Console warnings | ✅ OK |

---

## KẾ HOẠCH FIX (nếu phê duyệt)

### Fix 1: StrictMode (item 14)
**File**: `src/main.tsx`
- Wrap `<App />` with `<React.StrictMode>`.

### Fix 2: Leads/Bookings page reset (items 4-5)
**Files**: `src/pages/Leads.tsx`, `src/pages/Bookings.tsx`
- Currently neither page has filter controls that change data scope, so page reset is less critical. However, if status filters are added later, `setPage(0)` should be called. Low priority — note for future.

### Fix 3: Form Validation with Zod (item 17)
This is a large-scope refactor affecting 10+ form dialogs. Recommended approach:
- Add `zod` + `@hookform/resolvers` dependencies
- Prioritize high-risk forms first: `CustomerFormDialog`, `BookingFormDialog`, `LeadFormDialog`, `TransactionFormDialog`
- Create Zod schemas for each form and integrate via `zodResolver` with `react-hook-form`
- This is a multi-session effort. Recommend tackling 2-3 forms per iteration.

**Recommendation**: Approve Fix 1 (StrictMode) now. Fix 3 (Zod) should be planned as a separate task due to scope.

