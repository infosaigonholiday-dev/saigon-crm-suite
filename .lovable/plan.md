
Mình làm được, và đúng là đã bị lặp do cách xử lý trước đó “đổi qua đổi lại” giữa policy và trigger.

## Vì sao bị lặp lệnh
1. Hệ thống quét bảo mật dùng rule tĩnh, ưu tiên nhìn vào `WITH CHECK` của policy.
2. Trong khi đó bản gần nhất lại chuyển trọng tâm sang trigger `prevent_role_change` + `profiles_self_update` chỉ còn `WITH CHECK (auth.uid() = id)`.
3. Kết quả: trigger thực tế đã chặn đổi `role`, nhưng scanner vẫn cảnh báo “escalation” → lại đề xuất chạy lệnh tương tự nhiều lần.

## Kế hoạch chốt dứt điểm (1 vòng, không lặp)
1. **Chốt policy `profiles_self_update` theo đúng rule scanner**
   - Giữ trigger `enforce_role_immutability` (defense-in-depth).
   - Cập nhật lại `profiles_self_update` để có `WITH CHECK` khóa `role` không đổi.
2. **Quét bảo mật lại 1 lần duy nhất** sau khi cập nhật policy.
3. **Nếu còn cảnh báo escalation do scanner không hiểu trigger**:
   - Không đổi policy qua lại nữa.
   - Giữ cấu hình hiện tại và đánh dấu finding với lý do kỹ thuật rõ ràng (trigger đang enforce server-side).
4. **Xử lý cảnh báo còn lại (không liên quan RLS/policy)**:
   - `Leaked Password Protection Disabled` cần bật trong Supabase Auth settings (thao tác cấu hình, không phải SQL).

## Technical details
- Trạng thái hiện tại đã xác minh:
  - `profiles` có các policy: `profiles_admin_all`, `profiles_self_read`, `profiles_self_update`.
  - Trigger `enforce_role_immutability` đang tồn tại và hoạt động.
  - RLS đã bật trên các bảng trọng yếu (`profiles`, `employees`, `budget_plans`, ...).
- SQL chốt cho `profiles_self_update`:
```sql
DROP POLICY IF EXISTS "profiles_self_update" ON profiles;
CREATE POLICY "profiles_self_update" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT p.role FROM profiles p WHERE p.id = auth.uid())
  );
```
- Lý do giữ cả 2 lớp:
  - **Policy** để scanner pass và chặn ở lớp RLS.
  - **Trigger** để chặn chắc chắn ở lớp DB ngay cả khi policy bị nới lỏng về sau.
