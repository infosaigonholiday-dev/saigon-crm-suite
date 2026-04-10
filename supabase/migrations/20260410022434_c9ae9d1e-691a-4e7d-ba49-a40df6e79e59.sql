ALTER TABLE public.raw_contacts ADD COLUMN IF NOT EXISTS company_size text;
ALTER TABLE public.raw_contacts ADD COLUMN IF NOT EXISTS planned_event_date date;