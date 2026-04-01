
CREATE SEQUENCE IF NOT EXISTS budget_estimate_seq START 1;

CREATE TABLE IF NOT EXISTS budget_estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE,
  booking_id uuid REFERENCES bookings(id) NOT NULL,
  created_by uuid REFERENCES profiles(id) NOT NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft','pending_review','approved','rejected','disbursed','settled')),
  total_estimated numeric DEFAULT 0,
  advance_amount numeric DEFAULT 0,
  advance_recipient uuid REFERENCES profiles(id),
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS budget_estimate_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id uuid REFERENCES budget_estimates(id) ON DELETE CASCADE NOT NULL,
  category text NOT NULL,
  description text,
  unit_price numeric DEFAULT 0,
  quantity integer DEFAULT 1,
  total numeric GENERATED ALWAYS AS (unit_price * quantity) STORED,
  vendor_id uuid REFERENCES vendors(id),
  payment_deadline date,
  sort_order integer DEFAULT 0
);

-- Auto-generate code
CREATE OR REPLACE FUNCTION generate_estimate_code()
RETURNS trigger AS $$
BEGIN
  NEW.code := 'DT-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('budget_estimate_seq')::text, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_estimate_code BEFORE INSERT ON budget_estimates FOR EACH ROW WHEN (NEW.code IS NULL) EXECUTE FUNCTION generate_estimate_code();

-- Auto-update total
CREATE OR REPLACE FUNCTION update_estimate_total()
RETURNS trigger AS $$
BEGIN
  UPDATE budget_estimates SET total_estimated = (SELECT COALESCE(SUM(total), 0) FROM budget_estimate_items WHERE estimate_id = COALESCE(NEW.estimate_id, OLD.estimate_id))
  WHERE id = COALESCE(NEW.estimate_id, OLD.estimate_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_estimate_total AFTER INSERT OR UPDATE OR DELETE ON budget_estimate_items FOR EACH ROW EXECUTE FUNCTION update_estimate_total();

-- RLS
ALTER TABLE budget_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_estimate_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "estimates_read" ON budget_estimates FOR SELECT TO authenticated
USING (created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','KETOAN','DIEUHAN']));

CREATE POLICY "estimates_write" ON budget_estimates FOR INSERT TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','DIEUHAN']));

CREATE POLICY "estimates_update" ON budget_estimates FOR UPDATE TO authenticated
USING (created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','KETOAN']));

CREATE POLICY "estimates_delete" ON budget_estimates FOR DELETE TO authenticated
USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']));

CREATE POLICY "estimate_items_all" ON budget_estimate_items FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM budget_estimates WHERE id = estimate_id AND (created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','KETOAN','DIEUHAN']))));
