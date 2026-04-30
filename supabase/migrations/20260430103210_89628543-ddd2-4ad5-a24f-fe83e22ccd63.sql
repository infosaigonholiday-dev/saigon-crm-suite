-- 1.1 Add columns
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS action_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS action_status text,
  ADD COLUMN IF NOT EXISTS action_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS related_entity_type text,
  ADD COLUMN IF NOT EXISTS related_entity_id uuid;

-- Soft enum check
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_action_status_check;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_action_status_check
  CHECK (action_status IS NULL OR action_status IN ('pending','in_progress','completed','dismissed','overdue'));

-- Index for active actions
CREATE INDEX IF NOT EXISTS idx_notifications_action_active
  ON public.notifications(user_id, action_status)
  WHERE action_required = true AND action_status IN ('pending','in_progress','overdue');

-- 1.2 BEFORE INSERT trigger: init action fields
CREATE OR REPLACE FUNCTION public.notifications_init_action_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_due_hours int;
BEGIN
  -- Copy entity → related_entity if missing
  IF NEW.related_entity_type IS NULL AND NEW.entity_type IS NOT NULL THEN
    NEW.related_entity_type := NEW.entity_type;
  END IF;
  IF NEW.related_entity_id IS NULL AND NEW.entity_id IS NOT NULL THEN
    NEW.related_entity_id := NEW.entity_id;
  END IF;

  -- Decide action_required based on type
  IF NEW.action_required = false THEN
    IF NEW.type IN ('FOLLOW_UP_OVERDUE','LEAD_NEW_ASSIGNED') THEN
      NEW.action_required := true; v_due_hours := 24;
    ELSIF NEW.type IN ('PAYMENT_DUE','PAYMENT_OVERDUE','AR_OVERDUE') THEN
      NEW.action_required := true; v_due_hours := 48;
    ELSIF NEW.type IN ('TRANSACTION_APPROVAL','BUDGET_SETTLEMENT_PENDING','budget_settlement_pending','LEAVE_REQUEST_NEW','CONTRACT_APPROVAL') THEN
      NEW.action_required := true; v_due_hours := 72;
    END IF;
  END IF;

  IF NEW.action_required = true THEN
    IF NEW.action_status IS NULL THEN
      NEW.action_status := 'pending';
    END IF;
    IF NEW.action_due_at IS NULL AND v_due_hours IS NOT NULL THEN
      NEW.action_due_at := now() + make_interval(hours => v_due_hours);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notifications_init_action ON public.notifications;
CREATE TRIGGER trg_notifications_init_action
  BEFORE INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.notifications_init_action_fields();

-- 1.3 BEFORE UPDATE trigger: sync action status
CREATE OR REPLACE FUNCTION public.notifications_sync_action_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.action_status IS DISTINCT FROM OLD.action_status THEN
    IF NEW.action_status = 'completed' THEN
      IF NEW.action_completed_at IS NULL THEN
        NEW.action_completed_at := now();
      END IF;
      IF NEW.action_completed_by IS NULL THEN
        NEW.action_completed_by := auth.uid();
      END IF;
      NEW.is_read := true;
      IF NEW.read_at IS NULL THEN
        NEW.read_at := now();
      END IF;
    ELSIF NEW.action_status = 'dismissed' THEN
      IF NEW.action_completed_at IS NULL THEN
        NEW.action_completed_at := now();
      END IF;
      IF NEW.action_completed_by IS NULL THEN
        NEW.action_completed_by := auth.uid();
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notifications_sync_action ON public.notifications;
CREATE TRIGGER trg_notifications_sync_action
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.notifications_sync_action_status();

