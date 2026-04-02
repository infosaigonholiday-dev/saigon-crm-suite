

# Phân tích: `personal_scope` trên bảng `customers`

## Hiện trạng

Policy `customers_read` (SELECT) đã bao gồm chính xác logic bạn yêu cầu:

```text
customers_read (SELECT):
  created_by = auth.uid()          ← personal_scope
  OR assigned_sale_id = auth.uid() ← mở rộng hơn yêu cầu
  OR has_any_role(..., ['DIEUHAN', 'KETOAN'])
  OR (department_id = get_my_department_id() AND has_any_role(..., ['MANAGER', 'GDKD']))
```

- `created_by = auth.uid()` → **đã có** trong `customers_read`.
- `ADMIN` → **đã có** qua `admin_full_access` (FOR ALL).

## Kết luận

**Không cần thay đổi gì** — logic `personal_scope` đã được cover bởi `customers_read`. Thêm policy mới sẽ tạo logic trùng lặp.

Nếu bạn muốn áp dụng pattern `personal_scope` cho **bảng khác chưa có**, hãy cho biết bảng nào.

