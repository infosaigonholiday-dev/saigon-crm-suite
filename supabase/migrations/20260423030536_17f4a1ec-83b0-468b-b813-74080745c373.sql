CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_full_access" ON public.push_subscriptions;
CREATE POLICY "admin_full_access" ON public.push_subscriptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'ADMIN')) WITH CHECK (public.has_role(auth.uid(),'ADMIN'));

DROP POLICY IF EXISTS "own_subs_select" ON public.push_subscriptions;
CREATE POLICY "own_subs_select" ON public.push_subscriptions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "own_subs_insert" ON public.push_subscriptions;
CREATE POLICY "own_subs_insert" ON public.push_subscriptions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "own_subs_delete" ON public.push_subscriptions;
CREATE POLICY "own_subs_delete" ON public.push_subscriptions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "own_subs_update" ON public.push_subscriptions;
CREATE POLICY "own_subs_update" ON public.push_subscriptions FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());