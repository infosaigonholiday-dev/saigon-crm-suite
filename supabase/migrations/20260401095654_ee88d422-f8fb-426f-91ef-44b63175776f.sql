
-- 1. Add new columns to transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES profiles(id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES profiles(id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS review_note text;

-- 2. Drop existing RLS policies on transactions to replace them
DROP POLICY IF EXISTS "transactions_access" ON transactions;
DROP POLICY IF EXISTS "transactions_delete" ON transactions;
DROP POLICY IF EXISTS "transactions_read" ON transactions;
DROP POLICY IF EXISTS "transactions_insert" ON transactions;
DROP POLICY IF EXISTS "transactions_update" ON transactions;

-- 3. SELECT: ADMIN/KETOAN/DIRECTOR full access; HCNS/HR_MANAGER/HR_HEAD see only own submitted records
CREATE POLICY "transactions_read" ON transactions FOR SELECT TO authenticated
USING (
  has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN','DIRECTOR'])
  OR (submitted_by = auth.uid() AND has_any_role(auth.uid(), ARRAY['HCNS','HR_MANAGER','HR_HEAD']))
);

-- 4. INSERT: ADMIN/KETOAN/DIRECTOR can insert anything; HCNS/HR roles insert only their own with draft/pending status
CREATE POLICY "transactions_insert" ON transactions FOR INSERT TO authenticated
WITH CHECK (
  has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN','DIRECTOR'])
  OR (
    submitted_by = auth.uid()
    AND approval_status IN ('DRAFT','PENDING_REVIEW')
    AND has_any_role(auth.uid(), ARRAY['HCNS','HR_MANAGER','HR_HEAD'])
  )
);

-- 5. UPDATE: KETOAN/ADMIN can update all (for approval); HCNS can only update own DRAFT/REJECTED records
CREATE POLICY "transactions_update" ON transactions FOR UPDATE TO authenticated
USING (
  has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN','DIRECTOR'])
  OR (
    submitted_by = auth.uid()
    AND approval_status IN ('DRAFT','REJECTED')
    AND has_any_role(auth.uid(), ARRAY['HCNS','HR_MANAGER','HR_HEAD'])
  )
)
WITH CHECK (
  has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','KETOAN','DIRECTOR'])
  OR (
    submitted_by = auth.uid()
    AND approval_status IN ('DRAFT','PENDING_REVIEW')
    AND has_any_role(auth.uid(), ARRAY['HCNS','HR_MANAGER','HR_HEAD'])
  )
);

-- 6. DELETE: only ADMIN/SUPER_ADMIN
CREATE POLICY "transactions_delete" ON transactions FOR DELETE TO authenticated
USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']));

-- 7. Update get_default_permissions_for_role to add finance.submit for HCNS/HR_MANAGER/HR_HEAD
CREATE OR REPLACE FUNCTION public.get_default_permissions_for_role(_role text)
 RETURNS text[]
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN CASE _role
    WHEN 'ADMIN' THEN ARRAY[
      'customers.view','customers.create','customers.edit','customers.delete',
      'leads.view','leads.create','leads.edit','leads.delete',
      'bookings.view','bookings.create','bookings.edit','bookings.delete','bookings.approve',
      'quotations.view','quotations.create','quotations.edit','quotations.delete',
      'payments.view','payments.create','payments.edit','payments.delete',
      'employees.view','employees.create','employees.edit','employees.delete',
      'leave.view','leave.create','leave.approve',
      'payroll.view','payroll.create','payroll.edit',
      'finance.view','finance.edit','finance.submit',
      'settings.view','settings.edit'
    ]
    WHEN 'SUPER_ADMIN' THEN ARRAY[
      'customers.view','customers.create','customers.edit','customers.delete',
      'leads.view','leads.create','leads.edit','leads.delete',
      'bookings.view','bookings.create','bookings.edit','bookings.delete','bookings.approve',
      'quotations.view','quotations.create','quotations.edit','quotations.delete',
      'payments.view','payments.create','payments.edit','payments.delete',
      'employees.view','employees.create','employees.edit','employees.delete',
      'leave.view','leave.create','leave.approve',
      'payroll.view','payroll.create','payroll.edit',
      'finance.view','finance.edit','finance.submit',
      'settings.view','settings.edit'
    ]
    WHEN 'DIRECTOR' THEN ARRAY[
      'customers.view','customers.create','customers.edit',
      'leads.view','leads.create','leads.edit',
      'bookings.view','bookings.create','bookings.edit','bookings.approve',
      'quotations.view','quotations.create','quotations.edit',
      'payments.view','payments.create','payments.edit',
      'employees.view','employees.create','employees.edit',
      'leave.view','leave.approve',
      'payroll.view','payroll.edit',
      'finance.view','finance.edit','finance.submit',
      'settings.view'
    ]
    WHEN 'HCNS' THEN ARRAY[
      'employees.view','employees.create','employees.edit',
      'leave.view','leave.create',
      'payroll.view','payroll.create',
      'finance.submit',
      'settings.view'
    ]
    WHEN 'HR_MANAGER' THEN ARRAY[
      'employees.view','employees.create','employees.edit',
      'leave.view','leave.create','leave.approve',
      'payroll.view','payroll.create','payroll.edit',
      'finance.submit',
      'settings.view'
    ]
    WHEN 'HR_HEAD' THEN ARRAY[
      'employees.view','employees.create','employees.edit',
      'leave.view','leave.create','leave.approve',
      'payroll.view','payroll.create','payroll.edit',
      'bookings.view',
      'quotations.view',
      'payments.view',
      'finance.submit',
      'settings.view'
    ]
    WHEN 'KETOAN' THEN ARRAY[
      'customers.view',
      'bookings.view',
      'payments.view','payments.create','payments.edit',
      'payroll.view','payroll.edit',
      'finance.view','finance.edit','finance.submit',
      'settings.view'
    ]
    WHEN 'MANAGER' THEN ARRAY[
      'customers.view','customers.create','customers.edit',
      'leads.view','leads.create','leads.edit',
      'bookings.view','bookings.create','bookings.edit',
      'quotations.view','quotations.create','quotations.edit',
      'payments.view','payments.create',
      'employees.view',
      'leave.view','leave.approve'
    ]
    WHEN 'DIEUHAN' THEN ARRAY[
      'customers.view','customers.create','customers.edit',
      'leads.view','leads.create','leads.edit',
      'bookings.view','bookings.create','bookings.edit','bookings.approve',
      'quotations.view','quotations.create','quotations.edit',
      'payments.view','payments.create','payments.edit'
    ]
    WHEN 'SALE_DOMESTIC' THEN ARRAY[
      'customers.view','customers.create','customers.edit',
      'leads.view','leads.create','leads.edit',
      'bookings.view','bookings.create',
      'quotations.view','quotations.create','quotations.edit',
      'payments.view'
    ]
    WHEN 'SALE_INBOUND' THEN ARRAY[
      'customers.view','customers.create','customers.edit',
      'leads.view','leads.create','leads.edit',
      'bookings.view','bookings.create',
      'quotations.view','quotations.create','quotations.edit',
      'payments.view'
    ]
    WHEN 'SALE_OUTBOUND' THEN ARRAY[
      'customers.view','customers.create','customers.edit',
      'leads.view','leads.create','leads.edit',
      'bookings.view','bookings.create',
      'quotations.view','quotations.create','quotations.edit',
      'payments.view'
    ]
    WHEN 'SALE_MICE' THEN ARRAY[
      'customers.view','customers.create','customers.edit',
      'leads.view','leads.create','leads.edit',
      'bookings.view','bookings.create',
      'quotations.view','quotations.create','quotations.edit',
      'payments.view'
    ]
    WHEN 'TOUR' THEN ARRAY[
      'customers.view',
      'bookings.view'
    ]
    WHEN 'MKT' THEN ARRAY[
      'customers.view',
      'leads.view','leads.create','leads.edit'
    ]
    WHEN 'INTERN' THEN ARRAY[]::text[]
    ELSE ARRAY[]::text[]
  END;
END;
$function$;
