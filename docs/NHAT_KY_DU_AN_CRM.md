# 📓 NHẬT KÝ DỰ ÁN — SAIGON HOLIDAY CRM (LOVABLE)

> **Cập nhật cuối:** 08/05/2026 20:30 (cuối phiên)
> **Repo GitHub:** `https://github.com/infosaigonholiday-dev/saigon-crm-suite`
> **Clone local:** `f:\SGH 2025\SGH 2025\ALL - AI\APP SGH\saigon-crm-suite`
> **Tech stack:** React + TypeScript + Vite + Supabase + OneSignal + Resend
> **Site URL:** `app.saigonholiday.vn` | **Brand:** `#E8963A`
> **Build tool:** Lovable.dev (auto-commit GitHub sau mỗi thay đổi)

---

## 🎯 LỘ TRÌNH 4 PHASE CHỐNG "FIX TỚI FIX LUI"

| Phase | Mục tiêu | Trạng thái | % |
|---|---|---|---|
| **Phase 0** | Hiểu — phân tích 20 bugs → 5 nguyên nhân gốc | ✅ Done 08/05 | 100% |
| **Phase 1.A** | Migration `role_permissions` | ✅ Done 08/05 | 100% |
| **Phase 1.B** | Refactor + UI permissions (9 task) | 🔄 6/9 task done | 67% |
| **Phase 1.C** | UI cleanup sidebar 7 sections | ✅ Code OK (cache PWA cũ) | 90% |
| **Phase 2** | Template "Spec trước Build sau" | 📋 Pending | 0% |
| **Phase 3** | `PERMISSIONS_SPEC.md` + mở rộng scope | 📋 Pending | 0% |
| **Phase 4** | DB-driven cho 4 thứ hardcode còn lại | 📋 Pending | 0% |

**% tổng quát kế hoạch: ~55%**

---

## 📚 6 NGUYÊN TẮC CHỐNG "FIX TỚI FIX LUI" (CHỐT 08/05)

| # | Nguyên tắc | Áp dụng |
|---|---|---|
| 1 | **Spec trước Build sau** | Mỗi prompt phải có spec rõ ràng |
| 2 | **Single source of truth** | 1 thứ chỉ có 1 chỗ định nghĩa |
| 3 | **DB-driven khi có thể** | Config động chuyển vào DB |
| 4 | **Test theo flow, không theo function** | E2E test cho 3 flow chính |
| 5 | **Migration phải có rollback** | Không apply migration nào không rollback được |
| 6 | **Báo cáo phải có MINH CHỨNG cụ thể** | Screenshot/log/output, không chấp nhận "PASS" trống |

### 5 Quy tắc bổ sung (đã chốt từ trước)
1. Mỗi Prompt PHẢI có Checklist verify
2. Mỗi phiên BẮT ĐẦU bằng verify Prompt đang chờ
3. Mỗi Prompt phải có deadline tự đặt (2-4 ngày)
4. Prompt tài chính/phân quyền PHẢI có test case bảo mật
5. Prompt format BẢNG tinh giản (≤50 dòng, ≤3KB)

---

## 🚦 TRẠNG THÁI HỆ THỐNG (cuối phiên 08/05)

| Hạng mục | Số liệu |
|---|---|
| Bảng DB (Supabase) | ~87 (+role_permissions, +permissions_audit) |
| RLS Policies | ~249 |
| Triggers | ~74 |
| Notification Types | 33 |
| Edge Functions | 8 |
| Pages | 41 |
| Components | ~200 |
| Library files (`lib/`) | ~22 |
| Test files | 2 |
| Migrations (10 ngày) | 32 + 3 hotfix (d/e/f) |
| Commits (10 ngày) | ~190 |
| Build | 0 errors |
| OneSignal Push thật | ⚠️ 70% — chưa fix |

---

## ✅ PHIÊN 08/05 — KẾT QUẢ CHI TIẾT

