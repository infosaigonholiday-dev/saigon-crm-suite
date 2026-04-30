CREATE OR REPLACE FUNCTION public.rpc_notification_stats_by_user_type(
  p_user_id uuid,
  p_days int DEFAULT 90,
  p_read_status text DEFAULT NULL,
  p_action_status text DEFAULT NULL
)
RETURNS TABLE (
  notification_type text,
  total_notifications bigint,
  read_count bigint,
  unread_count bigint,
  unread_high_critical bigint,
  pending_actions bigint,
  overdue_actions bigint,
  oldest_unread_at timestamptz,
  last_read_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF v_role IS NULL OR v_role NOT IN ('ADMIN','SUPER_ADMIN','HR_MANAGER','GDKD','MANAGER') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  SELECT
    n.type::text AS notification_type,
    COUNT(*)::bigint AS total_notifications,
    COUNT(*) FILTER (WHERE n.is_read = true)::bigint AS read_count,
    COUNT(*) FILTER (WHERE n.is_read = false)::bigint AS unread_count,
    COUNT(*) FILTER (WHERE n.is_read = false AND n.priority IN ('high','critical'))::bigint AS unread_high_critical,
    COUNT(*) FILTER (WHERE n.action_required = true AND n.action_status IN ('pending','in_progress','overdue'))::bigint AS pending_actions,
    COUNT(*) FILTER (WHERE n.action_status = 'overdue')::bigint AS overdue_actions,
    MIN(n.created_at) FILTER (WHERE n.is_read = false) AS oldest_unread_at,
    MAX(n.read_at) AS last_read_at
  FROM public.notifications n
  WHERE n.user_id = p_user_id
    AND (p_days IS NULL OR n.created_at >= now() - make_interval(days => p_days))
    AND (
      p_read_status IS NULL
      OR (p_read_status = 'read' AND n.is_read = true)
      OR (p_read_status = 'unread' AND n.is_read = false)
      OR (p_read_status = 'unread_high' AND n.is_read = false AND n.priority IN ('high','critical'))
      OR (p_read_status = 'unread_24h' AND n.is_read = false AND n.created_at < now() - interval '24 hours')
    )
    AND (
      p_action_status IS NULL
      OR (p_action_status = 'pending_or_in_progress' AND n.action_status IN ('pending','in_progress'))
      OR (p_action_status = 'read_unhandled' AND n.is_read = true AND n.action_status IN ('pending','in_progress','overdue'))
      OR (p_action_status NOT IN ('pending_or_in_progress','read_unhandled') AND n.action_status = p_action_status)
    )
  GROUP BY n.type
  ORDER BY unread_high_critical DESC, unread_count DESC, total_notifications DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_notification_stats_by_user_type(uuid, int, text, text) TO authenticated;