
ALTER TABLE profiles DISABLE TRIGGER enforce_role_immutability;
UPDATE profiles SET role = 'HR_HEAD' WHERE id = 'f1287796-aef5-4bce-bc29-ee1dd1cfce2d';
ALTER TABLE profiles ENABLE TRIGGER enforce_role_immutability;
