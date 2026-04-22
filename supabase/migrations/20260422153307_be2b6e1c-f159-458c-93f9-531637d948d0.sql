-- Bảng ghi chú nội bộ (immutable audit trail)
CREATE TABLE public.internal_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN (
    'raw_contact','lead','customer','booking',
    'quotation','contract','payment','employee','finance'
  )),
  entity_id uuid NOT NULL,
  content text NOT NULL,
  mention_user_ids uuid[] NOT NULL DEFAULT '{}',
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notes_entity ON public.internal_notes(entity_type, entity_id);
CREATE INDEX idx_notes_mentions ON public.internal_notes USING gin(mention_user_ids);
CREATE INDEX idx_notes_created_by ON public.internal_notes(created_by);

ALTER TABLE public.internal_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access" ON public.internal_notes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'ADMIN'))
  WITH CHECK (has_role(auth.uid(),'ADMIN'));

CREATE POLICY "notes_read" ON public.internal_notes
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR auth.uid() = ANY(mention_user_ids)
    OR has_any_role(auth.uid(), ARRAY['SUPER_ADMIN','GDKD','MANAGER'])
  );

CREATE POLICY "notes_insert" ON public.internal_notes
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Mở rộng CHECK constraint của notifications để cho phép type='internal_note'
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'birthday','company_anniversary','follow_up','payment_due',
    'contract_expiry','internal_note',
    'LEAD_FORGOTTEN','FOLLOW_UP_OVERDUE','TRAVEL_DATE_NEAR'
  ));