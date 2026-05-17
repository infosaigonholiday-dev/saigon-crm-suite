# 🗺️ KẾ HOẠCH TIẾP THEO — SAIGON HOLIDAY CRM

> **Tài liệu này dành cho AI khác kế thừa công việc.** Đọc song song với `NHAT_KY_DU_AN_CRM.md`.
> **Người chủ trì:** Tupun (Founder, marketing.saigonholiday@gmail.com)
> **Cập nhật:** 08/05/2026 cuối phiên
> **Mục tiêu:** Tránh fix tới fix lui — đảm bảo từng bước verify trước khi next

---

## 📍 TRẠNG THÁI HIỆN TẠI

| Hạng mục | Status | % |
|---|---|---|
| Phase 0 (Hiểu) | ✅ Done | 100% |
| Phase 1.A (Migration) | ✅ Done | 100% |
| Phase 1.B (Refactor) | 🔄 6/9 task | 67% |
| Phase 1.C (Sidebar) | ✅ Code OK | 90% |
| Hotfix 5 lỗ hổng GDKD | ✅ Done | 100% |
| **TỔNG KẾ HOẠCH** | — | **~55%** |

---

## 🔜 VIỆC TIẾP THEO — THỨ TỰ ƯU TIÊN

### 1. Task 8 — Vitest 5 test cases (GỬI NGAY)

**Prompt đã soạn sẵn — copy gửi Lovable:**

```markdown
| Mục | Yêu cầu |
|---|---|
| **Tên** | PHASE 1.B TASK 8 — Vitest permissions tests |
| **Mục tiêu** | Test tự động cho `PermissionsContext` + `useRolePermissions` |
| **Bối cảnh** | DB-driven permissions live, cần test để refactor sau không vỡ |

## 5 TEST CASES
| # | Test | Mock | Expected |
|---|---|---|---|
| 1 | `hasPermission('finance','view')` user không quyền | userRole='SALE_DOMESTIC', DB không có row | `false` |
| 2 | `hasPermission('customers','view')` user có quyền | userRole='SALE_DOMESTIC', DB có row | `true` |
| 3 | Realtime invalidate cache khi DB thay đổi | Mock Supabase channel emit INSERT vào `role_permissions` | refetch trigger |
| 4 | DB lỗi → fallback empty Set | Mock supabase trả error | `permissions.size === 0`, không throw |
| 5 | Cache hết 5 phút → refetch | `vi.useFakeTimers()` advance 6 phút | Query refetch lần 2 |

## YÊU CẦU
- File test: `src/contexts/__tests__/PermissionsContext.test.tsx`
- Dùng `@testing-library/react` + `vitest`
- Mock Supabase qua `vi.mock('@/integrations/supabase/client')`

## VERIFY (3 minh chứng)
1. Output `pnpm test` (hoặc `npm test`) paste đầy đủ — 5/5 PASS
2. Coverage `PermissionsContext.tsx` ≥ 80% (paste `vitest --coverage` output)
3. Test chạy < 5s (paste duration)

## DEADLINE
1 ngày
```

---

### 2. Task 9 — Edge permissions-health-check (SAU Task 8 PASS)

**Scope:** Edge function chạy daily (cron) kiểm tra:
- `role_permissions` có row orphan (role không tồn tại trong `user_roles`)
- Policies count bất thường (delta > 10 so với baseline)
- `permissions_audit` có DELETE bất thường (ai đó xoá quyền)

**Trigger gửi prompt:** Khi Task 8 output 5/5 PASS

---

### 3. Phase 1.B đóng → Phase 2 (Template "Spec trước Build sau")

**Scope Phase 2:**
- Tạo template markdown cho mỗi prompt gửi Lovable
- Template bắt buộc có: Spec bảng / Test cases / Verify checklist / Deadline / Rollback plan
- Enforce trong workflow: không gửi prompt không có template

---

### 4. Phase 3 — PERMISSIONS_SPEC.md

**Scope:**
- File spec chính thức cho 22 roles × tất cả resources
- Ma trận quyền dạng bảng: Role × Resource × Action × Scope
- Dùng làm source of truth khi seed DB hoặc audit

