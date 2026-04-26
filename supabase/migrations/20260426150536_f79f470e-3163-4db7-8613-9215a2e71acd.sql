DO $$
DECLARE
  v_key text;
  v_app text;
  v_req1 bigint; v_req2 bigint; v_req3 bigint; v_req4 bigint;
BEGIN
  SELECT value INTO v_key FROM public.system_config WHERE key='ONESIGNAL_REST_API_KEY';
  SELECT value INTO v_app FROM public.system_config WHERE key='ONESIGNAL_APP_ID';
  
  -- Variant A: lowercase header name
  SELECT net.http_get(
    url := 'https://onesignal.com/api/v1/apps/' || v_app,
    headers := jsonb_build_object('authorization','Key '|| v_key)
  ) INTO v_req1;
  INSERT INTO public.push_send_log (notification_id, user_id, title, request_id)
  VALUES (gen_random_uuid(), '21587d06-9c1e-47c2-aa78-f7daadea4ddb'::uuid, 'DEBUG-A lowercase header', v_req1);

  -- Variant B: explicit Accept + User-Agent
  SELECT net.http_get(
    url := 'https://onesignal.com/api/v1/apps/' || v_app,
    headers := jsonb_build_object(
      'Authorization','Key '|| v_key,
      'Accept','application/json',
      'User-Agent','SaigonHolidayCRM/1.0'
    )
  ) INTO v_req2;
  INSERT INTO public.push_send_log (notification_id, user_id, title, request_id)
  VALUES (gen_random_uuid(), '21587d06-9c1e-47c2-aa78-f7daadea4ddb'::uuid, 'DEBUG-B with UA Accept', v_req2);

  -- Variant C: hit api.onesignal.com (v2) which is documented for v2 keys
  SELECT net.http_get(
    url := 'https://api.onesignal.com/apps/' || v_app,
    headers := jsonb_build_object('Authorization','Key '|| v_key)
  ) INTO v_req3;
  INSERT INTO public.push_send_log (notification_id, user_id, title, request_id)
  VALUES (gen_random_uuid(), '21587d06-9c1e-47c2-aa78-f7daadea4ddb'::uuid, 'DEBUG-C v2 host', v_req3);

  -- Variant D: hit httpbin to see exactly what headers pg_net sends
  SELECT net.http_get(
    url := 'https://httpbin.org/headers',
    headers := jsonb_build_object('Authorization','Key '|| v_key)
  ) INTO v_req4;
  INSERT INTO public.push_send_log (notification_id, user_id, title, request_id)
  VALUES (gen_random_uuid(), '21587d06-9c1e-47c2-aa78-f7daadea4ddb'::uuid, 'DEBUG-D httpbin', v_req4);
END $$;