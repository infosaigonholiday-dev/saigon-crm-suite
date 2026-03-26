
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_employment_type_check;
ALTER TABLE employees ADD CONSTRAINT employees_employment_type_check 
  CHECK (employment_type IN ('FULLTIME','PARTTIME','PROBATION','INTERN','CONTRACT'));

ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_status_check;
ALTER TABLE employees ADD CONSTRAINT employees_status_check 
  CHECK (status IN ('ACTIVE','PROBATION','RESIGNED','TERMINATED','ON_LEAVE','INTERN'));
