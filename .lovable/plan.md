

# Phân tích: `leave_approve_department` trên bảng `leave_requests`

## Hiện trạng

Policy `leave_requests_update` (UPDATE) đã bao gồm chính xác logic bạn yêu cầu:

```text
leave_requests_update (UPDATE):
  employee_id = get_my_employee_id()                    ← nhân viên sửa đơn của mình
  OR has_any_role(..., ARRAY['HR_MANAGER', 'HCNS'])     ← HR duyệt toàn hệ thống
  OR (employee_id IN (SELECT id FROM employees WHERE department_id = get_my_department_id())
      AND has_any_role(..., ARRAY['MANAGER', 'GDKD', 'DIEUHAN']))  ← quản lý duyệt theo phòng ban
```

- **Department scope**: MANAGER/GDKD chỉ UPDATE được đơn của nhân viên cùng `department_id` — dùng `get_my_department_id()` (security definer, không gây recursion).
- **HR toàn quyền**: HR_MANAGER/HCNS duyệt được tất cả đơn.
- **ADMIN**: Đã cover bởi `admin_full_access` (FOR ALL).

## Vấn đề với SQL bạn gửi

1. **Trùng logic**: Thêm policy UPDATE mới sẽ chồng chéo với `leave_requests_update` đã có.
2. **Dùng raw JOIN trên profiles**: Có thể gây recursion. Hệ thống hiện dùng `get_my_department_id()` + `has_any_role()` — an toàn hơn.
3. **Tham chiếu sai cột**: SQL dùng `leave_requests.user_id` nhưng bảng thực tế dùng `employee_id` (FK đến `employees`, không phải `profiles`).

## Kết luận

**Không cần thay đổi gì** — bảng `leave_requests` đã có department-scoped approval cho MANAGER/GDKD và global approval cho HR_MANAGER/HCNS trong policy `leave_requests_update`.

