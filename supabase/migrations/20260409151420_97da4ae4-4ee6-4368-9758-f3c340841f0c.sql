
-- Tạo bảng lead_care_history
CREATE TABLE public.lead_care_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  contacted_by UUID NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  contacted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  contact_method TEXT NOT NULL DEFAULT 'CALL',
  result TEXT NOT NULL DEFAULT 'NO_ANSWER',
  note TEXT,
  next_action TEXT,
  next_contact_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT care_method_check CHECK (contact_method IN ('CALL','ZALO','EMAIL','VISIT','SMS','OTHER')),
  CONSTRAINT care_result_check CHECK (result IN ('NO_ANSWER','BUSY','NO_NEED','ALREADY_TRAVELED','HAS_PARTNER','INTERESTED','SENT_PROFILE','CALLBACK','QUOTE_REQUESTED','BOOKED'))
);

-- Indexes
CREATE INDEX idx_care_history_lead ON lead_care_history(lead_id);
CREATE INDEX idx_care_history_contacted_by ON lead_care_history(contacted_by);
CREATE INDEX idx_care_history_next_date ON lead_care_history(next_contact_date);

-- RLS
ALTER TABLE lead_care_history ENABLE ROW LEVEL SECURITY;

-- Policy: NV xem/tạo lịch sử lead mình được giao hoặc tự tạo
CREATE POLICY "care_history_personal" ON lead_care_history
FOR ALL TO authenticated
USING (
  contacted_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM leads l WHERE l.id = lead_care_history.lead_id
    AND (l.assigned_to = auth.uid() OR l.created_by = auth.uid())
  )
  OR public.has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN'])
)
WITH CHECK (
  contacted_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM leads l WHERE l.id = lead_care_history.lead_id
    AND (l.assigned_to = auth.uid() OR l.created_by = auth.uid())
  )
  OR public.has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN'])
);

-- Policy: Leader/GDKD xem lịch sử phòng mình
CREATE POLICY "care_history_department" ON lead_care_history
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    JOIN leads l ON l.id = lead_care_history.lead_id
    WHERE p.id = auth.uid() 
    AND p.role IN ('GDKD', 'MANAGER')
    AND p.department_id = l.department_id
  )
);

-- Trigger: khi tạo care_history → auto cập nhật lead
CREATE OR REPLACE FUNCTION public.update_lead_from_care()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE leads SET 
    last_contact_at = NEW.contacted_at,
    contact_count = COALESCE(contact_count, 0) + 1,
    follow_up_date = COALESCE(NEW.next_contact_date, follow_up_date)
  WHERE id = NEW.lead_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_care_history_update_lead
AFTER INSERT ON lead_care_history
FOR EACH ROW EXECUTE FUNCTION update_lead_from_care();
