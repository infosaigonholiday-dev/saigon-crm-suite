-- 1. Add action tracking columns
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS action_completed_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS action_completed_by uuid NULL;

-- 2. Trigger: ensure read_at is set whenever is_read flips false->true
CREATE OR REPLACE FUNCTION public.notifications_set_read_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF COALESCE(OLD.is_read, false) = false AND COALESCE(NEW.is_read, false) = true AND NEW.read_at IS NULL THEN
    NEW.read_at := now();
  END IF;
  -- Defensive: if is_read flipped back to false, clear read_at
  IF COALESCE(OLD.is_read, false) = true AND COALESCE(NEW.is_read, false) = false THEN
    NEW.read_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notifications_set_read_at ON public.notifications;
CREATE TRIGGER trg_notifications_set_read_at
BEFORE UPDATE OF is_read ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.notifications_set_read_at();

-- 3. Backfill existing rows
UPDATE public.notifications
SET read_at = COALESCE(read_at, created_at, now())
WHERE is_read = true AND read_at IS NULL;

-- 4. Index to speed unread lookups
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id) WHERE is_read = false;

-- 5. RPC: top users with unread (admin/super_admin/hr_manager only)
CREATE OR REPLACE FUNCTION public.rpc_notification_unread_by_user()
RETURNS TABLE(
  user_id uuid,
  full_name text,
  department text,
  unread_total bigint,
  unread_high_critical bigint,
  oldest_unread_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'ADMIN'::app_role)
    OR public.has_role(auth.uid(), 'SUPER_ADMIN'::app_role)
    OR public.has_role(auth.uid(), 'HR_MANAGER'::app_role)
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
$$;

-- 6. RPC: high/critical overdue >24h
CREATE OR REPLACE FUNCTION public.rpc_notification_critical_overdue()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  recipient_name text,
  type text,
  title text,
  priority text,
  created_at timestamptz,
  hours_overdue numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'ADMIN'::app_role)
    OR public.has_role(auth.uid(), 'SUPER_ADMIN'::app_role)
    OR public.has_role(auth.uid(), 'HR_MANAGER'::app_role)
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
$$;

-- 7. RPC: complete an action (caller must own the notification)
CREATE OR REPLACE FUNCTION public.rpc_notification_complete_action(p_notification_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notifications
  SET action_completed_at = now(),
      action_completed_by = auth.uid(),
      is_read = true,
      read_at = COALESCE(read_at, now())
  WHERE id = p_notification_id
    AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Notification not found or not owned by current user';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_notification_unread_by_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_notification_critical_overdue() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_notification_complete_action(uuid) TO authenticated;