-- 1.4 RPC: set action status
CREATE OR REPLACE FUNCTION public.rpc_notification_set_action_status(
  p_id uuid, p_status text, p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_owner uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;
  IF p_status NOT IN ('pending','in_progress','completed','dismissed') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_status');
  END IF;

  SELECT user_id INTO v_owner FROM public.notifications WHERE id = p_id;
  IF v_owner IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;
  IF v_owner <> v_uid AND NOT has_any_role(v_uid, ARRAY['ADMIN','SUPER_ADMIN','HR_MANAGER']) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  UPDATE public.notifications
    SET action_status = p_status,
        message = CASE WHEN p_note IS NOT NULL THEN message || E'\n[Ghi chú xử lý] ' || p_note ELSE message END
  WHERE id = p_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- RPC: overview KPI for admin/hr
CREATE OR REPLACE FUNCTION public.rpc_notification_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_sent_7d int := 0;
  v_unread int := 0;
  v_action_pending int := 0;
  v_action_overdue int := 0;
BEGIN
  IF NOT has_any_role(v_uid, ARRAY['ADMIN','SUPER_ADMIN','HR_MANAGER']) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  SELECT count(*) INTO v_sent_7d FROM public.notifications WHERE created_at >= now() - interval '7 days';
  SELECT count(*) INTO v_unread FROM public.notifications WHERE is_read = false;
  SELECT count(*) INTO v_action_pending FROM public.notifications
    WHERE action_required = true AND action_status IN ('pending','in_progress');
  SELECT count(*) INTO v_action_overdue FROM public.notifications
    WHERE action_required = true AND action_status = 'overdue';

  RETURN jsonb_build_object(
    'ok', true,
    'sent_7d', v_sent_7d,
    'unread', v_unread,
    'action_pending', v_action_pending,
    'action_overdue', v_action_overdue
  );
END;
$$;

-- RPC: escalation runner
CREATE OR REPLACE FUNCTION public.run_action_escalation()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row record;
  v_count int := 0;
  v_recipient uuid;
  v_dept uuid;
BEGIN
  FOR v_row IN
    SELECT n.* FROM public.notifications n
    WHERE n.action_required = true
      AND n.action_status IN ('pending','in_progress')
      AND COALESCE(n.escalation_level, 0) < 1
      AND (
        (n.priority IN ('high','critical') AND n.is_read = false AND n.created_at < now() - interval '24 hours')
        OR (n.action_due_at IS NOT NULL AND n.action_due_at < now())
      )
  LOOP
    UPDATE public.notifications
      SET action_status = 'overdue',
          escalation_level = COALESCE(escalation_level, 0) + 1,
          escalated_at = now()
    WHERE id = v_row.id;

    SELECT department_id INTO v_dept FROM public.profiles WHERE id = v_row.user_id;

    FOR v_recipient IN
      SELECT id FROM public.profiles
      WHERE is_active = true
        AND id <> v_row.user_id
        AND (
          role IN ('ADMIN','SUPER_ADMIN')
          OR (role IN ('MANAGER','GDKD','HR_MANAGER') AND (v_dept IS NULL OR department_id = v_dept))
        )
    LOOP
      INSERT INTO public.notifications (
        user_id, type, title, message, entity_type, entity_id, priority, is_read
      ) VALUES (
        v_recipient,
        'ESCALATION_LV1',
        '⚠️ Thông báo quá hạn xử lý',
        format('%s — quá hạn xử lý, cần can thiệp.', COALESCE(v_row.title,'Thông báo')),
        v_row.entity_type, v_row.entity_id, 'high', false
      );
    END LOOP;

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'escalated', v_count);
END;
$$;

-- 1.5 Cron: every 30 min
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('run_action_escalation_30min')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='run_action_escalation_30min');
    PERFORM cron.schedule('run_action_escalation_30min', '*/30 * * * *', $cron$ SELECT public.run_action_escalation(); $cron$);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Backfill: turn off action_required for pure-info read notifications
UPDATE public.notifications
  SET action_required = false
WHERE is_read = true
  AND action_required = false
  AND type NOT IN (
    'FOLLOW_UP_OVERDUE','LEAD_NEW_ASSIGNED',
    'PAYMENT_DUE','PAYMENT_OVERDUE','AR_OVERDUE',
    'TRANSACTION_APPROVAL','BUDGET_SETTLEMENT_PENDING','budget_settlement_pending',
    'LEAVE_REQUEST_NEW','CONTRACT_APPROVAL'
  );