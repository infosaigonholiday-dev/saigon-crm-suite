
ALTER TABLE leads
  DROP CONSTRAINT leads_customer_id_fkey,
  ADD CONSTRAINT leads_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;

ALTER TABLE leads
  DROP CONSTRAINT leads_converted_customer_id_fkey,
  ADD CONSTRAINT leads_converted_customer_id_fkey
    FOREIGN KEY (converted_customer_id) REFERENCES customers(id) ON DELETE SET NULL;

ALTER TABLE bookings
  DROP CONSTRAINT bookings_customer_id_fkey,
  ADD CONSTRAINT bookings_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;

ALTER TABLE quotes
  DROP CONSTRAINT quotes_customer_id_fkey,
  ADD CONSTRAINT quotes_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;

ALTER TABLE contracts
  DROP CONSTRAINT contracts_customer_id_fkey,
  ADD CONSTRAINT contracts_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;

ALTER TABLE invoices
  DROP CONSTRAINT invoices_customer_id_fkey,
  ADD CONSTRAINT invoices_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;

ALTER TABLE accounts_receivable
  DROP CONSTRAINT accounts_receivable_customer_id_fkey,
  ADD CONSTRAINT accounts_receivable_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
