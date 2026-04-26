DO $$
DECLARE
  v_req_id bigint;
  v_key text;
  v_app text;
BEGIN
  SELECT value INTO v_key FROM public.system_config WHERE key='ONESIGNAL_REST_API_KEY';
  SELECT value INTO v_app FROM public.system_config WHERE key='ONESIGNAL_APP_ID';
  
  -- Test 1: GET /apps/{id} from pg_net
  SELECT net.http_get(
    url := 'https://onesignal.com/api/v1/apps/' || v_app,
    headers := jsonb_build_object('Authorization','Key '|| v_key)
  ) INTO v_req_id;
  
  INSERT INTO public.push_send_log (notification_id, user_id, title, request_id)
  VALUES (gen_random_uuid(), '21587d06-9c1e-47c2-aa78-f7daadea4ddb'::uuid, 'DEBUG GET /apps from pg_net', v_req_id);
END $$;