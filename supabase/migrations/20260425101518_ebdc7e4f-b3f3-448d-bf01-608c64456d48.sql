-- ===== 1. Cập nhật trigger notify_leave_request_change =====
CREATE OR REPLACE FUNCTION public.notify_leave_request_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee RECORD;
  v_func_url TEXT := 'https://aneazkhnqkkpqtcxunqd.supabase.co/functions/v1/send-notification';
  v_anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuZWF6a2hucWtrcHF0Y3h1bnFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjIwOTEsImV4cCI6MjA4OTk5ODA5MX0.uHPUBzQMIV69aL4KOWeaq6xwG9I5MuPv_DkQGzFsX8M';
  v_title TEXT;
  v_message TEXT;
  v_recipient UUID;
  v_is_manager_level BOOLEAN;
  v_is_admin_level BOOLEAN;
  v_other_admin_count INT;
BEGIN
  SELECT e.full_name, e.department_id, e.profile_id, e.position, p.role
    INTO v_employee
  FROM employees e
  LEFT JOIN profiles p ON p.id = e.profile_id
  WHERE e.id = COALESCE(NEW.employee_id, OLD.employee_id);

  IF v_employee IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_is_admin_level := COALESCE(v_employee.role, '') IN ('ADMIN','SUPER_ADMIN');
  v_is_manager_level := v_is_admin_level OR COALESCE(v_employee.role, '') IN (
    'HR_MANAGER','HCNS','MANAGER','GDKD','DIEUHAN'
  ) OR COALESCE(v_employee.position, '') IN (
    'GIAM_DOC','PHO_GIAM_DOC','TRUONG_PHONG','PHO_PHONG'
  );

  -- ===== INSERT: Notify recipients =====
  IF TG_OP = 'INSERT' THEN
    v_title := CASE WHEN v_is_manager_level
      THEN '📋 Đơn nghỉ phép cấp quản lý'
      ELSE '📋 Đơn xin nghỉ phép mới'
    END;
    v_message := format('%s xin nghỉ %s ngày (%s → %s) - Lý do: %s',
      v_employee.full_name,
      NEW.total_days,
      to_char(NEW.start_date, 'DD/MM/YYYY'),
      to_char(NEW.end_date, 'DD/MM/YYYY'),
      COALESCE(NEW.reason, 'Không ghi chú')
    );

    -- Đếm ADMIN khác (fallback logic cho ADMIN xin nghỉ)
    IF v_is_admin_level THEN
      SELECT COUNT(*) INTO v_other_admin_count
      FROM profiles
      WHERE is_active = true
        AND role IN ('ADMIN','SUPER_ADMIN')
        AND id != COALESCE(v_employee.profile_id, '00000000-0000-0000-0000-000000000000'::uuid);
    END IF;

    FOR v_recipient IN
      SELECT id FROM profiles
      WHERE is_active = true
        AND id != COALESCE(v_employee.profile_id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND (
          CASE
            -- ADMIN xin nghỉ: gửi cho ADMIN khác; nếu không có ADMIN khác → fallback HR_MANAGER
            WHEN v_is_admin_level THEN
              role IN ('ADMIN','SUPER_ADMIN')
              OR (v_other_admin_count = 0 AND role = 'HR_MANAGER')
            -- Cấp quản lý khác xin nghỉ: chỉ ADMIN + HR_MANAGER
            WHEN v_is_manager_level THEN
              role IN ('ADMIN','SUPER_ADMIN','HR_MANAGER')
            -- Nhân viên thường: HR + HCNS + Manager/GDKD cùng phòng
            ELSE
              role IN ('HR_MANAGER','HCNS')
              OR (role IN ('MANAGER','GDKD') AND department_id = v_employee.department_id)
          END
        )
    LOOP
      INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
      VALUES (v_recipient, 'LEAVE_REQUEST_NEW', v_title, v_message, 'leave_request', NEW.id, 'high', false);

      BEGIN
        PERFORM net.http_post(
          url := v_func_url,
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_anon_key
          ),
          body := jsonb_build_object(
            'user_id', v_recipient,
            'title', v_title,
            'message', v_message,
            'url', '/quan-ly-nghi-phep',
            'tag', 'LEAVE_REQUEST_NEW-' || NEW.id
          )
        );
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END LOOP;

  -- ===== UPDATE status: Notify employee =====
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status
        AND NEW.status IN ('APPROVED', 'REJECTED')
        AND v_employee.profile_id IS NOT NULL THEN

    IF NEW.status = 'APPROVED' THEN
      v_title := '✅ Đơn nghỉ phép được duyệt';
      v_message := format('Đơn nghỉ %s → %s đã được duyệt.',
        to_char(NEW.start_date, 'DD/MM/YYYY'),
        to_char(NEW.end_date, 'DD/MM/YYYY'));
    ELSE
      v_title := '❌ Đơn nghỉ phép bị từ chối';
      v_message := format('Đơn nghỉ %s → %s đã bị từ chối.',
        to_char(NEW.start_date, 'DD/MM/YYYY'),
        to_char(NEW.end_date, 'DD/MM/YYYY'));
    END IF;

    INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority, is_read)
    VALUES (v_employee.profile_id, 'LEAVE_REQUEST_RESULT', v_title, v_message, 'leave_request', NEW.id, 'high', false);

    BEGIN
      PERFORM net.http_post(
        url := v_func_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_anon_key
        ),
        body := jsonb_build_object(
          'user_id', v_employee.profile_id,
          'title', v_title,
          'message', v_message,
          'url', '/quan-ly-nghi-phep',
          'tag', 'LEAVE_REQUEST_RESULT-' || NEW.id
        )
      );
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ===== 2. RLS policies leave_requests =====
DROP POLICY IF EXISTS "leave_requests_update" ON public.leave_requests;
DROP POLICY IF EXISTS "leave_requests_self_edit_pending" ON public.leave_requests;
DROP POLICY IF EXISTS "leave_requests_insert" ON public.leave_requests;
DROP POLICY IF EXISTS "leave_requests_insert_self" ON public.leave_requests;

