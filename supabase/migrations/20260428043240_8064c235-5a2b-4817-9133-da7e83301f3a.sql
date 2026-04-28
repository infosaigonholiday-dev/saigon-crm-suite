
ALTER TABLE public.office_expenses DROP CONSTRAINT IF EXISTS office_expenses_category_check;

ALTER TABLE public.office_expenses ADD CONSTRAINT office_expenses_category_check
CHECK (category IS NULL OR category IN (
  'RENT','ELECTRICITY','WATER','WIFI','PHONE','PARKING','SUPPLIES',
  'UTILITIES','OFFICE_SUPPLIES','EQUIPMENT','SOFTWARE','MARKETING','OTHER'
));
