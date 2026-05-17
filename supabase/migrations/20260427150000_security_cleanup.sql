
-- 1. Xử lý bảng quotes và quotations
-- Cả 2 bảng trống, xóa bảng quotes dư thừa và cập nhật bookings
DO $$ 
BEGIN
    -- Cập nhật foreign key trong bảng bookings nếu tồn tại
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' AND column_name = 'quote_id'
    ) THEN
        -- Xóa constraint cũ nếu có
        ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_quote_id_fkey;
        
        -- Thêm constraint mới trỏ sang quotations
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotations') THEN
            ALTER TABLE public.bookings 
            ADD CONSTRAINT bookings_quotation_id_fkey 
            FOREIGN KEY (quote_id) REFERENCES public.quotations(id) ON DELETE SET NULL;
        END IF;
    END IF;

    -- Xóa bảng quotes
    DROP TABLE IF EXISTS public.quotes CASCADE;
END $$;

-- 2. Bảo mật bảng push_send_log (nếu tồn tại)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'push_send_log') THEN
        ALTER TABLE public.push_send_log ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "admin_full_access" ON public.push_send_log;
        CREATE POLICY "admin_full_access" ON public.push_send_log 
        FOR ALL TO authenticated 
        USING (public.has_role(auth.uid(), 'ADMIN'))
        WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));
    END IF;
END $$;

-- 3. Bảo mật bảng system_config (nếu tồn tại)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_config') THEN
        ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "admin_full_access" ON public.system_config;
        CREATE POLICY "admin_full_access" ON public.system_config 
        FOR ALL TO authenticated 
        USING (public.has_role(auth.uid(), 'ADMIN'))
        WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));

        DROP POLICY IF EXISTS "authenticated_read_only" ON public.system_config;
        CREATE POLICY "authenticated_read_only" ON public.system_config 
        FOR SELECT TO authenticated 
        USING (true);
    END IF;
END $$;
