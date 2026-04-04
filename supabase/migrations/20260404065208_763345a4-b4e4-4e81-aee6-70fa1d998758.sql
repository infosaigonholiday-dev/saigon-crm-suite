
-- 1. Fix audit_logs: đổi policy từ TO public sang TO authenticated
DROP POLICY IF EXISTS "admin_full_access" ON public.audit_logs;
CREATE POLICY "admin_full_access" ON public.audit_logs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'))
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));

-- 2. Fix customer_segment_rules: thêm SELECT policy cho authenticated users
CREATE POLICY "authenticated_read_segment_rules" ON public.customer_segment_rules
  FOR SELECT TO authenticated
  USING (true);
