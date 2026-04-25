
-- =====================================================
-- Trigger thông báo cho budget_estimates
-- =====================================================
CREATE OR REPLACE FUNCTION public.notify_budget_estimate_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_func_url TEXT := 'https://aneazkhnqkkpqtcxunqd.supabase.co/functions/v1/send-notification';
  v_anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuZWF6a2hucWtrcHF0Y3h1bnFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjIwOTEsImV4cCI6MjA4OTk5ODA5MX0.uHPUBzQMIV69aL4KOWeaq6xwG9I5MuPv_DkQGzFsX8M';
  v_recipient uuid;
  v_title text;
  v_message text;
  v_code text;
BEGIN
  v_code := COALESCE(NEW.code, NEW.id::text);

  -- INSERT or status -> pending_review: notify KETOAN+ADMIN
  IF (TG_OP='INSERT' AND COALESCE(NEW.status,'') = 'pending_review')
     OR (TG_OP='UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'pending_review') THEN
    v_title := '📋 Dự toán mới cần duyệt';
    v_message := format('Dự toán %s cần Kế toán duyệt', v_code);
    FOR v_recipient IN
      SELECT id FROM profiles WHERE is_active = true AND role IN ('KETOAN','ADMIN','SUPER_ADMIN')
    LOOP
      INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
      VALUES (v_recipient, 'BUDGET_ESTIMATE_NEW', v_title, v_message, 'budget_estimate', NEW.id, 'high', false);
      BEGIN
        PERFORM net.http_post(
          url := v_func_url,
          headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || v_anon_key),
          body := jsonb_build_object(
            'user_id', v_recipient, 'title', v_title, 'message', v_message,
            'url','/tai-chinh','tag','BUDGET_ESTIMATE_NEW-' || NEW.id
          )
        );
      EXCEPTION WHEN OTHERS THEN NULL; END;
    END LOOP;

  -- approved/rejected: notify created_by
  ELSIF TG_OP='UPDATE' AND OLD.status IS DISTINCT FROM NEW.status
        AND NEW.status IN ('approved','rejected') AND NEW.created_by IS NOT NULL THEN
    IF NEW.status = 'approved' THEN
      v_title := '✅ Dự toán đã được duyệt';
      v_message := format('Dự toán %s đã được Kế toán duyệt', v_code);
    ELSE
      v_title := '❌ Dự toán bị từ chối';
      v_message := format('Dự toán %s bị từ chối: %s', v_code, COALESCE(NEW.review_note,'(không ghi lý do)'));
    END IF;
    INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
    VALUES (NEW.created_by, 'BUDGET_ESTIMATE_RESULT', v_title, v_message, 'budget_estimate', NEW.id, 'high', false);
    BEGIN
      PERFORM net.http_post(
        url := v_func_url,
        headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || v_anon_key),
        body := jsonb_build_object(
          'user_id', NEW.created_by, 'title', v_title, 'message', v_message,
          'url','/tai-chinh','tag','BUDGET_ESTIMATE_RESULT-' || NEW.id
        )
      );
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_budget_estimate ON public.budget_estimates;
CREATE TRIGGER trg_notify_budget_estimate
  AFTER INSERT OR UPDATE ON public.budget_estimates
  FOR EACH ROW EXECUTE FUNCTION public.notify_budget_estimate_change();

-- =====================================================
-- Trigger thông báo cho budget_settlements
-- =====================================================
CREATE OR REPLACE FUNCTION public.notify_budget_settlement_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_func_url TEXT := 'https://aneazkhnqkkpqtcxunqd.supabase.co/functions/v1/send-notification';
  v_anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuZWF6a2hucWtrcHF0Y3h1bnFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjIwOTEsImV4cCI6MjA4OTk5ODA5MX0.uHPUBzQMIV69aL4KOWeaq6xwG9I5MuPv_DkQGzFsX8M';
  v_recipient uuid;
  v_title text;
  v_message text;
  v_code text;
  v_target_roles text[];
  v_url text := '/tai-chinh';
