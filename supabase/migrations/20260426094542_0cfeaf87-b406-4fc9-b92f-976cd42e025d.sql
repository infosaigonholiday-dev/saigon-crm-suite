-- Cập nhật credentials OneSignal sang app mới (5eb732df-...) để khớp với frontend
INSERT INTO public.system_config (key, value, description, updated_at)
VALUES
  ('ONESIGNAL_APP_ID', '5eb732df-76ec-4fa9-8741-115270a39c66', 'OneSignal App ID dùng cho Web Push', now()),
  ('ONESIGNAL_REST_API_KEY', 'os_v2_app_l23tfx3w5rh2tb2bcfjhbi44m2azqbd4ovfe63vhpuedr6623ldrguy4rms4c26yqsrbhz43lvjpq7ush76u6cgrg7rwws5adkumdxy', 'OneSignal REST API Key (server) dùng để gửi push từ DB trigger', now())
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value,
      description = EXCLUDED.description,
      updated_at = now();