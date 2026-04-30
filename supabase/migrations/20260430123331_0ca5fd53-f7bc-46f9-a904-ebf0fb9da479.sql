-- Fix: app_role type does not exist in this project. Use text-based has_role().

CREATE OR REPLACE FUNCTION public.rpc_notification_stats_by_user()
RETURNS TABLE(
  user_id uuid, full_name text, email text, department text,
  total_notifications bigint, read_count bigint, unread_count bigint,
  unread_high_critical bigint, pending_actions bigint, overdue_actions bigint,
  last_read_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'ADMIN')
    OR public.has_role(auth.uid(), 'SUPER_ADMIN')
    OR public.has_role(auth.uid(), 'HR_MANAGER')
    OR public.has_role(auth.uid(), 'GDKD')
    OR public.has_role(auth.uid(), 'MANAGER')
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    p.id AS user_id,
    p.full_name,
    p.email,
    p.department,
    COUNT(n.id)::bigint AS total_notifications,
    COUNT(n.id) FILTER (WHERE n.is_read = true)::bigint AS read_count,
    COUNT(n.id) FILTER (WHERE n.is_read = false)::bigint AS unread_count,
    COUNT(n.id) FILTER (WHERE n.is_read = false AND n.priority IN ('high','critical'))::bigint AS unread_high_critical,
    COUNT(n.id) FILTER (WHERE n.action_required = true AND n.action_status IN ('pending','in_progress','overdue'))::bigint AS pending_actions,
    COUNT(n.id) FILTER (WHERE n.action_status = 'overdue')::bigint AS overdue_actions,
    MAX(n.read_at) AS last_read_at
  FROM public.profiles p
  LEFT JOIN public.notifications n
    ON n.user_id = p.id
   AND n.created_at > now() - interval '90 days'
  WHERE COALESCE(p.is_active, true) = true
  GROUP BY p.id, p.full_name, p.email, p.department
  HAVING COUNT(n.id) > 0
  ORDER BY
    COUNT(n.id) FILTER (WHERE n.is_read = false AND n.priority IN ('high','critical')) DESC,
    COUNT(n.id) FILTER (WHERE n.action_required = true AND n.action_status IN ('pending','in_progress','overdue')) DESC,
    COUNT(n.id) FILTER (WHERE n.is_read = false) DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_notification_critical_overdue()
RETURNS TABLE(
  id uuid, user_id uuid, recipient_name text, type text, title text,
  priority text, created_at timestamp with time zone, hours_overdue numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'ADMIN')
    OR public.has_role(auth.uid(), 'SUPER_ADMIN')
    OR public.has_role(auth.uid(), 'HR_MANAGER')
    OR public.has_role(auth.uid(), 'GDKD')
    OR public.has_role(auth.uid(), 'MANAGER')
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    n.id,
    n.user_id,
    p.full_name AS recipient_name,
    n.type,
    n.title,
    n.priority,
    n.created_at,
    ROUND(EXTRACT(EPOCH FROM (now() - n.created_at)) / 3600.0, 1)::numeric AS hours_overdue
  FROM public.notifications n
  LEFT JOIN public.profiles p ON p.id = n.user_id
  WHERE n.is_read = false
    AND n.priority IN ('high','critical')
    AND n.created_at < now() - interval '24 hours'
  ORDER BY n.created_at ASC
  LIMIT 200;
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_notification_unread_by_user()
RETURNS TABLE(
  user_id uuid, full_name text, department text,
  unread_total bigint, unread_high_critical bigint, oldest_unread_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'ADMIN')
    OR public.has_role(auth.uid(), 'SUPER_ADMIN')
    OR public.has_role(auth.uid(), 'HR_MANAGER')
    OR public.has_role(auth.uid(), 'GDKD')
    OR public.has_role(auth.uid(), 'MANAGER')
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    n.user_id,
    p.full_name,
    p.department,
    COUNT(*)::bigint AS unread_total,
    COUNT(*) FILTER (WHERE n.priority IN ('high','critical'))::bigint AS unread_high_critical,
    MIN(n.created_at) AS oldest_unread_at
  FROM public.notifications n
  LEFT JOIN public.profiles p ON p.id = n.user_id
  WHERE n.is_read = false
  GROUP BY n.user_id, p.full_name, p.department
  ORDER BY unread_total DESC
  LIMIT 50;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.rpc_notification_stats_by_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_notification_critical_overdue() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_notification_unread_by_user() TO authenticated;