BEGIN
  v_code := COALESCE(NEW.code, NEW.id::text);

  IF TG_OP='UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'pending_accountant' THEN
      v_title := '📑 Quyết toán mới cần duyệt'; v_message := format('Quyết toán %s cần Kế toán duyệt', v_code);
      v_target_roles := ARRAY['KETOAN','ADMIN','SUPER_ADMIN'];
    ELSIF NEW.status = 'pending_ceo' THEN
      v_title := '🔔 Quyết toán cần CEO duyệt cuối'; v_message := format('Quyết toán %s đã qua Kế toán, chờ CEO duyệt', v_code);
      v_target_roles := ARRAY['ADMIN','SUPER_ADMIN'];
    ELSIF NEW.status = 'closed' THEN
      v_title := '🔒 Booking đã đóng'; v_message := format('Quyết toán %s đã được CEO duyệt và booking đã đóng', v_code);
      v_target_roles := ARRAY['KETOAN','DIEUHAN'];
      -- Notify created_by + KETOAN + DIEUHAN
      IF NEW.created_by IS NOT NULL THEN
        INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
        VALUES (NEW.created_by, 'BUDGET_SETTLEMENT_CLOSED', v_title, v_message, 'budget_settlement', NEW.id, 'high', false);
      END IF;
    ELSIF NEW.status = 'rejected' AND NEW.created_by IS NOT NULL THEN
      v_title := '❌ Quyết toán bị từ chối'; v_message := format('Quyết toán %s bị từ chối: %s', v_code, COALESCE(NEW.review_note,'(không ghi lý do)'));
      INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
      VALUES (NEW.created_by, 'BUDGET_SETTLEMENT_REJECTED', v_title, v_message, 'budget_settlement', NEW.id, 'high', false);
      RETURN NEW;
    END IF;

    IF v_target_roles IS NOT NULL THEN
      FOR v_recipient IN
        SELECT id FROM profiles WHERE is_active = true AND role = ANY(v_target_roles)
      LOOP
        INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
        VALUES (v_recipient, 'BUDGET_SETTLEMENT_STATUS', v_title, v_message, 'budget_settlement', NEW.id, 'high', false);
        BEGIN
          PERFORM net.http_post(
            url := v_func_url,
            headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || v_anon_key),
            body := jsonb_build_object(
              'user_id', v_recipient, 'title', v_title, 'message', v_message,
              'url', v_url, 'tag', 'BUDGET_SETTLEMENT-' || NEW.id || '-' || NEW.status
            )
          );
        EXCEPTION WHEN OTHERS THEN NULL; END;
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_budget_settlement ON public.budget_settlements;
CREATE TRIGGER trg_notify_budget_settlement
  AFTER UPDATE ON public.budget_settlements
  FOR EACH ROW EXECUTE FUNCTION public.notify_budget_settlement_change();

-- =====================================================
-- Trigger thông báo cho transactions (HCNS 2 lớp duyệt)
-- =====================================================
CREATE OR REPLACE FUNCTION public.notify_transaction_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_func_url TEXT := 'https://aneazkhnqkkpqtcxunqd.supabase.co/functions/v1/send-notification';
  v_anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuZWF6a2hucWtrcHF0Y3h1bnFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjIwOTEsImV4cCI6MjA4OTk5ODA5MX0.uHPUBzQMIV69aL4KOWeaq6xwG9I5MuPv_DkQGzFsX8M';
  v_recipient uuid;
  v_title text; v_message text;
  v_target_roles text[];
  v_amount text;
BEGIN
  v_amount := to_char(COALESCE(NEW.amount,0),'FM999,999,999,999');

  IF TG_OP='INSERT' AND NEW.approval_status = 'PENDING_HR' THEN
    v_title := '💼 Chi phí HCNS mới cần duyệt';
    v_message := format('Chi phí %s VNĐ cần HR duyệt: %s', v_amount, COALESCE(NEW.description,''));
    v_target_roles := ARRAY['HR_MANAGER','ADMIN','SUPER_ADMIN'];
  ELSIF TG_OP='UPDATE' AND OLD.approval_status IS DISTINCT FROM NEW.approval_status THEN
    IF NEW.approval_status = 'PENDING_REVIEW' THEN
      v_title := '📌 Chi phí chờ Kế toán xác nhận';
      v_message := format('Chi phí %s VNĐ đã qua HR, chờ Kế toán', v_amount);
      v_target_roles := ARRAY['KETOAN','ADMIN','SUPER_ADMIN'];
    ELSIF NEW.approval_status = 'APPROVED' AND NEW.submitted_by IS NOT NULL THEN
      v_title := '✅ Chi phí đã được duyệt';
      v_message := format('Chi phí %s VNĐ đã được Kế toán duyệt', v_amount);
      INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
      VALUES (NEW.submitted_by, 'TRANSACTION_APPROVED', v_title, v_message, 'transaction', NEW.id, 'normal', false);
      RETURN NEW;
    ELSIF NEW.approval_status = 'REJECTED' AND NEW.submitted_by IS NOT NULL THEN
      v_title := '❌ Chi phí bị từ chối';
      v_message := format('Chi phí %s VNĐ bị từ chối: %s', v_amount, COALESCE(NEW.review_note,'(không ghi lý do)'));
      INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
      VALUES (NEW.submitted_by, 'TRANSACTION_REJECTED', v_title, v_message, 'transaction', NEW.id, 'high', false);
      RETURN NEW;
    END IF;
  END IF;

  IF v_target_roles IS NOT NULL THEN
    FOR v_recipient IN
      SELECT id FROM profiles WHERE is_active = true AND role = ANY(v_target_roles)
    LOOP
      INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
      VALUES (v_recipient, 'TRANSACTION_APPROVAL', v_title, v_message, 'transaction', NEW.id, 'high', false);
      BEGIN
        PERFORM net.http_post(
          url := v_func_url,
          headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || v_anon_key),
          body := jsonb_build_object(
            'user_id', v_recipient, 'title', v_title, 'message', v_message,
            'url','/tai-chinh','tag','TXN-' || NEW.id || '-' || NEW.approval_status
          )
        );
      EXCEPTION WHEN OTHERS THEN NULL; END;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

-- review_note column for transactions if not exist
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS review_note text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS hr_reviewed_by uuid;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS hr_reviewed_at timestamptz;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS accountant_reviewed_by uuid;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS accountant_reviewed_at timestamptz;

DROP TRIGGER IF EXISTS trg_notify_transaction ON public.transactions;
CREATE TRIGGER trg_notify_transaction
  AFTER INSERT OR UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.notify_transaction_approval();