### Phase 0 — Hiểu ✅ 100%
- Phân tích 20 bugs → 5 nhóm nguyên nhân gốc:
  1. Logic phân tán nhiều file (5 bugs: #3, #4, #5, #15, #18)
  2. Hardcode config (4 bugs: #5, #9, #20)
  3. Thiếu test tự động (4 bugs: #6, #7, #8, #11)
  4. Race condition / Async (4 bugs: #4, #14, #15, #17)
  5. Schema không khớp code (3 bugs: #6, #7, #16)
- Chốt 6 nguyên tắc + 5 quy tắc

### Phase 1.A — Migration role_permissions ✅ 100%
- 3 migrations A/B/C apply thành công
- Schema: `role_permissions` (610 rows) + `permissions_audit` (612+ rows)
- 22 roles seed đầy đủ
- 6/6 test cases TC1-TC6 PASS với minh chứng SQL output thực tế
- 3 file rollback sẵn sàng

### Phase 1.B — Refactor + UI permissions 🔄 6/9 task

| Task | Trạng thái | Minh chứng |
|---|---|---|
| 1. role_permissions table + seed | ✅ Done | 610 rows / 22 roles |
| 2. Refactor PermissionsContext | ✅ Done | DB-driven + Realtime + cache 5m + fallback |
| 3. Xoá DEFAULT_PERMISSIONS 363 dòng | ✅ Done | `rg` chỉ còn 1 match (comment) |
| 4. UI RolePermissionsMatrix | ✅ Done | Tab "Quyền hạn" trong Settings |
| 5. RPC apply_role_permissions_changes | ✅ Done | Batch insert/delete 1 transaction |
| 6. PERMISSIONS_SPEC.md | 📋 Chuyển Phase 3 | — |
| **7. UI PermissionsAudit** | **✅ Done** | Tab `/cai-dat?tab=permissions_audit`, 646 rows, filter/export CSV |
| **8. Vitest 5 test cases** | **📋 Prompt đã soạn** | Chờ gửi Lovable |
| 9. Edge permissions-health-check | 📋 Pending | Sau Task 8 |

### Phase 1.C — UI Cleanup Sidebar ✅ Code OK

- AppSidebar.tsx đã restructure 7 sections: Tổng quan / Kinh doanh / Điều hành / Tài chính / Nhân sự / Marketing / Hệ thống
- Xoá section "KHÁC", "Đào tạo Tài liệu", "Gửi thông báo" khỏi sidebar
- "Gửi thông báo" chuyển vào tab trong Settings
- **Lưu ý:** Screenshot cũ cho thấy UI cũ do cache PWA — Lovable confirm code sạch, chỉ 1 file sidebar `AppSidebar.tsx` (qua `AppLayout.tsx`)

### 🛡️ HOTFIX BẢO MẬT — 5 Lỗ hổng GDKD (phát hiện + đóng trong phiên)

**Phát hiện qua SQL audit:**
1. GDKD `payments.view` scope=**all** (phải department)
2. GDKD `payments.create` scope=**all** (phải department)
3. GDKD `payroll.view` scope=**all** (KHÔNG nên có hoặc department)
4. RLS `payroll_read` cho GDKD đọc full DB lương
5. RLS `recurring_expenses_read` cho GDKD đọc full chi phí cố định

**3 Migrations hotfix (apply tuần tự):**

| Migration | Nội dung | Status |
|---|---|---|
| `20260508_d_fix_gdkd_permissions.sql` | UPDATE 4 rows scope → 'department' + audit log | ✅ Applied |
| `20260508_e_rls_payroll.sql` | DROP+CREATE `payroll_read` — chặn GDKD/MANAGER chỉ thấy phòng mình | ✅ Applied |
| `20260508_f_rls_recurring.sql` | DROP+CREATE `recurring_expenses_read` — bỏ GDKD/MANAGER, giữ DIEUHAN | ✅ Applied |

**Quyết định nghiệp vụ Q1-Q5:**
- Q1: GDKD payroll scope=department (thấy lương phòng KD) ✅
- Q2: GDKD payments scope=department (thấy payments phòng KD) ✅
- Q3: MANAGER payroll scope=department (TBP thấy lương phòng mình) ✅
- Q4: HCNS payroll scope=all (làm bảng lương toàn công ty) ✅
- Q5: DIEUHAN GIỮ recurring_expenses (cần xem chi phí cố định xe/KS) ✅

**Test rollback 6/6 bước OK:**
- Apply → Rollback → Re-apply: tất cả thành công
- Phát hiện + fix bug rollback file: `operation='ROLLBACK'` vi phạm constraint → đổi thành `'UPDATE'`
- 3 file rollback sẵn sàng: `docs/migrations/rollback/20260508_{d,e,f}_rollback.sql`

**Final verify (SQL output thực tế):**
- 4 rows role_permissions = scope='department' ✅
- Policy `payroll_read` chứa `get_my_department_id()` + `has_any_role(GDKD,MANAGER)` ✅
- Policy `recurring_expenses_read` = chỉ ADMIN/SUPER_ADMIN/KETOAN/HCNS/HR_MANAGER/DIEUHAN ✅
- `permissions_audit`: 24 rows mới ghi hotfix + rollback test ✅

### Hotfix Sidebar — Xoá FINANCE_SECTION_ROLES hardcode

- XOÁ hằng số `FINANCE_SECTION_ROLES = [ADMIN, SUPER_ADMIN, CEO, KETOAN, HR_MANAGER, HCNS]`
- XOÁ biến `showFinance`
- Section Finance render khi `vFinance.length > 0` (DB-driven qua `getVisibleModules()`)
- `rg "FINANCE_SECTION_ROLES" src/` → 0 match ✅

### Fix bảo mật khác
- ADMIN thiếu 7 quyền campaigns/tasks vs SUPER_ADMIN → INSERT 7 rows ✅
- Verify code `Finance.tsx:271-274`: GDKD bị ép vào `ManagerFinanceView` → `MyDepartmentView`, không có tabs P&L ✅

---

## 🛡️ PHÂN QUYỀN NHẠY CẢM (KHÔNG ĐƯỢC SAI)

| Role | Quyền đặc biệt |
|------|---------------|
| SUPER_ADMIN ("CEO") | Full quyền, duyệt cuối Quyết toán |
| ADMIN | Full quyền hệ thống (= SUPER_ADMIN sau fix INSERT 7 rows) |
| KETOAN | Duyệt chi, xem Lợi nhuận, Dòng tiền, Công nợ |
| GDKD | scope='department' cho finance — **KHÔNG thấy P&L toàn công ty** |
| MANAGER | scope='department' cho payroll — thấy lương phòng mình |
| DIEUHAN | Giữ `recurring_expenses` (chi phí cố định xe/KS) |
| Sale_* | Chỉ Booking/Lead của mình |
| HCNS | Payroll scope=all (làm bảng lương), nhập chi phí pending_approval |

### Chốt clarification
- **CEO trong tài liệu = `SUPER_ADMIN` trong code** (project KHÔNG có role CEO)
- **22 Roles chính thức:**
  - Tier 1: ADMIN, SUPER_ADMIN
  - Tier 2: GDKD, MANAGER, DIEUHAN, HR_MANAGER, KETOAN, MKT
  - Tier 3: HCNS, SALE_DOMESTIC, SALE_INBOUND, SALE_OUTBOUND, SALE_MICE, TOUR
  - Tier 4: INTERN_SALE_DOMESTIC, INTERN_SALE_OUTBOUND, INTERN_SALE_MICE, INTERN_SALE_INBOUND, INTERN_DIEUHAN, INTERN_MKT, INTERN_HCNS, INTERN_KETOAN

---

## 🔥 CÒN DANG DỞ (cập nhật 08/05 cuối phiên)

### Phase 1.B — Còn 2 task (Task 6 chuyển Phase 3)

| # | Task | % | Trạng thái | Prompt |
|---|---|---|---|---|
| 8 | Vitest 5 test cases permissions | 0% | **Prompt đã soạn sẵn** — gửi Lovable ngay | Xem `KE_HOACH_TIEP_THEO.md` |
| 9 | Edge permissions-health-check daily | 0% | Sau Task 8 PASS | — |

### Backlog (không khẩn)

| # | Việc | Mức |
|---|---|---|
| 1 | Verify Prompt #1 (Dự toán/QT) trên UI | 🟡 Trung |
| 2 | Fix OneSignal Push 70% → 100% | 🟡 Trung |
| 3 | Verify trên UI: GDKD login → Finance → chỉ thấy doanh thu phòng | 🟢 Khi public |

### Module dở dang (Backlog xa)

| # | Tính năng | % |
|---|---|---|
| OneSignal push thiết bị thật | 70% |
| Module MKT | 0% |
| ATS Tuyển dụng | 5% |
| Smart Payroll | 10% |
| Module Điều hành ops | 30% |
| Chatbot AI | 0% |
| Sprint 2 Tour Files | 0% |
| Notification preference per-user | 0% |
| Mobile responsive review | 50% |
| Dashboard CEO 6 charts | 0% |

---

## 🐛 BUGS ĐÃ FIX TÍCH LUỸ (20 bugs, 28/04 → 08/05)

### 5 nhóm nguyên nhân gốc (đã phân tích Phase 0)
1. **Logic phân tán nhiều file** — 5 bugs (#3, #4, #5, #15, #18)
2. **Hardcode config** — 4 bugs (#5, #9, #20)
3. **Thiếu test tự động** — 4 bugs (#6, #7, #8, #11)
4. **Race condition / Async** — 4 bugs (#4, #14, #15, #17)
5. **Schema không khớp code** — 3 bugs (#6, #7, #16)

→ Chi tiết 20 bugs xem báo cáo Lovable phần H ngày 08/05.

---

## 📤 PROMPT MẪU YÊU CẦU LOVABLE BÁO CÁO TIẾN ĐỘ

```
| Mục | Yêu cầu |
|---|---|
| **Tên** | BÁO CÁO TIẾN ĐỘ DỰ ÁN |
| **Phạm vi** | Từ commit cuối nhật ký đến HEAD hiện tại |

Liệt kê 10 bảng:
A. CODE & FILES (path, MỚI/SỬA/XOÁ, module, mô tả 1 dòng, +/- dòng)
B. DATABASE (migration, bảng tác động, mô tả)
C. RLS POLICIES (chỉ NEW/CHANGED)
D. NOTIFICATION TYPES
E. EDGE FUNCTIONS
F. PAGES MỚI
G. TÍNH NĂNG ĐÃ HOÀN THÀNH (checklist + minh chứng)
H. BUGS ĐÃ FIX (lỗi, file, fix, commit hash)
I. CÒN DANG DỞ (% hoàn thành, lý do, cần input gì)
J. SỐ LIỆU TỔNG QUAN (Trước/Hiện tại/Δ)

Format: 100% bảng markdown
Mỗi mục PHẢI có minh chứng (SQL output / screenshot / code diff)
```

---

## 📝 NHẬT KÝ PHIÊN

### Phiên 08/05/2026 (toàn ngày — nhiều phiên AI)

**Phiên sáng (Claude trên Lovable):**
- Yêu cầu Lovable báo cáo tiến độ 2 lần (A-J đầy đủ)
- Phân tích 142 files thay đổi từ 28/04 → 08/05
- Phase 0 hoàn tất: 20 bugs → 5 nguyên nhân → 6 nguyên tắc
- Phase 1.A hoàn tất: 3 migrations + 6/6 TC PASS
- Phase 1.B 5/9: Refactor Context + UI Matrix + xoá DEFAULT_PERMISSIONS + RPC batch
- Fix bảo mật: ADMIN thiếu 7 quyền
- Cảnh báo: GDKD finance scope sai

**Phiên tối (Claude + Antigravity):**
- Phát hiện 5 lỗ hổng GDKD qua SQL audit (`role_permissions` + `pg_policies`)
- Soạn + gửi prompt 3 migrations hotfix (M1 permissions seed, M2 RLS payroll, M3 RLS recurring)
- Lovable apply 3 migrations thành công
- Lovable tự ý chạy test rollback 6/6 bước (user đã từ chối nhưng Lovable vẫn làm) → kết quả OK, phát hiện+fix bug rollback file
- Phase 1.C: Lovable confirm sidebar code sạch (7 sections, không "KHÁC"), screenshot cũ là cache PWA
- Hotfix sidebar: xoá `FINANCE_SECTION_ROLES` hardcode → DB-driven
- Task 7 PermissionsAudit: Lovable hoàn tất — tab `/cai-dat?tab=permissions_audit` với 646 rows, filter, export CSV
- Prompt Task 8 Vitest đã soạn sẵn, chưa gửi

**Kết quả cuối phiên:**
- Phase 1.A: ✅ 100%
- Phase 1.B: 🔄 6/9 (Task 7 done, Task 8-9 pending)
- Phase 1.C: ✅ 90% (code OK, chờ clear cache khi public)
- Hotfix 5 lỗ hổng GDKD: ✅ 100% (DB + RLS + rollback test)
- % kế hoạch tổng quát: **~55%**

### Phiên 30/04/2026
- Viết 3 Master Prompts (#1 Dự toán, #2 Action CRM, #3 OneSignal)
- Chốt Triết lý vận hành: Chu trình 5 bước

---

*File này là "bộ nhớ chung" của dự án. AI nào nhận file này đều có thể tiếp tục công việc.*
*Cập nhật cuối phiên — không cập nhật giữa phiên.*
