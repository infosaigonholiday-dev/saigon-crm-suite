CREATE OR REPLACE FUNCTION public.notify_push_on_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net'
AS $function$
DECLARE
  v_supabase_url text;
  v_anon_key text;
  v_function_url text;
  v_path text;
  v_request_id bigint;
  v_body jsonb;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;

  SELECT value INTO v_supabase_url FROM public.system_config WHERE key = 'SUPABASE_URL';
  SELECT value INTO v_anon_key FROM public.system_config WHERE key = 'SUPABASE_ANON_KEY';

  IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
    v_supabase_url := 'https://aneazkhnqkkpqtcxunqd.supabase.co';
  END IF;

  IF v_anon_key IS NULL OR v_anon_key = '' THEN
    v_anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuZWF6a2hucWtrcHF0Y3h1bnFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjIwOTEsImV4cCI6MjA4OTk5ODA5MX0.uHPUBzQMIV69aL4KOWeaq6xwG9I5MuPv_DkQGzFsX8M';
  END IF;

  v_function_url := v_supabase_url || '/functions/v1/send-notification';

  v_path := CASE COALESCE(NEW.entity_type,'')
    WHEN 'lead' THEN '/tiem-nang'
    WHEN 'customer' THEN '/khach-hang'
    WHEN 'booking' THEN '/dat-tour'
    WHEN 'budget_estimate' THEN '/tai-chinh'
    WHEN 'budget_settlement' THEN '/tai-chinh'
    WHEN 'transaction' THEN '/tai-chinh'
    WHEN 'leave_request' THEN '/quan-ly-nghi-phep'
    WHEN 'contract' THEN '/hop-dong'
    WHEN 'payment' THEN '/thanh-toan'
    WHEN 'employee' THEN '/nhan-su'
    WHEN 'payroll' THEN '/bang-luong'
    WHEN 'kpi_achievement' THEN '/bang-luong'
    WHEN 'dashboard' THEN '/'
    ELSE '/canh-bao'
  END;

  v_body := jsonb_build_object(
    'user_id', NEW.user_id,
    'title', NEW.title,
    'message', NEW.message,
    'url', v_path
  );

  BEGIN
    SELECT net.http_post(
      url := v_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_anon_key
      ),
      body := v_body
    ) INTO v_request_id;

    INSERT INTO public.push_send_log (notification_id, user_id, title, request_id)
    VALUES (NEW.id, NEW.user_id, NEW.title, v_request_id);
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.push_send_log (notification_id, user_id, title, error)
    VALUES (NEW.id, NEW.user_id, NEW.title, 'pg_net error: ' || SQLERRM);
  END;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.send_kpi_achievement_notification(
  p_user_id uuid,
  p_employee_name text,
  p_commission_pct numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
BEGIN
  IF NOT (public.has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_MANAGER','HCNS'])) THEN
    RAISE EXCEPTION 'Permission denied: only ADMIN/HR can send KPI achievement notifications';
  END IF;

  INSERT INTO public.notifications (user_id, type, title, message, entity_type, entity_id, priority)
  VALUES (
    p_user_id,
    'KPI_ACHIEVEMENT',
    '🏆 Chúc mừng ' || COALESCE(p_employee_name, 'bạn') || '! 🎉',
    'Bạn đã vượt KPI tháng và đạt mức hoa hồng ' || p_commission_pct::text || '%!',
    'kpi_achievement',
    p_user_id,
    'high'
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.send_kpi_achievement_notification(uuid, text, numeric) TO authenticated;