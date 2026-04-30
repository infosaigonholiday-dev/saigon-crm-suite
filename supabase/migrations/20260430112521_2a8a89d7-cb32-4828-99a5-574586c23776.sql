-- Bảo vệ bảng backup
ALTER TABLE public.notifications_backup_20260430 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_view_backup" ON public.notifications_backup_20260430;
CREATE POLICY "admin_view_backup" ON public.notifications_backup_20260430
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

-- Cột action_url
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS action_url TEXT;

-- Function sinh URL
CREATE OR REPLACE FUNCTION public.generate_action_url(p_entity_type TEXT, p_entity_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF p_entity_type IS NULL OR p_entity_id IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN CASE p_entity_type
    WHEN 'lead'              THEN '/tiem-nang?id='        || p_entity_id::text
    WHEN 'customer'          THEN '/khach-hang/'          || p_entity_id::text
    WHEN 'booking'           THEN '/dat-tour/'            || p_entity_id::text
    WHEN 'tour_file'         THEN '/ho-so-doan/'          || p_entity_id::text
    WHEN 'office_expense'    THEN '/tai-chinh?tab=hcns&id='       || p_entity_id::text
    WHEN 'tour_settlement'   THEN '/tai-chinh?tab=quyet-toan&id=' || p_entity_id::text
    WHEN 'supplier_invoice'  THEN '/tai-chinh?tab=payables&id='   || p_entity_id::text
    WHEN 'recurring_expense' THEN '/tai-chinh?tab=recurring&id='  || p_entity_id::text
    WHEN 'leave_request'     THEN '/nghi-phep?id='        || p_entity_id::text
    WHEN 'contract'          THEN '/hop-dong?id='         || p_entity_id::text
    WHEN 'campaign'          THEN '/chien-dich/'          || p_entity_id::text
    WHEN 'employee'          THEN '/nhan-su/'             || p_entity_id::text
    ELSE NULL
  END;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.generate_action_url(TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_action_url(TEXT, UUID) TO authenticated, service_role;

-- Trigger function
CREATE OR REPLACE FUNCTION public.auto_fill_action_url()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.related_entity_type IS NOT NULL
     AND NEW.related_entity_id IS NOT NULL
     AND (NEW.action_url IS NULL
          OR length(trim(NEW.action_url)) <= 1
          OR NEW.action_url IN ('/', '#', '/notifications')) THEN
    NEW.action_url := public.generate_action_url(NEW.related_entity_type, NEW.related_entity_id);
  END IF;

  IF (NEW.action_url IS NULL OR length(trim(NEW.action_url)) <= 1)
     AND NEW.entity_type IS NOT NULL
     AND NEW.entity_id IS NOT NULL THEN
    NEW.action_url := public.generate_action_url(NEW.entity_type, NEW.entity_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notification_auto_url ON public.notifications;
CREATE TRIGGER trg_notification_auto_url
  BEFORE INSERT OR UPDATE OF related_entity_type, related_entity_id, entity_type, entity_id, action_url
  ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_fill_action_url();

-- Backfill data cũ
UPDATE public.notifications
SET action_url = COALESCE(
  public.generate_action_url(related_entity_type, related_entity_id),
  public.generate_action_url(entity_type, entity_id)
)
WHERE action_url IS NULL;

-- CHECK constraint
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS chk_action_url_required;
ALTER TABLE public.notifications
  ADD CONSTRAINT chk_action_url_required CHECK (
    (action_required = false AND priority IN ('low','medium'))
    OR (
      action_url IS NOT NULL
      AND length(trim(action_url)) > 1
      AND action_url NOT IN ('/', '#', '/notifications')
    )
  ) NOT VALID;