---

### 5. Phase 4 — DB-driven 4 thứ hardcode

**4 thứ cần chuyển DB:**
1. Sidebar menu items (hiện hardcode trong `AppSidebar.tsx`)
2. Notification types (hiện hardcode enum)
3. Department list
4. Status transitions (Lead/Booking workflow)

---

## 📋 BACKLOG (không khẩn, làm khi rảnh)

| # | Việc | Mức |
|---|---|---|
| 1 | Verify Prompt #1 (Dự toán/QT) trên UI | 🟡 |
| 2 | Fix OneSignal Push 70% → 100% | 🟡 |
| 3 | Verify GDKD login → Finance → chỉ thấy doanh thu phòng | 🟢 |
| 4 | Module MKT | 📋 |
| 5 | ATS Tuyển dụng | 📋 |
| 6 | Smart Payroll | 📋 |
| 7 | Dashboard CEO 6 charts | 📋 |
| 8 | Chatbot AI | 📋 |
| 9 | Sprint 2 Tour Files | 📋 |
| 10 | Mobile responsive review | 📋 |

---

## ⚠️ LƯU Ý CHO AI KẾ THỪA

### KHÔNG ĐƯỢC LÀM
1. ❌ Gửi password/credentials qua chat
2. ❌ Hardcode role list trong UI (đã bỏ `FINANCE_SECTION_ROLES`)
3. ❌ Apply migration mà KHÔNG có file rollback
4. ❌ Đề xuất deep-link role switching (bypass auth = lỗ hổng bảo mật)
5. ❌ Tự ý chạy rollback/migration mà user chưa cho phép

### PHẢI LÀM
1. ✅ Đọc `NHAT_KY_DU_AN_CRM.md` trước khi làm bất kỳ việc gì
2. ✅ Verify prompt đang chờ Lovable trước khi soạn prompt mới
3. ✅ Mọi prompt phải có format BẢNG (≤50 dòng, ≤3KB)
4. ✅ Prompt tài chính/phân quyền PHẢI có test case bảo mật
5. ✅ Báo cáo phải có minh chứng cụ thể (Nguyên tắc 6)

### CẨN THẬN
- Lovable có xu hướng tự ý làm thêm việc không yêu cầu — luôn kiểm tra output
- Lovable đã 1 lần tự chạy rollback test khi user từ chối → phải ghi rõ "KHÔNG LÀM" trong prompt
- Project chưa public (chưa deploy production) → không cần lo cache PWA
- `CEO` = `SUPER_ADMIN` trong code — KHÔNG có role CEO riêng
- `GDKD` scope=department cho finance/payments/payroll — **KHÔNG BAO GIỜ cho GDKD scope=all**

---

## 🔑 THÔNG TIN KỸ THUẬT QUAN TRỌNG

### DB Functions cần biết
- `has_any_role(user_id uuid, roles text[])` — check user có role nào trong list
- `get_my_department_id()` — trả department_id của user hiện tại
- `apply_role_permissions_changes(changes jsonb)` — batch insert/delete permissions

### Files quan trọng
- `src/contexts/PermissionsContext.tsx` — DB-driven permissions, realtime, cache 5m
- `src/components/AppSidebar.tsx` — Sidebar 7 sections, render theo `getVisibleModules()`
- `src/pages/Finance.tsx:271-274` — Guard GDKD vào `ManagerFinanceView`
- `src/components/settings/SettingsPermissionsAuditTab.tsx` — UI audit log

### Migrations hotfix (đã apply, có rollback)
- `20260508_d_fix_gdkd_permissions.sql` — UPDATE scope
- `20260508_e_rls_payroll.sql` — RLS payroll chặn GDKD/MANAGER
- `20260508_f_rls_recurring.sql` — RLS recurring_expenses bỏ GDKD/MANAGER, giữ DIEUHAN

---

*Cập nhật cuối: 08/05/2026 20:30*
*AI kế thừa: đọc file này + `NHAT_KY_DU_AN_CRM.md` → bắt đầu từ Task 8 Vitest*
