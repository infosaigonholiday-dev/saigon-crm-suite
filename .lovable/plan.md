

## Kế hoạch sửa lỗi "malformed array literal: follow_up_date"

### Nguyên nhân
Trigger `log_leads_changes()` dùng toán tử `||` để nối chuỗi vào mảng rỗng. PostgreSQL giải quyết `ARRAY[]::TEXT[] || 'text'` bằng overload `text[] || text[]`, cố cast chuỗi thành mảng → lỗi.

### Giải pháp
Tạo migration thay thế toàn bộ `v_changed := v_changed || 'field_name'` bằng `v_changed := array_append(v_changed, 'field_name')` trong hàm `log_leads_changes()`. Hàm `array_append()` không có vấn đề về operator resolution.

### Thay đổi
1. **1 migration SQL** — `CREATE OR REPLACE FUNCTION log_leads_changes()` với tất cả 21 dòng `||` được đổi thành `array_append()`.

Không cần thay đổi code frontend.

