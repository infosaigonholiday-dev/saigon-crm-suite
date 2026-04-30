
CREATE TABLE public.broadcast_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  url TEXT,
  target_filter JSONB,
  recipient_ids UUID[] NOT NULL DEFAULT '{}',
  sent_count INTEGER NOT NULL DEFAULT 0,
  sent_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_broadcast_messages_sent_by ON public.broadcast_messages(sent_by);
CREATE INDEX idx_broadcast_messages_created_at ON public.broadcast_messages(created_at DESC);

ALTER TABLE public.broadcast_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access_broadcast_messages"
ON public.broadcast_messages
FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role='ADMIN' AND p.is_active=true)
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role='ADMIN' AND p.is_active=true)
);

CREATE POLICY "users_view_own_broadcasts"
ON public.broadcast_messages
FOR SELECT
TO authenticated
USING (sent_by = auth.uid());

CREATE POLICY "allowed_roles_create_broadcasts"
ON public.broadcast_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sent_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_active = true
      AND p.role IN ('ADMIN','GDKD','MANAGER','HCNS')
  )
);
