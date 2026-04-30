-- Test trigger trg_notify_lead_reassign by reassigning a lead and reverting
DO $$
DECLARE
  v_lead_id uuid := '8b1adae0-b540-47a0-8b5c-4781365801b1';
  v_old_assignee uuid := '8af1b413-fe15-49b2-896a-7a5cd9e30189';
  v_new_assignee uuid := '2937bb9c-48d1-4e0d-948c-d945fe8fcd39';
BEGIN
  UPDATE leads SET assigned_to = v_new_assignee WHERE id = v_lead_id;
  UPDATE leads SET assigned_to = v_old_assignee WHERE id = v_lead_id;
END $$;