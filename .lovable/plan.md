# Fix 2 điểm nhỏ HCNS — Tách type notification + tạo data payroll test

## Hiện trạng (đã verify bằng grep)

| Type | File | Line | Trạng thái |
|------|------|------|-----------|
| `CANDIDATE_NEW` | `CandidateFormDialog.tsx` | 118 | ✅ Đã có (insert khi tạo UV mới) |
| `CANDIDATE_STATUS` | `Recruitment.tsx` | 73 | ✅ Giữ nguyên (chuyển trạng thái Kanban) |
| `CANDIDATE_STATUS` | `Recruitment.tsx` | 191 | ❌ Sai ngữ cảnh — đang dùng cho onboard |

→ Chỉ cần **sửa 1 chỗ** ở `Recruitment.tsx` line 191.

## Phần 1 — Đổi type cho onboard thành công

**File:** `src/pages/Recruitment.tsx` (trong `performOnboarding`, sau khi onboard thành công)

Đổi:
```ts
await notifyUsersByRole(["HR_MANAGER", "HCNS"], {
  type: "CANDIDATE_STATUS",
  title: `Onboard thành công: ${cand.full_name}`,
  ...
```

Thành:
```ts
await notifyUsersByRole(["HR_MANAGER", "HCNS"], {
  type: "ONBOARD_SUCCESS",
  title: `Onboard thành công: ${cand.full_name}`,
  message: "Đã tạo tài khoản + checklist onboarding",
  ...
```

`CANDIDATE_NEW` (CandidateFormDialog.tsx:118) và `CANDIDATE_STATUS` (Recruitment.tsx:73) **giữ nguyên**.

## Phần 2 — Tạo data payroll T4/2026 test

Logic "Tính lương tháng" hiện nằm hoàn toàn ở client (`Payroll.tsx` line 92-156), không có edge function `generate-payroll`. Để tạo data test mà không cần user click UI, sẽ chạy **SQL insert tương đương** từ migration:

```sql
-- Insert payroll draft cho mọi NV active chưa có bản ghi T4/2026
INSERT INTO payroll (
  employee_id, month, year,
  base_salary, base_fixed, base_kpi,
  standard_working_days, actual_working_days,
  allowance_amount, total_allowance, status
)
SELECT
  e.id,
  4, 2026,
  COALESCE(s.base_salary, 0)                                       AS base_salary,
  ROUND(COALESCE(s.base_salary, 0) * 0.8)                          AS base_fixed,
  ROUND(COALESCE(s.base_salary, 0) * 0.2)                          AS base_kpi,
  26, 26,
  COALESCE(s.phone_allowance,0) + COALESCE(s.transport_allowance,0)
    + COALESCE(s.meal_allowance,0) + COALESCE(s.housing_allowance,0)
    + COALESCE(s.other_allowance,0)                                AS allowance_amount,
  COALESCE(s.phone_allowance,0) + COALESCE(s.transport_allowance,0)
    + COALESCE(s.meal_allowance,0) + COALESCE(s.housing_allowance,0)
    + COALESCE(s.other_allowance,0)                                AS total_allowance,
  'draft'
FROM employees e
LEFT JOIN LATERAL (
  SELECT base_salary, phone_allowance, transport_allowance,
         meal_allowance, housing_allowance, other_allowance
  FROM employee_salaries
  WHERE employee_id = e.id
  ORDER BY effective_from DESC
  LIMIT 1
) s ON true
WHERE e.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM payroll p
    WHERE p.employee_id = e.id AND p.month = 4 AND p.year = 2026
  );
```

Logic này **giống 100%** với client-side mutation → user vẫn có thể bấm "Tính lương tháng" sau này, sẽ skip do `existingSet`.

## Phần 3 — Báo cáo verify (sẽ chạy & paste output)

Sau khi áp dụng:

| # | Lệnh | Mong đợi |
|---|------|----------|
| 3a | `rg -n "CANDIDATE_NEW" src/` | ≥1 hit ở `CandidateFormDialog.tsx` |
| 3b | `rg -n "ONBOARD_SUCCESS" src/` | ≥1 hit ở `Recruitment.tsx` |
| 3c | `rg -n "CANDIDATE_STATUS" src/` | Vẫn còn ở `Recruitment.tsx:73` |
| 3d | `SELECT count(*), status FROM payroll WHERE month=4 AND year=2026 GROUP BY status;` | X bản ghi `draft` (X = số NV active) |
| 3e | `npm run build` | 0 errors |

## Files thay đổi
- ✏️ `src/pages/Recruitment.tsx` — đổi 1 dòng type
- ➕ Migration mới — INSERT payroll T4/2026

**Không** đụng `CandidateFormDialog.tsx` (đã đúng), không đụng `notifyByRole.ts`, không tạo edge function.
