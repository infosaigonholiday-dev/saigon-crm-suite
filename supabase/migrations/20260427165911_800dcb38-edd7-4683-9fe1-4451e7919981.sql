-- Trigger: auto recalculate milestone completion when task changes status
CREATE OR REPLACE FUNCTION public.recalc_milestone_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total int;
  v_done int;
  v_pct int;
  v_mid uuid;
BEGIN
  v_mid := COALESCE(NEW.milestone_id, OLD.milestone_id);
  IF v_mid IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT count(*), count(*) FILTER (WHERE status = 'done')
    INTO v_total, v_done
  FROM tasks WHERE milestone_id = v_mid;

  IF v_total = 0 THEN
    v_pct := 0;
  ELSE
    v_pct := ROUND(v_done * 100.0 / v_total);
  END IF;

  UPDATE milestones
    SET completion_pct = v_pct,
        status = CASE
          WHEN v_total > 0 AND v_done = v_total THEN 'completed'
          WHEN v_done > 0 THEN 'in_progress'
          ELSE status
        END
  WHERE id = v_mid;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_tasks_recalc_milestone ON public.tasks;
CREATE TRIGGER trg_tasks_recalc_milestone
AFTER INSERT OR UPDATE OF status, milestone_id OR DELETE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.recalc_milestone_completion();

-- Notification: TASK_ASSIGNED
CREATE OR REPLACE FUNCTION public.notify_task_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignee_profile uuid;
  v_reporter_profile uuid;
  v_campaign_name text;
  v_due text;
BEGIN
  IF NEW.assignee_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.assignee_id IS NOT DISTINCT FROM NEW.assignee_id THEN
    RETURN NEW;
  END IF;

  SELECT profile_id INTO v_assignee_profile FROM employees WHERE id = NEW.assignee_id;
  IF NEW.reporter_id IS NOT NULL THEN
    SELECT profile_id INTO v_reporter_profile FROM employees WHERE id = NEW.reporter_id;
  END IF;

  IF v_assignee_profile IS NULL OR v_assignee_profile = COALESCE(v_reporter_profile, '00000000-0000-0000-0000-000000000000'::uuid) THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_campaign_name FROM campaigns WHERE id = NEW.campaign_id;
  v_due := CASE WHEN NEW.due_date IS NOT NULL THEN to_char(NEW.due_date, 'DD/MM/YYYY') ELSE 'chưa định' END;

  INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
  VALUES (
    v_assignee_profile,
    'TASK_ASSIGNED',
    format('📌 Việc mới: %s', NEW.title),
    format('Chiến dịch: %s — Deadline: %s', COALESCE(v_campaign_name, '(không có)'), v_due),
    'task', NEW.id, 'high', false
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tasks_notify_assigned ON public.tasks;
CREATE TRIGGER trg_tasks_notify_assigned
AFTER INSERT OR UPDATE OF assignee_id ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.notify_task_assigned();

-- Notification: MILESTONE_COMPLETED
CREATE OR REPLACE FUNCTION public.notify_milestone_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_profile uuid;
  v_campaign_name text;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status OR NEW.status <> 'completed' THEN
    RETURN NEW;
  END IF;

  SELECT c.name, e.profile_id INTO v_campaign_name, v_owner_profile
  FROM campaigns c LEFT JOIN employees e ON e.id = c.owner_id
  WHERE c.id = NEW.campaign_id;

  IF v_owner_profile IS NULL THEN RETURN NEW; END IF;

  INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
  VALUES (
    v_owner_profile,
    'MILESTONE_COMPLETED',
    format('🎯 Milestone hoàn thành: %s', NEW.name),
    format('Chiến dịch: %s', COALESCE(v_campaign_name, '(không tên)')),
    'campaign', NEW.campaign_id, 'normal', false
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_milestones_notify_completed ON public.milestones;
CREATE TRIGGER trg_milestones_notify_completed
AFTER UPDATE OF status ON public.milestones
FOR EACH ROW EXECUTE FUNCTION public.notify_milestone_completed();

-- Internal notes support 'campaign' entity_type
-- (no schema change needed if internal_notes uses free-text entity_type, but ensure constraint allows it)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'internal_notes_entity_type_check'
      AND conrelid = 'public.internal_notes'::regclass
  ) THEN
    ALTER TABLE public.internal_notes DROP CONSTRAINT internal_notes_entity_type_check;
  END IF;
END $$;