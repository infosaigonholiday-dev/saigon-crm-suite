ALTER TABLE public.profiles DISABLE TRIGGER enforce_role_immutability;

UPDATE public.profiles SET role = 'SALE_MICE' WHERE id = '09537abe-a5b4-48d1-b042-017c7c62f6a5' AND role = 'HCNS';

ALTER TABLE public.profiles ENABLE TRIGGER enforce_role_immutability;