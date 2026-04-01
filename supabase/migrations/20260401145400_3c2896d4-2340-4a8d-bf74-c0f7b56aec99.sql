
-- Clean up empty/invalid departments
DELETE FROM departments WHERE code IS NULL OR code = '' OR name IS NULL OR name = '';

-- Ensure all required departments exist
INSERT INTO departments (code, name) VALUES
  ('BGD', 'Ban Giám đốc'),
  ('KD_NOIDIA', 'Kinh doanh Nội địa'),
  ('KD_OUTBOUND', 'Kinh doanh Outbound'),
  ('KD_MICE', 'Kinh doanh MICE'),
  ('DIEUHAN', 'Phòng Điều hành Tour'),
  ('MKT', 'Phòng Marketing'),
  ('HCNS', 'Phòng Nhân sự - HCNS'),
  ('KETOAN', 'Phòng Kế toán')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

-- Fix employee levels FIRST before adding constraint
UPDATE employees SET level = 'STAFF' WHERE level IS NOT NULL AND level NOT IN ('C-LEVEL', 'DIRECTOR', 'MANAGER', 'STAFF', 'INTERN');
UPDATE employees SET level = 'STAFF' WHERE level IS NULL;

-- Now add the constraint
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_level_check;
ALTER TABLE employees ADD CONSTRAINT employees_level_check
  CHECK (level IS NULL OR level IN ('C-LEVEL', 'DIRECTOR', 'MANAGER', 'STAFF', 'INTERN'));
