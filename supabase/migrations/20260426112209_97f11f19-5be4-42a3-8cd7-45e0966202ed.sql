-- Fix linter: Security Definer View → security_invoker
DROP VIEW IF EXISTS public.v_push_health;

CREATE VIEW public.v_push_health
WITH (security_invoker = true) AS
SELECT
  psl.id,
  psl.created_at,
  psl.title,
  psl.user_id,
  psl.error AS pre_request_error,
  psl.request_id,
  hr.status_code,
  LEFT(hr.content::text, 300) AS response_body,
  hr.error_msg AS response_error
FROM public.push_send_log psl
LEFT JOIN net._http_response hr ON hr.id = psl.request_id
ORDER BY psl.created_at DESC;

GRANT SELECT ON public.v_push_health TO authenticated;
