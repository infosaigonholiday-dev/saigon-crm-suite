

## Sửa lỗi Admin không xóa được khách hàng

### Nguyên nhân
7 foreign key tham chiếu tới bảng `customers` đang dùng `NO ACTION`, chặn xóa dù Admin đã có full RLS access.

### Giải pháp
1 migration duy nhất — đổi 7 FK sang `ON DELETE SET NULL`:

```sql
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
```

### Hành vi sau khi sửa
- **Chỉ ADMIN** được xóa khách hàng (giữ nguyên, không thêm role nào)
- Xóa khách hàng → leads, bookings, hợp đồng, hóa đơn, công nợ **vẫn còn** (chỉ `customer_id` thành NULL)
- `customer_tags` và `data_assignments` tự xóa theo (đã có CASCADE sẵn)
- Không cần xóa từng tab — xóa ở tab Khách hàng là đủ
- Không cần sửa code frontend

### Files chỉnh sửa
- 1 file migration SQL mới

