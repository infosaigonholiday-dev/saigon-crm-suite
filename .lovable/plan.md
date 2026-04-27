## Phần 1/3 — Database + RLS + Permissions cho module HCNS

### Phát hiện trước khi triển khai
- `payroll` đã có 24 cột, **chưa có** các cột KPI/4-bước duyệt → cần ALTER thêm 19 cột (paid_at đã tồn tại — bỏ).
- `kpi_policies`, `candidates`, `onboarding_checklist`: **chưa tồn tại** → tạo mới.
- Hàm `has_any_role` trong DB có signature `(_user_id uuid, _roles text[])` → **phải truyền `auth.uid()`**, không dùng signature 1 tham số như SQL gốc của user.
- Hàm `get_my_department_id()` đã tồn tại ✓.
- `payroll` có 0 records → bỏ qua bước UPDATE status cũ.
- Policies cũ trên `payroll`: `admin_full_access`, `payroll_select`, `payroll_insert`, `payroll_update` → DROP các tên cũ này trước khi tạo mới `payroll_read` + `payroll_write`.

### Migration SQL sẽ chạy

**1. ALTER payroll** (thêm 19 cột mới, bỏ `paid_at` đã tồn tại):
```sql
ALTER TABLE payroll
  ADD COLUMN IF NOT EXISTS base_fixed numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS base_kpi numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS target_kpi numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_performance numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kpi_achievement_pct numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kpi_earned numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overtime_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS allowance_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unpaid_leave_days numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unpaid_leave_deduction numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS standard_working_days numeric DEFAULT 26,
  ADD COLUMN IF NOT EXISTS actual_working_days numeric DEFAULT 26,
  ADD COLUMN IF NOT EXISTS hr_reviewed_by uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS hr_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS kt_confirmed_by uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS kt_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS ceo_approved_by uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS ceo_approved_at timestamptz;

ALTER TABLE payroll DROP CONSTRAINT IF EXISTS payroll_status_check;
ALTER TABLE payroll ADD CONSTRAINT payroll_status_check
  CHECK (status IN ('draft','hr_reviewed','kt_confirmed','ceo_approved','paid'));
```

**2. Tạo `kpi_policies`, `candidates`, `onboarding_checklist`** — đúng schema user yêu cầu.

**3. RLS** — sửa lại tất cả `has_any_role(...)` → `has_any_role(auth.uid(), ARRAY[...])`:
```sql
-- payroll: drop policy cũ, tạo lại 2 policy
DROP POLICY IF EXISTS "admin_full_access" ON payroll;
DROP POLICY IF EXISTS "payroll_select" ON payroll;
DROP POLICY IF EXISTS "payroll_insert" ON payroll;
DROP POLICY IF EXISTS "payroll_update" ON payroll;
DROP POLICY IF EXISTS "payroll_read" ON payroll;
DROP POLICY IF EXISTS "payroll_write" ON payroll;

CREATE POLICY "payroll_read" ON payroll FOR SELECT TO authenticated
USING (
  employee_id = (SELECT id FROM employees WHERE profile_id = auth.uid() AND deleted_at IS NULL LIMIT 1)
  OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_MANAGER','HCNS','KETOAN','GDKD'])
);
CREATE POLICY "payroll_write" ON payroll FOR ALL TO authenticated
USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_MANAGER','HCNS']))
WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_MANAGER','HCNS']));

-- candidates, kpi_policies, onboarding_checklist: tương tự, bật RLS + policies dùng has_any_role(auth.uid(), ...)
```

### Cập nhật `src/hooks/usePermissions.ts`

- **ALL_PERMISSION_KEYS**: thêm 7 keys mới (`candidates.view/create/edit/delete`, `kpi_policies.view/create/edit`).
- **PERMISSION_GROUPS**: thêm 2 nhóm `candidates` (label "Tuyển dụng") và `kpi_policies` (label "Chính sách KPI") — dùng label trực tiếp (không qua `moduleLabels.ts` để tránh tạo route key giả).
- **DEFAULT_PERMISSIONS**:
  - `ADMIN`, `SUPER_ADMIN`: thêm tất cả 7 keys
  - `HR_MANAGER`: `candidates.view/create/edit/delete` + `kpi_policies.view/create/edit`
  - `HCNS`: `candidates.view/create/edit` + `kpi_policies.view`
  - `GDKD`, `MANAGER`, `DIEUHAN`: thêm `candidates.view`
  - `KETOAN`: thêm `kpi_policies.view`

### Cập nhật `supabase/migrations` cho `get_default_permissions_for_role`
Đồng bộ thêm các quyền mới cho các role tương ứng (ADMIN, SUPER_ADMIN, HR_MANAGER, HCNS, GDKD, MANAGER, DIEUHAN, KETOAN) để DB function khớp với client matrix.

### Verify (sau migration)
1. `SELECT count(*) FROM information_schema.columns WHERE table_name='payroll'` → kỳ vọng 43 (24 cũ + 19 mới).
2. `SELECT tablename FROM pg_tables WHERE tablename IN ('kpi_policies','candidates','onboarding_checklist')` → 3 rows.
3. `SELECT count(*) FROM pg_policies WHERE tablename IN ('payroll','candidates','kpi_policies','onboarding_checklist')` → ≥ 7.
4. `rg "candidates.view|kpi_policies.view" src/hooks/usePermissions.ts` → có hit.
5. `npm run build` → 0 errors.

### Files thay đổi
- New migration file (DDL + RLS + cập nhật `get_default_permissions_for_role`).
- `src/hooks/usePermissions.ts` (thêm permission keys + groups + defaults).

### KHÔNG đụng vào
- `SOPLibrary.tsx`, `department_sops`, `sop_acknowledgements`.
- Không tạo bảng/trigger trùng. Không tắt RLS.
- Phần 2/3 (UI) sẽ làm sau khi Phần 1 verify pass.
