-- Gắn trigger audit cho customers
DROP TRIGGER IF EXISTS trg_customers_audit ON customers;
CREATE TRIGGER trg_customers_audit
  AFTER INSERT OR UPDATE OR DELETE ON customers
  FOR EACH ROW EXECUTE FUNCTION log_customers_changes();

-- Gắn trigger audit cho leads
DROP TRIGGER IF EXISTS trg_leads_audit ON leads;
CREATE TRIGGER trg_leads_audit
  AFTER INSERT OR UPDATE OR DELETE ON leads
  FOR EACH ROW EXECUTE FUNCTION log_leads_changes();