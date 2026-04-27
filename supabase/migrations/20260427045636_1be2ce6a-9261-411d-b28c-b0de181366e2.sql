-- 1) Drop unused duplicate table
DROP TABLE IF EXISTS public.quotes CASCADE;

-- 2) Add explicit policies for push_send_log (RLS đã bật nhưng 0 policy → khoá hoàn toàn)
DROP POLICY IF EXISTS "Service role manage push log" ON public.push_send_log;
CREATE POLICY "Service role manage push log"
  ON public.push_send_log
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Admin can read push log" ON public.push_send_log;
CREATE POLICY "Admin can read push log"
  ON public.push_send_log
  FOR SELECT
  TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']));