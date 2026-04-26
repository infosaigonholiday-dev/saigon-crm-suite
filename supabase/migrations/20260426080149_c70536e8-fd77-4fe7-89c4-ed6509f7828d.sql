-- Lưu credentials OneSignal vào system_config để trigger notify_push_on_insert có thể gọi REST API
INSERT INTO public.system_config (key, value, description)
VALUES 
  ('ONESIGNAL_APP_ID', '6d188763-a8d6-40c3-b5c2-3a1ca9f5fa4f', 'OneSignal App ID dùng cho Web Push'),
  ('ONESIGNAL_REST_API_KEY', 'os_v2_app_numioy5i2zamhnochiokt5p2j6cvzmx3p7rutvngrivo4yjxyzyautvpkrcugiv23rvcpzfw2cmrgkmu2em5vjb6wvdynxelfuop6ki', 'OneSignal REST API Key (server) dùng để gửi push từ DB trigger')
ON CONFLICT (key) DO UPDATE 
  SET value = EXCLUDED.value, 
      description = EXCLUDED.description,
      updated_at = now();