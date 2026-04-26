-- Insert 1 test notification cho user admin để kích hoạt trigger notify_push_on_insert
INSERT INTO public.notifications (user_id, type, title, message, entity_type, priority, is_read)
VALUES (
  '21587d06-9c1e-47c2-aa78-f7daadea4ddb',
  'TEST_PUSH',
  '🔔 Test push qua Edge Function',
  'Luồng mới: trigger DB → Edge Function send-notification → OneSignal API → thiết bị',
  'system',
  'high',
  false
);