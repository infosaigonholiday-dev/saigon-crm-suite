CREATE TABLE IF NOT EXISTS public.notification_delivery_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  channel text NOT NULL CHECK (channel IN ('in_app','push','email','sms')),
  status text NOT NULL CHECK (status IN ('queued','sent','failed','not_subscribed','push_failed','skipped')),
  provider text,
  provider_response jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ndl_notification ON public.notification_delivery_logs(notification_id);
CREATE INDEX IF NOT EXISTS idx_ndl_user ON public.notification_delivery_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ndl_status ON public.notification_delivery_logs(status);
CREATE INDEX IF NOT EXISTS idx_ndl_created ON public.notification_delivery_logs(created_at DESC);

ALTER TABLE public.notification_delivery_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ndl_select_own" ON public.notification_delivery_logs;
CREATE POLICY "ndl_select_own"
ON public.notification_delivery_logs
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "ndl_select_admin" ON public.notification_delivery_logs;
CREATE POLICY "ndl_select_admin"
ON public.notification_delivery_logs
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'ADMIN')
  OR public.has_role(auth.uid(), 'SUPER_ADMIN')
  OR public.has_role(auth.uid(), 'HR_MANAGER')
);