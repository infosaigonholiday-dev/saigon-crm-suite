
-- Function: auto-set department_id on customers from assigned sale or creator
CREATE OR REPLACE FUNCTION public.set_customer_department()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.assigned_sale_id IS NOT NULL THEN
    SELECT department_id INTO NEW.department_id
    FROM profiles WHERE id = NEW.assigned_sale_id;
  ELSIF NEW.created_by IS NOT NULL THEN
    SELECT department_id INTO NEW.department_id
    FROM profiles WHERE id = NEW.created_by;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger on INSERT or UPDATE of assigned_sale_id/created_by
CREATE TRIGGER trg_set_customer_department
BEFORE INSERT OR UPDATE OF assigned_sale_id, created_by
ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.set_customer_department();

-- Backfill existing customers with NULL department_id
UPDATE customers c
SET department_id = p.department_id
FROM profiles p
WHERE c.department_id IS NULL
  AND p.id = COALESCE(c.assigned_sale_id, c.created_by)
  AND p.department_id IS NOT NULL;
