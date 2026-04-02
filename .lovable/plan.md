

# Phân tích yêu cầu

Bạn muốn thêm policy `department_scope` cho bảng `customers`. Tuy nhiên, **hệ thống hiện tại đã có sẵn logic này**:

## Hiện trạng `customers_read`
```sql
customers_read (SELECT):
  assigned_sale_id = auth.uid()
  OR created_by = auth.uid()
  OR has_any_role(..., ARRAY['DIEUHAN', 'KETOAN'])
  OR (department_id = get_my_department_id() AND has_any_role(..., ARRAY['MANAGER', 'GDKD']))
```

- Dòng cuối **đã chính xác là department_scope** cho GDKD/MANAGER — dùng `get_my_department_id()` (security definer, không gây recursion).
- ADMIN đã được cover bởi `admin_full_access` (FOR ALL).

## Vấn đề với SQL bạn gửi

1. **Redundant**: Phần `OR EXISTS (... role = 'ADMIN')` không cần — đã có `admin_full_access`.
2. **Dùng raw EXISTS trên profiles**: Có thể gây recursion nếu áp dụng trên bảng `profiles`. Hệ thống hiện dùng `get_my_department_id()` và `has_any_role()` (security definer) — an toàn hơn.
3. **Trùng logic**: Thêm policy SELECT mới sẽ chồng chéo với `customers_read` đã có.

## Kết luận

**Không cần thay đổi gì** — bảng `customers` đã có department_scope cho GDKD/MANAGER trong policy `customers_read`. Pattern đang dùng (`get_my_department_id()` + `has_any_role()`) tốt hơn raw EXISTS.

Nếu bạn muốn áp dụng pattern tương tự cho **bảng khác chưa có department_scope**, hãy cho biết bảng nào cần thêm.

