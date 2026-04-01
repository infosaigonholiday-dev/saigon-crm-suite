
ALTER TABLE public.profiles DISABLE TRIGGER enforce_role_immutability;

UPDATE public.profiles SET role = 'INTERN_SALE_MICE' WHERE id = '09537abe-a5b4-48d1-b042-017c7c62f6a5';

UPDATE public.profiles SET role = 'MANAGER', department_id = '978e61b5-229d-4d16-9e38-26200b7b1113' WHERE id = '765a6b58-bfa1-4638-874e-c28dae5d17c2';

INSERT INTO public.employees (full_name, email, profile_id, department_id, position, level, status, hire_date)
SELECT 'gia bao', 'operator1.saigonholiday@gmail.com', '765a6b58-bfa1-4638-874e-c28dae5d17c2', '978e61b5-229d-4d16-9e38-26200b7b1113', 'Trưởng phòng', 'MANAGER', 'ACTIVE', CURRENT_DATE
WHERE NOT EXISTS (SELECT 1 FROM public.employees WHERE profile_id = '765a6b58-bfa1-4638-874e-c28dae5d17c2' AND deleted_at IS NULL);

UPDATE public.profiles SET employee_id = (SELECT id FROM public.employees WHERE profile_id = '765a6b58-bfa1-4638-874e-c28dae5d17c2' AND deleted_at IS NULL LIMIT 1)
WHERE id = '765a6b58-bfa1-4638-874e-c28dae5d17c2';

ALTER TABLE public.profiles ENABLE TRIGGER enforce_role_immutability;
