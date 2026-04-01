
-- Only add columns that DON'T already exist in the customers table
-- Existing: address, source, company_name, tax_code, company_address, contact_person, contact_position, company_email, gender, id_number, date_of_birth, employee_count, founded_date

-- New: tier for customer segmentation level
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tier text DEFAULT 'Mới';

-- New: contact_birthday for B2B contact person's birthday
ALTER TABLE customers ADD COLUMN IF NOT EXISTS contact_birthday date;

-- New: company_size as alias/additional field (employee_count exists but this is explicitly requested)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_size integer;

-- Add check constraint for tier values
ALTER TABLE customers ADD CONSTRAINT chk_tier CHECK (tier IS NULL OR tier IN ('Mới','Silver','Gold','Diamond'));

-- Add check constraint for tax_code length (10 digits)
ALTER TABLE customers ADD CONSTRAINT chk_tax_code CHECK (tax_code IS NULL OR length(tax_code) = 10);
