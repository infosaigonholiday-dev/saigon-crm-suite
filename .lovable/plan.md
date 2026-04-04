

# Các vấn đề bảo mật còn lại

Sau khi bỏ qua "Leaked Password Protection", còn **3 cảnh báo**:

## 1. `audit_logs` — policies dùng TO public (warn)
Bảng `audit_logs` chứa dữ liệu nhạy cảm (IP, user ID, dữ liệu cũ/mới). Policy `admin_full_access` hiện áp dụng cho `public` (bao gồm anon). Cần đổi thành `TO authenticated`.

**Fix**: Migration drop + recreate policy với `TO authenticated`.

## 2. `customer_segment_rules` — chỉ admin truy cập được (warn)
Bảng chỉ có policy `admin_full_access`, không có SELECT policy cho các role khác (GDKD, DIEUHAN, SALE...). Hiện tại mặc định deny — an toàn nhưng có thể là thiếu sót.

**Fix**: Thêm SELECT policy cho authenticated users hoặc đánh dấu "intentional" nếu chỉ admin cần dùng.

## 3. `profiles` — rủi ro privilege escalation (warn)
RLS dùng `has_role()` đọc từ chính bảng `profiles`. Policy `profiles_self_update` cho phép user update row của mình. Tuy có trigger `prevent_role_change` ngăn đổi role, nhưng vẫn có rủi ro TOCTOU lý thuyết.

**Đánh giá**: Hệ thống đã có trigger `prevent_role_change()` kiểm tra quyền ADMIN/HR_MANAGER/HCNS trước khi cho đổi role hoặc department_id. Kết hợp với `enforce_role_immutability`, rủi ro thực tế rất thấp. Có thể đánh dấu "accepted risk" với ghi chú giải thích.

---

## Kế hoạch thực hiện

1. **Đánh dấu bỏ qua** "Leaked Password Protection" (theo yêu cầu)
2. **Fix audit_logs**: Migration đổi policy sang `TO authenticated`
3. **Xử lý customer_segment_rules**: Thêm SELECT policy hoặc đánh dấu intentional
4. **Xử lý profiles escalation**: Đánh dấu accepted risk với giải thích về các trigger bảo vệ đã có

