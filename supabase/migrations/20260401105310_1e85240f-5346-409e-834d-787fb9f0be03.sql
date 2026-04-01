
ALTER TABLE leads ADD COLUMN IF NOT EXISTS budget numeric;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS destination text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS pax_count integer;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS temperature text DEFAULT 'warm';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_up_date date;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS call_notes text;

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_temperature_check;
ALTER TABLE leads ADD CONSTRAINT leads_temperature_check CHECK (temperature IS NULL OR temperature IN ('hot','warm','cold'));
