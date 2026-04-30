-- ========== 1. Mở rộng bookings ==========
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS booking_type text NOT NULL DEFAULT 'retail';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='bookings_booking_type_check') THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_booking_type_check
      CHECK (booking_type IN ('retail','group_tour','mice','school_group','company_trip'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bookings_booking_type ON public.bookings(booking_type);

-- ========== 2. Sequence + bảng tour_files ==========
CREATE SEQUENCE IF NOT EXISTS public.tour_file_seq START 1;

CREATE TABLE IF NOT EXISTS public.tour_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  tour_file_code text UNIQUE NOT NULL,
  booking_type text NOT NULL CHECK (booking_type IN ('group_tour','mice','school_group','company_trip')),
  tour_name text,
  route text,
  destination text,
  departure_date date,
  return_date date,
  duration_days int,
  duration_nights int,
  group_size_estimated int,
  group_size_confirmed int,
  sale_owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  operation_owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  accountant_owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  manager_owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  current_stage text NOT NULL DEFAULT 'inquiry' CHECK (current_stage IN (
    'inquiry','requirement_collected','program_drafting','proposal_sent','negotiation',
    'confirmed_pending_contract','contract_drafting','contract_signed','deposit_pending',
    'operating','pre_tour_check','on_tour','post_tour_settlement','settlement_submitted',
    'settlement_closed','archived','cancelled'
  )),
  risk_level text NOT NULL DEFAULT 'normal' CHECK (risk_level IN ('low','normal','high','critical')),
  next_action_due_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed','cancelled')),
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tour_files_booking ON public.tour_files(booking_id);
CREATE INDEX IF NOT EXISTS idx_tour_files_lead ON public.tour_files(lead_id);
CREATE INDEX IF NOT EXISTS idx_tour_files_customer ON public.tour_files(customer_id);
CREATE INDEX IF NOT EXISTS idx_tour_files_stage ON public.tour_files(current_stage);
CREATE INDEX IF NOT EXISTS idx_tour_files_departure ON public.tour_files(departure_date);
CREATE INDEX IF NOT EXISTS idx_tour_files_sale_owner ON public.tour_files(sale_owner_id);
CREATE INDEX IF NOT EXISTS idx_tour_files_op_owner ON public.tour_files(operation_owner_id);
CREATE INDEX IF NOT EXISTS idx_tour_files_dept ON public.tour_files(department_id);

-- ========== 3. Bảng tour_tasks ==========
CREATE TABLE IF NOT EXISTS public.tour_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_file_id uuid NOT NULL REFERENCES public.tour_files(id) ON DELETE CASCADE,
  task_code text,
  department text,
  title text NOT NULL,
  description text,
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  assigned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_at timestamptz,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  status text NOT NULL DEFAULT 'todo' CHECK (status IN (
    'todo','in_progress','waiting_customer','waiting_supplier','waiting_internal',
    'done_pending_check','approved_done','rejected_rework','overdue','cancelled'
  )),
  related_entity_type text,
  related_entity_id uuid,
  evidence_required boolean NOT NULL DEFAULT false,
  evidence_type text,
  evidence_url text,
  read_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  completed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  checked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  checked_at timestamptz,
  rejected_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  rejected_at timestamptz,
  reject_reason text,
  escalated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tour_tasks_file_status ON public.tour_tasks(tour_file_id, status);
CREATE INDEX IF NOT EXISTS idx_tour_tasks_owner_status ON public.tour_tasks(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_tour_tasks_due_active ON public.tour_tasks(due_at)
  WHERE status NOT IN ('approved_done','cancelled');

-- ========== 4. Bảng tour_documents ==========
CREATE TABLE IF NOT EXISTS public.tour_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_file_id uuid NOT NULL REFERENCES public.tour_files(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN (
    'program','service_proposal','menu','contract_draft','contract_signed','guest_list',
    'rooming_list','vehicle_list','budget','settlement','invoice','receipt','payment_proof',
    'supplier_confirmation','operation_checklist','other'
  )),
  document_name text,
  version_no int NOT NULL DEFAULT 1,
  file_url text NOT NULL,
  file_mime_type text,
  source text,
  status text NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded','approved','rejected','superseded')),
  linked_entity_type text,
  linked_entity_id uuid,
  is_current_version boolean NOT NULL DEFAULT true,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_tour_documents_file_type ON public.tour_documents(tour_file_id, document_type);
CREATE INDEX IF NOT EXISTS idx_tour_documents_current ON public.tour_documents(tour_file_id, document_type)
  WHERE is_current_version = true;

-- ========== 5. Bảng tour_file_status_history ==========
CREATE TABLE IF NOT EXISTS public.tour_file_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_file_id uuid NOT NULL REFERENCES public.tour_files(id) ON DELETE CASCADE,
  from_stage text,
  to_stage text NOT NULL,
  changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  reason text
);

CREATE INDEX IF NOT EXISTS idx_tfsh_file ON public.tour_file_status_history(tour_file_id, changed_at DESC);

-- ========== 6. Triggers cho tour_files ==========
CREATE OR REPLACE FUNCTION public.tour_files_set_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.tour_file_code IS NULL OR NEW.tour_file_code = '' THEN
    NEW.tour_file_code := 'TF-' || to_char(now(),'YYYY') || '-' || lpad(nextval('tour_file_seq')::text,4,'0');
  END IF;
  IF NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
  -- auto fill department_id from sale_owner
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

-- ========== 7. Triggers cho tour_tasks ==========
CREATE OR REPLACE FUNCTION public.tour_tasks_workflow_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean := false;
  v_is_owner boolean;
  v_is_manager boolean := false;
  v_tour_manager uuid;
BEGIN
  -- service_role bypass
  IF current_setting('role', true) = 'service_role' THEN RETURN NEW; END IF;

  v_is_admin := has_any_role(v_uid, ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN']);
  v_is_owner := (v_uid = NEW.owner_id);
  SELECT manager_owner_id INTO v_tour_manager FROM tour_files WHERE id = NEW.tour_file_id;
  IF v_uid = v_tour_manager OR v_uid = NEW.checked_by OR has_any_role(v_uid, ARRAY['MANAGER','GDKD','HR_MANAGER']) THEN
    v_is_manager := true;
  END IF;

  -- Evidence required check
  IF NEW.status = 'done_pending_check' AND NEW.evidence_required = true
     AND (NEW.evidence_url IS NULL OR NEW.evidence_url = '') THEN
    RAISE EXCEPTION 'Task yêu cầu bằng chứng (evidence_url) trước khi báo xong';
  END IF;

  IF TG_OP='UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    -- Owner-only transitions
    IF NEW.status IN ('in_progress','done_pending_check','waiting_customer','waiting_supplier','waiting_internal') THEN
      IF NOT (v_is_owner OR v_is_admin OR v_is_manager) THEN
        RAISE EXCEPTION 'Chỉ chủ việc/admin/quản lý được chuyển task sang trạng thái này';
      END IF;
    END IF;

    -- Approval: chống tự duyệt
    IF NEW.status IN ('approved_done','rejected_rework') THEN
      IF v_is_owner AND NOT v_is_admin THEN
        RAISE EXCEPTION 'Không được tự duyệt task của chính mình';
      END IF;
      IF NOT (v_is_admin OR v_is_manager) THEN
        RAISE EXCEPTION 'Chỉ Manager/Admin/người được chỉ định kiểm mới được duyệt task';
      END IF;
    END IF;

    -- Auto-stamp
    IF NEW.status='in_progress' AND OLD.started_at IS NULL THEN NEW.started_at := now(); END IF;
    IF NEW.status='done_pending_check' THEN
      NEW.completed_at := now(); NEW.completed_by := v_uid;
    END IF;
    IF NEW.status='approved_done' THEN
      NEW.checked_at := now();
      IF NEW.checked_by IS NULL THEN NEW.checked_by := v_uid; END IF;
    END IF;
    IF NEW.status='rejected_rework' THEN
      NEW.rejected_at := now(); NEW.rejected_by := v_uid;
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_tour_tasks_guard ON public.tour_tasks;
CREATE TRIGGER trg_tour_tasks_guard BEFORE UPDATE ON public.tour_tasks
  FOR EACH ROW EXECUTE FUNCTION public.tour_tasks_workflow_guard();

-- INSERT defaults
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

-- Notification trigger
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
      COALESCE(to_char(NEW.due_at,'DD/MM/YYYY HH24:MI'),'không hạn'),
      NEW.priority);
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

  -- Notify on owner change
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

-- ========== 8. Triggers cho tour_documents ==========
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

  -- mark older versions as not current
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

-- ========== 9. Helper RLS function ==========
CREATE OR REPLACE FUNCTION public.can_access_tour_file(_tour_file_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_dept uuid;
  v_tf record;
BEGIN
  IF v_uid IS NULL THEN RETURN false; END IF;
  SELECT role, department_id INTO v_role, v_dept FROM profiles WHERE id = v_uid AND is_active = true;
  IF v_role IS NULL THEN RETURN false; END IF;
  IF v_role IN ('ADMIN','SUPER_ADMIN','DIEUHAN','KETOAN') THEN RETURN true; END IF;
  SELECT * INTO v_tf FROM tour_files WHERE id = _tour_file_id;
  IF v_tf IS NULL THEN RETURN false; END IF;
  IF v_uid IN (v_tf.sale_owner_id, v_tf.operation_owner_id, v_tf.accountant_owner_id, v_tf.manager_owner_id, v_tf.created_by) THEN
    RETURN true;
  END IF;
  IF v_role IN ('MANAGER','GDKD') AND v_dept IS NOT NULL AND v_dept = v_tf.department_id THEN RETURN true; END IF;
  RETURN false;
END $$;

CREATE OR REPLACE FUNCTION public.can_create_tour_file()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN','MANAGER','GDKD',
    'SALE_DOMESTIC','SALE_INBOUND','SALE_OUTBOUND','SALE_MICE','HR_MANAGER']);
$$;

-- ========== 10. RLS Policies ==========
ALTER TABLE public.tour_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_file_status_history ENABLE ROW LEVEL SECURITY;

-- tour_files
DROP POLICY IF EXISTS tour_files_admin_all ON public.tour_files;
CREATE POLICY tour_files_admin_all ON public.tour_files TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']));

DROP POLICY IF EXISTS tour_files_select ON public.tour_files;
CREATE POLICY tour_files_select ON public.tour_files FOR SELECT TO authenticated
  USING (can_access_tour_file(id));

DROP POLICY IF EXISTS tour_files_insert ON public.tour_files;
CREATE POLICY tour_files_insert ON public.tour_files FOR INSERT TO authenticated
  WITH CHECK (can_create_tour_file());

DROP POLICY IF EXISTS tour_files_update ON public.tour_files;
CREATE POLICY tour_files_update ON public.tour_files FOR UPDATE TO authenticated
  USING (can_access_tour_file(id))
  WITH CHECK (can_access_tour_file(id));

DROP POLICY IF EXISTS tour_files_delete ON public.tour_files;
CREATE POLICY tour_files_delete ON public.tour_files FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']));

-- tour_tasks
DROP POLICY IF EXISTS tour_tasks_admin_all ON public.tour_tasks;
CREATE POLICY tour_tasks_admin_all ON public.tour_tasks TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']));

DROP POLICY IF EXISTS tour_tasks_select ON public.tour_tasks;
CREATE POLICY tour_tasks_select ON public.tour_tasks FOR SELECT TO authenticated
  USING (can_access_tour_file(tour_file_id) OR owner_id = auth.uid());

DROP POLICY IF EXISTS tour_tasks_insert ON public.tour_tasks;
CREATE POLICY tour_tasks_insert ON public.tour_tasks FOR INSERT TO authenticated
  WITH CHECK (can_access_tour_file(tour_file_id));

DROP POLICY IF EXISTS tour_tasks_update ON public.tour_tasks;
CREATE POLICY tour_tasks_update ON public.tour_tasks FOR UPDATE TO authenticated
  USING (can_access_tour_file(tour_file_id) OR owner_id = auth.uid())
  WITH CHECK (can_access_tour_file(tour_file_id) OR owner_id = auth.uid());

DROP POLICY IF EXISTS tour_tasks_delete ON public.tour_tasks;
CREATE POLICY tour_tasks_delete ON public.tour_tasks FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIEUHAN','MANAGER','GDKD']));

-- tour_documents
DROP POLICY IF EXISTS tour_documents_admin_all ON public.tour_documents;
CREATE POLICY tour_documents_admin_all ON public.tour_documents TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']));

DROP POLICY IF EXISTS tour_documents_select ON public.tour_documents;
CREATE POLICY tour_documents_select ON public.tour_documents FOR SELECT TO authenticated
  USING (can_access_tour_file(tour_file_id));

DROP POLICY IF EXISTS tour_documents_insert ON public.tour_documents;
CREATE POLICY tour_documents_insert ON public.tour_documents FOR INSERT TO authenticated
  WITH CHECK (can_access_tour_file(tour_file_id));

DROP POLICY IF EXISTS tour_documents_update ON public.tour_documents;
CREATE POLICY tour_documents_update ON public.tour_documents FOR UPDATE TO authenticated
  USING (can_access_tour_file(tour_file_id))
  WITH CHECK (can_access_tour_file(tour_file_id));

DROP POLICY IF EXISTS tour_documents_delete ON public.tour_documents;
CREATE POLICY tour_documents_delete ON public.tour_documents FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']));

-- tour_file_status_history
DROP POLICY IF EXISTS tfsh_select ON public.tour_file_status_history;
CREATE POLICY tfsh_select ON public.tour_file_status_history FOR SELECT TO authenticated
  USING (can_access_tour_file(tour_file_id));

-- ========== 11. RPC: stage transition ==========
CREATE OR REPLACE FUNCTION public.rpc_tour_task_transition(
  _task_id uuid, _new_status text, _evidence_url text DEFAULT NULL, _reject_reason text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_task tour_tasks;
BEGIN
  SELECT * INTO v_task FROM tour_tasks WHERE id = _task_id;
  IF v_task IS NULL THEN RAISE EXCEPTION 'Task không tồn tại'; END IF;

  UPDATE tour_tasks SET
    status = _new_status,
    evidence_url = COALESCE(_evidence_url, evidence_url),
    reject_reason = COALESCE(_reject_reason, reject_reason)
  WHERE id = _task_id;

  RETURN jsonb_build_object('ok', true, 'task_id', _task_id, 'new_status', _new_status);
END $$;

GRANT EXECUTE ON FUNCTION public.rpc_tour_task_transition(uuid, text, text, text) TO authenticated;

-- ========== 12. Cron mark overdue ==========
CREATE OR REPLACE FUNCTION public.mark_tour_tasks_overdue()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_count1 int := 0;
  v_count2 int := 0;
  v_task record;
  v_tour record;
BEGIN
  -- Mark overdue
  UPDATE tour_tasks SET status = 'overdue'
   WHERE due_at IS NOT NULL AND due_at < now()
     AND status IN ('todo','in_progress','waiting_customer','waiting_supplier','waiting_internal');
  GET DIAGNOSTICS v_count1 = ROW_COUNT;

  -- Escalate >24h
  FOR v_task IN
    SELECT t.*, tf.tour_file_code, tf.manager_owner_id
      FROM tour_tasks t
      JOIN tour_files tf ON tf.id = t.tour_file_id
     WHERE t.status='overdue' AND t.escalated_at IS NULL
       AND t.due_at < now() - interval '24 hours'
       AND tf.manager_owner_id IS NOT NULL
  LOOP
    INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read,
      action_required, related_entity_type, related_entity_id)
    VALUES (v_task.manager_owner_id, 'TOUR_TASK_OVERDUE_ESCALATION',
      format('🚨 Task quá hạn >24h: %s', v_task.title),
      format('Tour %s — Chủ việc cần hỗ trợ', v_task.tour_file_code),
      'tour_task', v_task.id, 'high', false, true, 'tour_task', v_task.id);
    UPDATE tour_tasks SET escalated_at = now() WHERE id = v_task.id;
    v_count2 := v_count2 + 1;
  END LOOP;

  RETURN jsonb_build_object('marked_overdue', v_count1, 'escalated', v_count2);
END $$;

-- ========== 13. RPC dashboard ==========
CREATE OR REPLACE FUNCTION public.rpc_tour_dashboard_stats()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_overdue jsonb;
  v_pending int;
  v_upcoming int;
  v_missing_docs int;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = v_uid;

  -- Task quá hạn theo phòng ban (chỉ tour user thấy được)
  SELECT COALESCE(jsonb_agg(jsonb_build_object('department', dept, 'count', cnt)), '[]'::jsonb) INTO v_overdue
  FROM (
    SELECT COALESCE(t.department, 'Khác') AS dept, count(*)::int AS cnt
      FROM tour_tasks t
      JOIN tour_files tf ON tf.id = t.tour_file_id
     WHERE t.status='overdue' AND can_access_tour_file(tf.id)
     GROUP BY 1 ORDER BY 2 DESC LIMIT 20
  ) s;

  SELECT count(*)::int INTO v_pending
    FROM tour_tasks t JOIN tour_files tf ON tf.id = t.tour_file_id
   WHERE t.status='done_pending_check' AND can_access_tour_file(tf.id);

  SELECT count(DISTINCT tf.id)::int INTO v_upcoming
    FROM tour_files tf
   WHERE tf.departure_date BETWEEN current_date AND current_date + 7
     AND can_access_tour_file(tf.id)
     AND EXISTS (SELECT 1 FROM tour_tasks tt WHERE tt.tour_file_id=tf.id AND tt.status NOT IN ('approved_done','cancelled'));

  SELECT count(*)::int INTO v_missing_docs
    FROM tour_files tf
   WHERE can_access_tour_file(tf.id)
     AND tf.departure_date BETWEEN current_date AND current_date + 14
     AND NOT EXISTS (SELECT 1 FROM tour_documents d WHERE d.tour_file_id=tf.id AND d.document_type='guest_list' AND d.is_current_version);

  RETURN jsonb_build_object(
    'overdue_by_dept', v_overdue,
    'pending_check', v_pending,
    'upcoming_with_open_tasks', v_upcoming,
    'tours_missing_guest_list', v_missing_docs
  );
END $$;

GRANT EXECUTE ON FUNCTION public.rpc_tour_dashboard_stats() TO authenticated;

-- ========== 14. Storage bucket ==========
INSERT INTO storage.buckets (id, name, public)
  VALUES ('tour-files', 'tour-files', false)
  ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS tour_files_storage_select ON storage.objects;
CREATE POLICY tour_files_storage_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='tour-files' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS tour_files_storage_insert ON storage.objects;
CREATE POLICY tour_files_storage_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='tour-files' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS tour_files_storage_update ON storage.objects;
CREATE POLICY tour_files_storage_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id='tour-files' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS tour_files_storage_delete ON storage.objects;
CREATE POLICY tour_files_storage_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id='tour-files' AND has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']));

-- ========== 15. Schedule cron mỗi 30 phút ==========
SELECT cron.schedule(
  'mark-tour-tasks-overdue',
  '*/30 * * * *',
  $$ SELECT public.mark_tour_tasks_overdue(); $$
) WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname='mark-tour-tasks-overdue');

-- ========== 16. Audit log ==========
DROP TRIGGER IF EXISTS trg_audit_tour_files ON public.tour_files;
CREATE TRIGGER trg_audit_tour_files AFTER INSERT OR UPDATE OR DELETE ON public.tour_files
  FOR EACH ROW EXECUTE FUNCTION public.log_finance_changes();

DROP TRIGGER IF EXISTS trg_audit_tour_tasks ON public.tour_tasks;
CREATE TRIGGER trg_audit_tour_tasks AFTER INSERT OR UPDATE OR DELETE ON public.tour_tasks
  FOR EACH ROW EXECUTE FUNCTION public.log_finance_changes();