-- Cập nhật OneSignal REST API Key (App API Key v2 vừa tạo từ OneSignal Dashboard)
-- Key cũ trả 403 do là Legacy User Auth Key. Key mới có prefix os_v2_app_ là format chuẩn 2024+.
-- Trigger notify_push_on_insert() đã tự detect prefix os_v2_ → dùng header "Key <token>" đúng chuẩn.

UPDATE public.system_config
SET 
  value = 'os_v2_app_l23tfx3w5rh2tb2bcfjhbi44mzn5mb32ecvenf5es4spz3ig7lj6bst55bc3qvxcv2sjzkrc6lach5znxxx4xbedtcevehvkifjzdpa',
  updated_at = now()
WHERE key = 'ONESIGNAL_REST_API_KEY';

-- Insert nếu chưa tồn tại
INSERT INTO public.system_config (key, value, updated_at)
SELECT 'ONESIGNAL_REST_API_KEY',
       'os_v2_app_l23tfx3w5rh2tb2bcfjhbi44mzn5mb32ecvenf5es4spz3ig7lj6bst55bc3qvxcv2sjzkrc6lach5znxxx4xbedtcevehvkifjzdpa',
       now()
WHERE NOT EXISTS (SELECT 1 FROM public.system_config WHERE key = 'ONESIGNAL_REST_API_KEY');