-- 1. Seed company info keys (only insert if missing — preserve existing values)
INSERT INTO public.system_config (key, value, description) VALUES
  ('COMPANY_NAME',      'CÔNG TY TNHH DU LỊCH SAIGON HOLIDAY', 'Tên công ty đầy đủ'),
  ('COMPANY_SHORT_NAME','SAIGON HOLIDAY',                       'Tên ngắn hiển thị logo'),
  ('COMPANY_TAGLINE',   '✦ Đi để cảm nhận ✦',                   'Slogan công ty'),
  ('COMPANY_TAX_CODE',  '',                                     'Mã số thuế'),
  ('COMPANY_LICENSE',   '79–1000/2019/TCDL',                    'Giấy phép lữ hành quốc tế'),
  ('COMPANY_ADDRESS',   '01 Hoa Cúc, P.07, Q.Phú Nhuận, TP.HCM','Địa chỉ trụ sở'),
  ('COMPANY_ADDRESS2',  'VP: 1009 Hoàng Sa, P.11, Q.3, TP.HCM', 'Địa chỉ văn phòng phụ'),
  ('COMPANY_PHONE',     '0905 33 55 16 – 0902 141 901',         'Số điện thoại'),
  ('COMPANY_EMAIL',     '',                                     'Email công ty'),
  ('COMPANY_WEBSITE',   'www.saigonholiday.vn',                 'Website'),
  ('COMPANY_LOGO_URL',  '',                                     'URL logo công ty'),
  ('COMPANY_BANK_1',    'ACB|CÔNG TY TNHH DU LỊCH SAIGON HOLIDAY|', 'Ngân hàng 1: tên|chủ TK|số TK'),
  ('COMPANY_BANK_2',    'Vietcombank|CÔNG TY TNHH DU LỊCH SAIGON HOLIDAY|', 'Ngân hàng 2: tên|chủ TK|số TK')
ON CONFLICT (key) DO NOTHING;

-- 2. RLS policies: authenticated read, admin write
DROP POLICY IF EXISTS "system_config_select_auth" ON public.system_config;
CREATE POLICY "system_config_select_auth"
ON public.system_config FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "system_config_admin_insert" ON public.system_config;
CREATE POLICY "system_config_admin_insert"
ON public.system_config FOR INSERT
TO authenticated
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']));

DROP POLICY IF EXISTS "system_config_admin_update" ON public.system_config;
CREATE POLICY "system_config_admin_update"
ON public.system_config FOR UPDATE
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']));

DROP POLICY IF EXISTS "system_config_admin_delete" ON public.system_config;
CREATE POLICY "system_config_admin_delete"
ON public.system_config FOR DELETE
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']));

-- 3. Storage bucket for company assets (logo)
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies
DROP POLICY IF EXISTS "company_assets_public_read" ON storage.objects;
CREATE POLICY "company_assets_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-assets');

DROP POLICY IF EXISTS "company_assets_admin_insert" ON storage.objects;
CREATE POLICY "company_assets_admin_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-assets'
  AND public.has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN'])
);

DROP POLICY IF EXISTS "company_assets_admin_update" ON storage.objects;
CREATE POLICY "company_assets_admin_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'company-assets'
  AND public.has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN'])
);

DROP POLICY IF EXISTS "company_assets_admin_delete" ON storage.objects;
CREATE POLICY "company_assets_admin_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'company-assets'
  AND public.has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN'])
);