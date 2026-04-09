-- Add converted_customer_id to leads for back-linking
ALTER TABLE leads ADD COLUMN IF NOT EXISTS converted_customer_id UUID REFERENCES customers(id);

-- Sync existing data
UPDATE leads SET converted_customer_id = customer_id WHERE customer_id IS NOT NULL AND converted_customer_id IS NULL;