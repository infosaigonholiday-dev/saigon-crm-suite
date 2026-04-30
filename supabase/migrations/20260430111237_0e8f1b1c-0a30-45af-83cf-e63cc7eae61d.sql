-- Re-apply tour_files / tour_tasks / tour_documents triggers (đã miss ở migration trước)

-- ===== tour_files triggers =====
CREATE OR REPLACE FUNCTION public.tour_files_set_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.tour_file_code IS NULL OR NEW.tour_file_code = '' THEN
    NEW.tour_file_code := 'TF-' || to_char(now(),'YYYY') || '-' || lpad(nextval('tour_file_seq')::text,4,'0');
  END IF;
  IF NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
  IF NEW.department_id IS NULL AND NEW.sale_owner_id IS NOT NULL THEN
    SELECT department_id INTO NEW.department_id FROM profiles WHERE id = NEW.sale_owner_id;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_tour_files_set_code ON public.tour_files;
CREATE TRIGGER trg_tour_files_set_code BEFORE INSERT ON public.tour_files
  FOR EACH ROW EXECUTE FUNCTION public.tour_files_set_code();

CREATE OR REPLACE FUNCTION public.tour_files_touch_updated()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  NEW.updated_at := now();
  IF auth.uid() IS NOT NULL THEN NEW.updated_by := auth.uid(); END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_tour_files_touch ON public.tour_files;
CREATE TRIGGER trg_tour_files_touch BEFORE UPDATE ON public.tour_files
  FOR EACH ROW EXECUTE FUNCTION public.tour_files_touch_updated();

CREATE OR REPLACE FUNCTION public.tour_files_log_stage()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    INSERT INTO tour_file_status_history (tour_file_id, from_stage, to_stage, changed_by, reason)
    VALUES (NEW.id, NULL, NEW.current_stage, COALESCE(auth.uid(), NEW.created_by), 'created');
  ELSIF TG_OP='UPDATE' AND OLD.current_stage IS DISTINCT FROM NEW.current_stage THEN
    INSERT INTO tour_file_status_history (tour_file_id, from_stage, to_stage, changed_by)
    VALUES (NEW.id, OLD.current_stage, NEW.current_stage, COALESCE(auth.uid(), NEW.updated_by));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_tour_files_log_stage ON public.tour_files;
CREATE TRIGGER trg_tour_files_log_stage AFTER INSERT OR UPDATE ON public.tour_files
  FOR EACH ROW EXECUTE FUNCTION public.tour_files_log_stage();

-- ===== tour_tasks triggers =====
CREATE OR REPLACE FUNCTION public.tour_tasks_workflow_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean := false;
  v_is_owner boolean;
  v_is_manager boolean := false;
  v_tour_manager uuid;
