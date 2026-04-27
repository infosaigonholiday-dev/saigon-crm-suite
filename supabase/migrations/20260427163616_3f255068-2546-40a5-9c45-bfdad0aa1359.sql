-- Normalize any remaining lowercase values
UPDATE public.employees SET status = UPPER(status) WHERE status IS NOT NULL AND status <> UPPER(status);

-- Drop and recreate constraint
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_status_check;
ALTER TABLE public.employees
  ADD CONSTRAINT employees_status_check
  CHECK (status IS NULL OR status IN ('ACTIVE','PROBATION','INTERN','INACTIVE','TERMINATED','MATERNITY','SUSPENDED'));