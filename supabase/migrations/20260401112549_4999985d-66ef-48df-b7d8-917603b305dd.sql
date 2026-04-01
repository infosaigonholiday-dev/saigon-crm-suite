
CREATE OR REPLACE FUNCTION generate_estimate_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.code := 'DT-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('budget_estimate_seq')::text, 4, '0');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_estimate_total()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE budget_estimates SET total_estimated = (SELECT COALESCE(SUM(total), 0) FROM budget_estimate_items WHERE estimate_id = COALESCE(NEW.estimate_id, OLD.estimate_id))
  WHERE id = COALESCE(NEW.estimate_id, OLD.estimate_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;