BEGIN
  IF current_setting('role', true) = 'service_role' THEN RETURN NEW; END IF;
  v_is_admin := has_any_role(v_uid, ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN']);
  v_is_owner := (v_uid = NEW.owner_id);
  SELECT manager_owner_id INTO v_tour_manager FROM tour_files WHERE id = NEW.tour_file_id;
  IF v_uid = v_tour_manager OR v_uid = NEW.checked_by OR has_any_role(v_uid, ARRAY['MANAGER','GDKD','HR_MANAGER']) THEN
    v_is_manager := true;
  END IF;
  IF NEW.status = 'done_pending_check' AND NEW.evidence_required = true
     AND (NEW.evidence_url IS NULL OR NEW.evidence_url = '') THEN
    RAISE EXCEPTION 'Task yêu cầu bằng chứng (evidence_url) trước khi báo xong';
  END IF;
  IF TG_OP='UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status IN ('in_progress','done_pending_check','waiting_customer','waiting_supplier','waiting_internal') THEN
      IF NOT (v_is_owner OR v_is_admin OR v_is_manager) THEN
        RAISE EXCEPTION 'Chỉ chủ việc/admin/quản lý được chuyển task sang trạng thái này';
      END IF;
    END IF;
    IF NEW.status IN ('approved_done','rejected_rework') THEN
      IF v_is_owner AND NOT v_is_admin THEN
        RAISE EXCEPTION 'Không được tự duyệt task của chính mình';
      END IF;
      IF NOT (v_is_admin OR v_is_manager) THEN
        RAISE EXCEPTION 'Chỉ Manager/Admin/người được chỉ định kiểm mới được duyệt task';
      END IF;
    END IF;
    IF NEW.status='in_progress' AND OLD.started_at IS NULL THEN NEW.started_at := now(); END IF;
    IF NEW.status='done_pending_check' THEN NEW.completed_at := now(); NEW.completed_by := v_uid; END IF;
    IF NEW.status='approved_done' THEN
      NEW.checked_at := now();
      IF NEW.checked_by IS NULL THEN NEW.checked_by := v_uid; END IF;
    END IF;
    IF NEW.status='rejected_rework' THEN NEW.rejected_at := now(); NEW.rejected_by := v_uid; END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_tour_tasks_guard ON public.tour_tasks;
CREATE TRIGGER trg_tour_tasks_guard BEFORE UPDATE ON public.tour_tasks
  FOR EACH ROW EXECUTE FUNCTION public.tour_tasks_workflow_guard();

CREATE OR REPLACE FUNCTION public.tour_tasks_set_defaults()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.assigned_by IS NULL THEN NEW.assigned_by := auth.uid(); END IF;
  IF NEW.evidence_required = true AND NEW.status = 'done_pending_check'
     AND (NEW.evidence_url IS NULL OR NEW.evidence_url='') THEN
    RAISE EXCEPTION 'Task yêu cầu bằng chứng trước khi báo xong';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_tour_tasks_defaults ON public.tour_tasks;
CREATE TRIGGER trg_tour_tasks_defaults BEFORE INSERT ON public.tour_tasks
  FOR EACH ROW EXECUTE FUNCTION public.tour_tasks_set_defaults();

CREATE OR REPLACE FUNCTION public.notify_tour_task_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_tour record;
  v_recipient uuid;
  v_title text;
  v_message text;
BEGIN
  SELECT tf.tour_file_code, tf.tour_name, tf.manager_owner_id, tf.sale_owner_id
    INTO v_tour FROM tour_files tf WHERE tf.id = NEW.tour_file_id;
  IF TG_OP='INSERT' THEN
    v_title := format('📋 Bạn có việc mới: %s', NEW.title);
    v_message := format('Tour %s — Hạn: %s — Ưu tiên: %s',
      COALESCE(v_tour.tour_file_code,''),
      COALESCE(to_char(NEW.due_at,'DD/MM/YYYY HH24:MI'),'không hạn'), NEW.priority);
    INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read,
      action_required, action_due_at, related_entity_type, related_entity_id)
    VALUES (NEW.owner_id, 'TOUR_TASK_ASSIGNED', v_title, v_message, 'tour_task', NEW.id,
      CASE WHEN NEW.priority IN ('high','critical') THEN 'high' ELSE 'normal' END, false,
      true, NEW.due_at, 'tour_task', NEW.id);
    RETURN NEW;
  END IF;
  IF TG_OP='UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status='done_pending_check' THEN
      v_recipient := COALESCE(NEW.checked_by, v_tour.manager_owner_id);
      IF v_recipient IS NOT NULL THEN
        INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read,
          action_required, related_entity_type, related_entity_id)
        VALUES (v_recipient, 'TOUR_TASK_PENDING_CHECK',
          format('🔍 Cần kiểm: %s', NEW.title),
          format('Tour %s — Đã báo xong, chờ kiểm', COALESCE(v_tour.tour_file_code,'')),
          'tour_task', NEW.id, 'high', false, true, 'tour_task', NEW.id);
      END IF;
    ELSIF NEW.status='rejected_rework' THEN
      INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read,
        action_required, related_entity_type, related_entity_id)
      VALUES (NEW.owner_id, 'TOUR_TASK_REJECTED',
        format('❌ Task bị trả lại: %s', NEW.title),
        format('Lý do: %s', COALESCE(NEW.reject_reason,'(không ghi)')),
        'tour_task', NEW.id, 'high', false, true, 'tour_task', NEW.id);
    ELSIF NEW.status='overdue' THEN
      INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read,
        action_required, related_entity_type, related_entity_id)
      VALUES (NEW.owner_id, 'TOUR_TASK_OVERDUE',
        format('⏰ Task quá hạn: %s', NEW.title),
        format('Tour %s — Hạn: %s', COALESCE(v_tour.tour_file_code,''),
          COALESCE(to_char(NEW.due_at,'DD/MM/YYYY HH24:MI'),'')),
        'tour_task', NEW.id, 'high', false, true, 'tour_task', NEW.id);
    END IF;
  END IF;
  IF TG_OP='UPDATE' AND OLD.owner_id IS DISTINCT FROM NEW.owner_id THEN
    INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read,
      action_required, action_due_at, related_entity_type, related_entity_id)
    VALUES (NEW.owner_id, 'TOUR_TASK_ASSIGNED',
      format('📋 Bạn được giao task: %s', NEW.title),
      format('Tour %s', COALESCE(v_tour.tour_file_code,'')),
      'tour_task', NEW.id, 'normal', false, true, NEW.due_at, 'tour_task', NEW.id);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_tour_task ON public.tour_tasks;
CREATE TRIGGER trg_notify_tour_task AFTER INSERT OR UPDATE ON public.tour_tasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_tour_task_change();

-- ===== tour_documents triggers =====
CREATE OR REPLACE FUNCTION public.tour_documents_version_mgmt()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_max int;
BEGIN
  SELECT COALESCE(MAX(version_no),0) INTO v_max
    FROM tour_documents
    WHERE tour_file_id = NEW.tour_file_id AND document_type = NEW.document_type;
  NEW.version_no := v_max + 1;
  NEW.is_current_version := true;
  IF NEW.uploaded_by IS NULL THEN NEW.uploaded_by := auth.uid(); END IF;
  UPDATE tour_documents
    SET is_current_version = false, status = 'superseded'
    WHERE tour_file_id = NEW.tour_file_id
      AND document_type = NEW.document_type
      AND is_current_version = true;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_tour_docs_version ON public.tour_documents;
CREATE TRIGGER trg_tour_docs_version BEFORE INSERT ON public.tour_documents
  FOR EACH ROW EXECUTE FUNCTION public.tour_documents_version_mgmt();

CREATE OR REPLACE FUNCTION public.tour_documents_prevent_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF current_setting('role', true) = 'service_role' THEN RETURN OLD; END IF;
  IF OLD.document_type IN ('contract_signed','settlement','invoice','payment_proof')
     AND OLD.linked_entity_id IS NOT NULL THEN
    RAISE EXCEPTION 'Không được xoá tài liệu đã được dùng (loại %)', OLD.document_type;
  END IF;
  RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS trg_tour_docs_prevent_delete ON public.tour_documents;
CREATE TRIGGER trg_tour_docs_prevent_delete BEFORE DELETE ON public.tour_documents
  FOR EACH ROW EXECUTE FUNCTION public.tour_documents_prevent_delete();