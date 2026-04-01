
-- Sequence for settlement codes
CREATE SEQUENCE IF NOT EXISTS budget_settlement_seq START 1;

-- Main settlements table
CREATE TABLE IF NOT EXISTS budget_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE,
  estimate_id uuid REFERENCES budget_estimates(id) NOT NULL,
  booking_id uuid REFERENCES bookings(id) NOT NULL,
  created_by uuid REFERENCES profiles(id) NOT NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft','pending_accountant','accountant_approved','pending_ceo','ceo_approved','closed')),
  total_actual numeric DEFAULT 0,
  total_estimated numeric DEFAULT 0,
  variance numeric GENERATED ALWAYS AS (total_actual - total_estimated) STORED,
  variance_pct numeric DEFAULT 0,
  advance_amount numeric DEFAULT 0,
  refund_amount numeric GENERATED ALWAYS AS (GREATEST(advance_amount - total_actual, 0)) STORED,
  additional_amount numeric GENERATED ALWAYS AS (GREATEST(total_actual - advance_amount, 0)) STORED,
  accountant_id uuid REFERENCES profiles(id),
  accountant_approved_at timestamptz,
  accountant_note text,
  ceo_id uuid REFERENCES profiles(id),
  ceo_approved_at timestamptz,
  ceo_note text,
  created_at timestamptz DEFAULT now()
);

-- Settlement line items
CREATE TABLE IF NOT EXISTS settlement_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id uuid REFERENCES budget_settlements(id) ON DELETE CASCADE NOT NULL,
  category text NOT NULL,
  description text,
  estimated_amount numeric DEFAULT 0,
  actual_amount numeric DEFAULT 0,
  variance numeric GENERATED ALWAYS AS (actual_amount - estimated_amount) STORED,
  receipt_url text,
  sort_order integer DEFAULT 0
);

-- Auto-generate settlement code QT-YYYY-NNNN
CREATE OR REPLACE FUNCTION public.generate_settlement_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.code := 'QT-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('budget_settlement_seq')::text, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_settlement_code
  BEFORE INSERT ON budget_settlements
  FOR EACH ROW EXECUTE FUNCTION generate_settlement_code();

-- Auto-update total_actual from settlement_items
CREATE OR REPLACE FUNCTION public.update_settlement_total()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _settlement_id uuid;
  _total numeric;
  _estimated numeric;
BEGIN
  _settlement_id := COALESCE(NEW.settlement_id, OLD.settlement_id);
  SELECT COALESCE(SUM(actual_amount), 0) INTO _total FROM settlement_items WHERE settlement_id = _settlement_id;
  SELECT COALESCE(SUM(estimated_amount), 0) INTO _estimated FROM settlement_items WHERE settlement_id = _settlement_id;
  UPDATE budget_settlements SET 
    total_actual = _total,
    total_estimated = _estimated,
    variance_pct = CASE WHEN _estimated > 0 THEN ROUND(((_total - _estimated) / _estimated) * 100, 2) ELSE 0 END
  WHERE id = _settlement_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_settlement_total
  AFTER INSERT OR UPDATE OR DELETE ON settlement_items
  FOR EACH ROW EXECUTE FUNCTION update_settlement_total();

-- RLS
ALTER TABLE budget_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settlements_read" ON budget_settlements FOR SELECT TO authenticated
USING (created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','KETOAN','DIEUHAN']));

CREATE POLICY "settlements_write" ON budget_settlements FOR INSERT TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','DIEUHAN']));

CREATE POLICY "settlements_update" ON budget_settlements FOR UPDATE TO authenticated
USING (created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','KETOAN']));

CREATE POLICY "settlements_delete" ON budget_settlements FOR DELETE TO authenticated
USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']));

CREATE POLICY "settlement_items_all" ON settlement_items FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM budget_settlements WHERE id = settlement_items.settlement_id AND (created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','DIRECTOR','KETOAN','DIEUHAN']))));

-- Add 'settled' to budget_estimates status check
ALTER TABLE budget_estimates DROP CONSTRAINT IF EXISTS budget_estimates_status_check;
ALTER TABLE budget_estimates ADD CONSTRAINT budget_estimates_status_check CHECK (status IN ('draft','pending_review','approved','rejected','disbursed','settled'));
