ALTER TABLE public.customers ALTER COLUMN created_by SET DEFAULT auth.uid();
ALTER TABLE public.leads ALTER COLUMN assigned_to SET DEFAULT auth.uid();