DROP FUNCTION IF EXISTS public.rpc_notification_stats_by_user();

CREATE OR REPLACE FUNCTION public.rpc_notification_stats_by_user()
 RETURNS TABLE(user_id uuid, full_name text, email text, department text, role text, total_notifications bigint, read_count bigint, unread_count bigint, unread_high_critical bigint, pending_actions bigint, overdue_actions bigint, last_read_at timestamptz)
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
    p.id, p.full_name, p.email, d.code, p.role,
    COUNT(n.id)::bigint,
    COUNT(n.id) FILTER (WHERE n.is_read = true)::bigint,
    COUNT(n.id) FILTER (WHERE n.is_read = false)::bigint,
    COUNT(n.id) FILTER (WHERE n.is_read = false AND n.priority IN ('high','critical'))::bigint,
    COUNT(n.id) FILTER (WHERE n.action_required = true AND n.action_status IN ('pending','in_progress','overdue'))::bigint,
    COUNT(n.id) FILTER (WHERE n.action_status = 'overdue')::bigint,
    MAX(n.read_at)
  FROM public.profiles p
  LEFT JOIN public.departments d ON d.id = p.department_id
  LEFT JOIN public.notifications n
    ON n.user_id = p.id AND n.created_at > now() - interval '90 days'
  WHERE COALESCE(p.is_active, true) = true
  GROUP BY p.id, p.full_name, p.email, d.code, p.role
  HAVING COUNT(n.id) > 0
  ORDER BY
    COUNT(n.id) FILTER (WHERE n.is_read = false AND n.priority IN ('high','critical')) DESC,
    COUNT(n.id) FILTER (WHERE n.action_required = true AND n.action_status IN ('pending','in_progress','overdue')) DESC,
    COUNT(n.id) FILTER (WHERE n.is_read = false) DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.rpc_notification_stats_by_user() TO authenticated;

CREATE OR REPLACE FUNCTION public.rpc_notification_audit_list(
  p_range_days int DEFAULT 30,
  p_user_id uuid DEFAULT NULL,
  p_department text DEFAULT NULL,
  p_type text DEFAULT NULL,
  p_types text[] DEFAULT NULL,
  p_read_status text DEFAULT NULL,
  p_action_status text DEFAULT NULL,
  p_search text DEFAULT NULL
)
RETURNS TABLE(
  id uuid, user_id uuid, full_name text, email text, department text, role text,
  type text, title text, message text, priority text,
  created_at timestamptz, is_read boolean, read_at timestamptz,
  action_required boolean, action_status text, action_due_at timestamptz, action_completed_at timestamptz,
  related_entity_type text, related_entity_id uuid, entity_type text, entity_id uuid, action_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    n.id, n.user_id,
    p.full_name, p.email, d.code, p.role,
    n.type, n.title, n.message, n.priority,
    n.created_at, n.is_read, n.read_at,
    n.action_required, n.action_status, n.action_due_at, n.action_completed_at,
    n.related_entity_type, n.related_entity_id, n.entity_type, n.entity_id, n.action_url
  FROM public.notifications n
  LEFT JOIN public.profiles p ON p.id = n.user_id
  LEFT JOIN public.departments d ON d.id = p.department_id
  WHERE
    (p_range_days IS NULL OR n.created_at > now() - make_interval(days => p_range_days))
    AND (p_user_id IS NULL OR n.user_id = p_user_id)
    AND (p_department IS NULL OR d.code = p_department)
    AND (p_type IS NULL OR n.type = p_type)
    AND (p_types IS NULL OR n.type = ANY(p_types))
    AND (
      p_read_status IS NULL
      OR (p_read_status = 'read' AND n.is_read = true)
      OR (p_read_status = 'unread' AND n.is_read = false)
      OR (p_read_status = 'unread_high' AND n.is_read = false AND n.priority IN ('high','critical'))
      OR (p_read_status = 'unread_24h' AND n.is_read = false AND n.created_at < now() - interval '24 hours')
    )
    AND (
      p_action_status IS NULL
      OR (p_action_status = 'none' AND COALESCE(n.action_required, false) = false)
      OR (p_action_status = 'pending' AND n.action_status = 'pending')
      OR (p_action_status = 'in_progress' AND n.action_status = 'in_progress')
      OR (p_action_status = 'overdue' AND n.action_status = 'overdue')
      OR (p_action_status = 'completed' AND n.action_status = 'completed')
      OR (p_action_status = 'pending_or_in_progress' AND n.action_status IN ('pending','in_progress'))
      OR (p_action_status = 'read_unhandled' AND n.is_read = true AND n.action_required = true AND n.action_status IN ('pending','in_progress','overdue'))
    )
    AND (
      p_search IS NULL OR p_search = ''
      OR n.title ILIKE '%' || p_search || '%'
      OR n.message ILIKE '%' || p_search || '%'
      OR p.full_name ILIKE '%' || p_search || '%'
      OR p.email ILIKE '%' || p_search || '%'
    )
  ORDER BY n.created_at DESC
  LIMIT 500;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_notification_audit_list(int, uuid, text, text, text[], text, text, text) TO authenticated;