-- 2.1. INSERT: user tự tạo đơn cho mình HOẶC HR/Admin tạo cho người khác
CREATE POLICY "leave_requests_insert_self"
ON public.leave_requests FOR INSERT TO authenticated
WITH CHECK (
  employee_id = public.get_my_employee_id()
  OR public.has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_MANAGER','HCNS'])
);

-- 2.2. UPDATE self: user sửa đơn mình khi PENDING (cho phép hủy = đổi sang CANCELLED)
CREATE POLICY "leave_requests_self_edit_pending"
ON public.leave_requests FOR UPDATE TO authenticated
USING (
  employee_id = public.get_my_employee_id()
  AND status = 'PENDING'
)
WITH CHECK (
  employee_id = public.get_my_employee_id()
  AND status IN ('PENDING','CANCELLED')
);

-- 2.3. DELETE self: user xóa đơn mình khi PENDING
DROP POLICY IF EXISTS "leave_requests_delete_self" ON public.leave_requests;
CREATE POLICY "leave_requests_delete_self"
ON public.leave_requests FOR DELETE TO authenticated
USING (
  (employee_id = public.get_my_employee_id() AND status = 'PENDING')
  OR public.has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN'])
);

-- ===== 3. Cập nhật get_default_permissions_for_role: thêm leave.create cho các role thiếu =====
CREATE OR REPLACE FUNCTION public.get_default_permissions_for_role(p_role text)
 RETURNS text[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  perms text[];
BEGIN
  CASE p_role
    WHEN 'ADMIN', 'SUPER_ADMIN' THEN
      perms := ARRAY[
        'dashboard.view',
        'customers.view','customers.create','customers.edit','customers.delete','customers.export',
        'leads.view','leads.create','leads.edit','leads.delete',
        'quotations.view','quotations.create','quotations.edit','quotations.delete',
        'bookings.view','bookings.create','bookings.edit','bookings.delete','bookings.approve',
        'payments.view','payments.create','payments.edit','payments.delete',
        'contracts.view','contracts.create','contracts.edit','contracts.delete','contracts.approve',
        'staff.view','staff.create','staff.edit','staff.delete',
        'leave.view','leave.create','leave.approve',
        'payroll.view','payroll.create','payroll.edit',
        'finance.view','finance.create','finance.edit','finance.approve','finance.submit',
        'settings.view','settings.edit',
        'tour_packages.view','tour_packages.create','tour_packages.edit','tour_packages.delete',
        'itineraries.view','itineraries.create','itineraries.edit','itineraries.delete',
        'accommodations.view','accommodations.create','accommodations.edit','accommodations.delete',
        'suppliers.view','suppliers.create','suppliers.edit','suppliers.delete',
        'workflow.view','workflow.create',
        'raw_contacts.view','raw_contacts.create','raw_contacts.edit','raw_contacts.delete',
        'b2b_tours.view','b2b_tours.logs'
      ];
    WHEN 'GDKD' THEN
      perms := ARRAY[
        'dashboard.view',
        'customers.view','customers.create','customers.edit',
        'leads.view','leads.create','leads.edit',
        'quotations.view','quotations.create','quotations.edit',
        'bookings.view','bookings.create','bookings.edit','bookings.approve',
        'payments.view',
        'contracts.view','contracts.create','contracts.edit','contracts.approve',
        'staff.view','staff.create','staff.edit',
        'leave.view','leave.create','leave.approve',
        'payroll.view',
        'tour_packages.view','tour_packages.create','tour_packages.edit',
        'itineraries.view','itineraries.create','itineraries.edit',
        'accommodations.view','accommodations.create','accommodations.edit',
        'finance.view','finance.submit',
        'workflow.view','workflow.create',
        'settings.view',
        'raw_contacts.view','raw_contacts.create','raw_contacts.edit',
        'b2b_tours.view','b2b_tours.logs'
      ];
    WHEN 'MANAGER' THEN
      perms := ARRAY[
        'dashboard.view',
        'customers.view','customers.create','customers.edit',
        'leads.view','leads.create','leads.edit',
        'quotations.view','quotations.create','quotations.edit',
        'bookings.view','bookings.create','bookings.edit',
        'payments.view',
        'contracts.view','contracts.create','contracts.edit','contracts.approve',
        'staff.view',
        'leave.view','leave.create','leave.approve',
        'payroll.view',
        'tour_packages.view','tour_packages.create','tour_packages.edit',
        'itineraries.view','itineraries.create','itineraries.edit',
        'accommodations.view','accommodations.create','accommodations.edit',
        'finance.view','finance.submit',
        'workflow.view','workflow.create',
        'settings.view',
        'raw_contacts.view','raw_contacts.create','raw_contacts.edit',
        'b2b_tours.view','b2b_tours.logs'
      ];
    WHEN 'DIEUHAN' THEN
      perms := ARRAY[
        'dashboard.view',
        'customers.view','customers.create',
        'leads.view','leads.create',
        'quotations.view','quotations.create','quotations.edit',
        'bookings.view','bookings.create','bookings.edit','bookings.approve',
        'payments.view',
        'contracts.view','contracts.create','contracts.edit','contracts.approve',
        'staff.view',
        'leave.view','leave.create','leave.approve',
        'payroll.view',
        'tour_packages.view','tour_packages.create','tour_packages.edit',
        'itineraries.view','itineraries.create','itineraries.edit',
        'accommodations.view','accommodations.create','accommodations.edit',
        'suppliers.view',
        'finance.view','finance.create','finance.submit',
        'workflow.view','workflow.create',
        'settings.view'
      ];
    WHEN 'HR_MANAGER' THEN
      perms := ARRAY[
        'dashboard.view',
        'staff.view','staff.create','staff.edit',
        'leave.view','leave.create','leave.approve',
        'payroll.view','payroll.create','payroll.edit',
        'finance.view','finance.create','finance.submit','finance.approve',
        'suppliers.view',
        'payments.view',
        'contracts.view','contracts.create','contracts.edit',
        'tour_packages.view',
        'workflow.view','workflow.create',
        'settings.view'
      ];
    WHEN 'KETOAN' THEN
      perms := ARRAY[
        'dashboard.view',
        'customers.view',
        'bookings.view',
        'quotations.view',
        'itineraries.view',
        'contracts.view',
        'payments.view','payments.create','payments.edit',
        'payroll.view','payroll.create','payroll.edit',
        'finance.view','finance.create','finance.edit','finance.submit','finance.approve',
        'suppliers.view','suppliers.create',
        'staff.view',
        'leave.view','leave.create',
        'workflow.view','workflow.create',
        'settings.view'
      ];
    WHEN 'MKT' THEN
      perms := ARRAY[
        'dashboard.view',
        'leads.view','leads.create','leads.edit',
        'staff.view',
        'leave.view','leave.create',
        'payroll.view',
        'workflow.view'
      ];
    WHEN 'HCNS' THEN
      perms := ARRAY[
        'dashboard.view',
        'staff.view','staff.create','staff.edit',
        'leave.view','leave.create','leave.approve',
        'payroll.view','payroll.create','payroll.edit',
        'finance.create','finance.submit',
        'suppliers.view',
        'payments.view',
        'contracts.view','contracts.create','contracts.edit',
        'workflow.view','workflow.create',
        'settings.view'
      ];
    WHEN 'SALE_DOMESTIC','SALE_INBOUND','SALE_OUTBOUND','SALE_MICE' THEN
      perms := ARRAY[
        'dashboard.view',
        'customers.view','customers.create','customers.edit',
        'leads.view','leads.create','leads.edit',
        'quotations.view','quotations.create','quotations.edit',
        'bookings.view','bookings.create',
        'payments.view',
        'contracts.view',
        'staff.view',
        'leave.view','leave.create',
        'payroll.view',
        'tour_packages.view',
        'itineraries.view',
        'accommodations.view',
        'workflow.view',
        'raw_contacts.view','raw_contacts.create','raw_contacts.edit',
        'b2b_tours.view'
      ];
    WHEN 'TOUR' THEN
      perms := ARRAY[
        'dashboard.view',
        'customers.view',
        'bookings.view',
        'itineraries.view','itineraries.create','itineraries.edit',
        'accommodations.view',
        'staff.view',
        'leave.view','leave.create',
        'payroll.view',
        'workflow.view'
      ];
    WHEN 'INTERN_SALE_DOMESTIC','INTERN_SALE_OUTBOUND','INTERN_SALE_MICE','INTERN_SALE_INBOUND' THEN
      perms := ARRAY[
        'dashboard.view',
        'customers.view','customers.create','customers.edit',
        'leads.view','leads.create','leads.edit',
        'quotations.view','quotations.create',
        'bookings.view',
        'staff.view',
        'leave.view','leave.create',
        'payroll.view',
        'tour_packages.view',
        'itineraries.view',
        'accommodations.view',
        'workflow.view',
        'settings.view',
        'raw_contacts.view','raw_contacts.create','raw_contacts.edit',
        'b2b_tours.view'
      ];
    WHEN 'INTERN_DIEUHAN' THEN
      perms := ARRAY[
        'dashboard.view',
        'customers.view',
        'leads.view',
        'bookings.view',
        'staff.view',
        'leave.view','leave.create',
        'payroll.view',
        'itineraries.view',
        'accommodations.view',
        'workflow.view',
        'settings.view'
      ];
    WHEN 'INTERN_MKT' THEN
      perms := ARRAY[
        'dashboard.view',
        'customers.view',
        'leads.view',
        'staff.view',
        'leave.view','leave.create',
        'payroll.view',
        'workflow.view',
        'settings.view',
        'b2b_tours.view'
      ];
    WHEN 'INTERN_HCNS' THEN
      perms := ARRAY[
        'dashboard.view',
        'staff.view',
        'leave.view','leave.create',
        'payroll.view',
        'workflow.view',
        'settings.view'
      ];
    WHEN 'INTERN_KETOAN' THEN
      perms := ARRAY[
        'dashboard.view',
        'finance.view',
        'payments.view',
        'bookings.view',
        'staff.view',
        'leave.view','leave.create',
        'payroll.view',
        'workflow.view',
        'settings.view'
      ];
    ELSE
      perms := ARRAY[]::text[];
  END CASE;
  RETURN perms;
END;
$function$;
