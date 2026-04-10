
CREATE OR REPLACE FUNCTION public.log_leads_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_user_name TEXT;
  v_action TEXT;
  v_changed TEXT[];
  v_summary TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NOT NULL THEN
    SELECT role, full_name INTO v_user_role, v_user_name
    FROM profiles WHERE id = v_user_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_action := 'CREATE';
    v_summary := format('Tạo lead mới: %s', NEW.full_name);
    INSERT INTO audit_logs (user_id, user_role, user_full_name, table_name, record_id, action, old_data, new_data, change_summary)
    VALUES (v_user_id, v_user_role, v_user_name, 'leads', NEW.id, v_action, NULL, to_jsonb(NEW), v_summary);
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_action := 'STATUS_CHANGE';
      v_summary := format('Đổi trạng thái: %s → %s', OLD.status, NEW.status);
    ELSIF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      v_action := 'REASSIGN';
      v_summary := 'Chuyển người phụ trách';
    ELSE
      v_action := 'UPDATE';
      v_summary := 'Cập nhật thông tin';
    END IF;

    v_changed := ARRAY[]::TEXT[];
    IF OLD.full_name IS DISTINCT FROM NEW.full_name THEN v_changed := array_append(v_changed, 'full_name'); END IF;
    IF OLD.phone IS DISTINCT FROM NEW.phone THEN v_changed := array_append(v_changed, 'phone'); END IF;
    IF OLD.email IS DISTINCT FROM NEW.email THEN v_changed := array_append(v_changed, 'email'); END IF;
    IF OLD.company_name IS DISTINCT FROM NEW.company_name THEN v_changed := array_append(v_changed, 'company_name'); END IF;
    IF OLD.company_address IS DISTINCT FROM NEW.company_address THEN v_changed := array_append(v_changed, 'company_address'); END IF;
    IF OLD.status IS DISTINCT FROM NEW.status THEN v_changed := array_append(v_changed, 'status'); END IF;
    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN v_changed := array_append(v_changed, 'assigned_to'); END IF;
    IF OLD.call_notes IS DISTINCT FROM NEW.call_notes THEN v_changed := array_append(v_changed, 'call_notes'); END IF;
    IF OLD.temperature IS DISTINCT FROM NEW.temperature THEN v_changed := array_append(v_changed, 'temperature'); END IF;
    IF OLD.planned_travel_date IS DISTINCT FROM NEW.planned_travel_date THEN v_changed := array_append(v_changed, 'planned_travel_date'); END IF;
    IF OLD.pax_count IS DISTINCT FROM NEW.pax_count THEN v_changed := array_append(v_changed, 'pax_count'); END IF;
    IF OLD.budget IS DISTINCT FROM NEW.budget THEN v_changed := array_append(v_changed, 'budget'); END IF;
    IF OLD.destination IS DISTINCT FROM NEW.destination THEN v_changed := array_append(v_changed, 'destination'); END IF;
    IF OLD.follow_up_date IS DISTINCT FROM NEW.follow_up_date THEN v_changed := array_append(v_changed, 'follow_up_date'); END IF;
    IF OLD.lost_reason IS DISTINCT FROM NEW.lost_reason THEN v_changed := array_append(v_changed, 'lost_reason'); END IF;
    IF OLD.channel IS DISTINCT FROM NEW.channel THEN v_changed := array_append(v_changed, 'channel'); END IF;
    IF OLD.interest_type IS DISTINCT FROM NEW.interest_type THEN v_changed := array_append(v_changed, 'interest_type'); END IF;
    IF OLD.expected_value IS DISTINCT FROM NEW.expected_value THEN v_changed := array_append(v_changed, 'expected_value'); END IF;
    IF OLD.contact_person IS DISTINCT FROM NEW.contact_person THEN v_changed := array_append(v_changed, 'contact_person'); END IF;
    IF OLD.contact_position IS DISTINCT FROM NEW.contact_position THEN v_changed := array_append(v_changed, 'contact_position'); END IF;
    IF OLD.tax_code IS DISTINCT FROM NEW.tax_code THEN v_changed := array_append(v_changed, 'tax_code'); END IF;

    IF array_length(v_changed, 1) > 0 THEN
      INSERT INTO audit_logs (user_id, user_role, user_full_name, table_name, record_id, action, old_data, new_data, changed_fields, change_summary)
      VALUES (v_user_id, v_user_role, v_user_name, 'leads', NEW.id, v_action, to_jsonb(OLD), to_jsonb(NEW), v_changed, v_summary);
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'DELETE';
    v_summary := format('Xóa lead: %s', OLD.full_name);
    INSERT INTO audit_logs (user_id, user_role, user_full_name, table_name, record_id, action, old_data, new_data, change_summary)
    VALUES (v_user_id, v_user_role, v_user_name, 'leads', OLD.id, v_action, to_jsonb(OLD), NULL, v_summary);
    RETURN OLD;
  END IF;
END;
$function$;
