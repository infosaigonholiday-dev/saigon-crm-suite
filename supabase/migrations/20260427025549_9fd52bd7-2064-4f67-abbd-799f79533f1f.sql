-- Thêm cột cho soft cancel/delete
ALTER TABLE public.leave_requests
  ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_reason text;

-- Bảo đảm status cho phép CANCELLED (drop check cũ nếu có)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leave_requests_status_check') THEN
    ALTER TABLE public.leave_requests DROP CONSTRAINT leave_requests_status_check;
  END IF;
END $$;

ALTER TABLE public.leave_requests
  ADD CONSTRAINT leave_requests_status_check
  CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'));

-- RPC: soft delete (cancel) đơn nghỉ phép có ghi log
CREATE OR REPLACE FUNCTION public.rpc_cancel_leave_request(
  p_id uuid,
  p_reason text DEFAULT 'Bị hủy bởi quản trị viên'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_old jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_uid;

  -- Cho phép: ADMIN, SUPER_ADMIN, HCNS, HR_MANAGER, MANAGER, GDKD, DIEUHAN
  -- Hoặc chính chủ đơn
  IF NOT (
    v_role IN ('ADMIN','SUPER_ADMIN','HCNS','HR_MANAGER','MANAGER','GDKD','DIEUHAN')
    OR EXISTS (
      SELECT 1 FROM public.leave_requests lr
      JOIN public.employees e ON e.id = lr.employee_id
      WHERE lr.id = p_id AND e.profile_id = v_uid
    )
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  SELECT to_jsonb(lr.*) INTO v_old FROM public.leave_requests lr WHERE lr.id = p_id;
  IF v_old IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  UPDATE public.leave_requests
  SET status = 'CANCELLED',
      cancelled_by = v_uid,
      cancelled_at = now(),
      cancel_reason = COALESCE(p_reason, 'Bị hủy bởi quản trị viên')
  WHERE id = p_id;

  -- Audit log
  INSERT INTO public.audit_logs (action, table_name, record_id, old_data, user_id, user_role, change_summary)
  VALUES ('UPDATE', 'leave_requests', p_id, v_old, v_uid, v_role,
          'Hủy đơn nghỉ phép: ' || COALESCE(p_reason, ''));

  RETURN jsonb_build_object('ok', true);
END $$;

GRANT EXECUTE ON FUNCTION public.rpc_cancel_leave_request(uuid, text) TO authenticated;