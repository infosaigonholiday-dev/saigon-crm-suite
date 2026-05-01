-- Cleanup orphan profile (gia bao SHT-026): profile tồn tại nhưng auth.users không có
-- Quét toàn bộ profile mồ côi để dọn 1 lần (không hardcode 1 ID, đảm bảo idempotent)

DO $$
DECLARE
  orphan_id uuid;
BEGIN
  FOR orphan_id IN
    SELECT p.id 
    FROM public.profiles p
    LEFT JOIN auth.users u ON u.id = p.id
    WHERE u.id IS NULL
  LOOP
    -- Xóa notifications của profile mồ côi
    DELETE FROM public.notifications WHERE user_id = orphan_id;
    -- Unlink employees
    UPDATE public.employees SET profile_id = NULL WHERE profile_id = orphan_id;
    -- Xóa profile mồ côi
    DELETE FROM public.profiles WHERE id = orphan_id;
    RAISE NOTICE 'Cleaned orphan profile: %', orphan_id;
  END LOOP;
END $$;