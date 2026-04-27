-- Seed payroll draft records for active employees, month=4 year=2026
INSERT INTO public.payroll (
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
FROM public.employees e
LEFT JOIN LATERAL (
  SELECT base_salary, phone_allowance, transport_allowance,
         meal_allowance, housing_allowance, other_allowance
  FROM public.employee_salaries
  WHERE employee_id = e.id
  ORDER BY effective_from DESC
  LIMIT 1
) s ON true
WHERE e.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM public.payroll p
    WHERE p.employee_id = e.id AND p.month = 4 AND p.year = 2026
  );