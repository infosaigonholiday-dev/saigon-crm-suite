-- 1. Thêm SUPER_ADMIN vào constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (
  role = ANY (ARRAY[
    'ADMIN','SUPER_ADMIN','HCNS','HR_MANAGER','KETOAN','MANAGER','GDKD','DIEUHAN',
    'SALE_DOMESTIC','SALE_INBOUND','SALE_OUTBOUND','SALE_MICE','TOUR','MKT',
    'INTERN_DIEUHAN','INTERN_SALE_DOMESTIC','INTERN_SALE_OUTBOUND','INTERN_SALE_MICE',
    'INTERN_SALE_INBOUND','INTERN_MKT','INTERN_HCNS','INTERN_KETOAN'
  ])
);

-- 2. Drop trigger trùng (giữ trg_audit_customers, trg_audit_leads)
DROP TRIGGER IF EXISTS trg_customers_audit ON public.customers;
DROP TRIGGER IF EXISTS trg_leads_audit ON public.leads;