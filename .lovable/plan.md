# Kế hoạch fix bổ sung

## 🎯 Ưu tiên 1 — TỐI ƯU ẢNH CHÂN DUNG (yêu cầu chính lần này)

**Vấn đề:** Đang resize 200×200 JPEG q=0.85 (~15-25KB). Display max 64px → dư gấp 3 lần.

**Fix `EmployeeAvatarUpload.tsx`:**
1. Resize **128×128** (cover được retina cho display 64px@2x)
2. Quality JPEG xuống **0.78** (gần như không thấy khác biệt với chân dung nhỏ)
3. Thử **WebP** trước (quality 0.75), fallback JPEG nếu browser không hỗ trợ → giảm 30-40% size
4. Mục tiêu: **mỗi avatar < 8KB** (hiện 15-25KB)
5. Thêm `loading="lazy"` cho `<AvatarImage>` trong `EmployeeAvatar.tsx` để không block initial render
6. Thêm `decoding="async"` để decode ảnh không block main thread

**Bonus:** Set `Cache-Control: public, max-age=31536000, immutable` khi upload (đang là 3600 = 1 giờ → đổi thành 1 năm vì path đã có timestamp cache-buster).

## 🎯 Ưu tiên 2 — Hoàn thiện hiển thị avatar 24px trong LeaveManagement

`EmployeeAvatar` đã được import nhưng chưa render trong table cell. Thêm `<EmployeeAvatar size={24}>` cạnh tên nhân viên trong bảng nghỉ phép + cột "Lịch LV" với tooltip (nếu chưa có).

## 🎯 Ưu tiên 3 — DỌN DẸP DATABASE (B5)

### a. Drop bảng `quotes` duplicate
```sql
DROP TABLE IF EXISTS public.quotes CASCADE;
```
(Dùng `quotations` xuyên suốt code)

### b. Thêm policy rõ ràng cho `push_send_log`
RLS đã bật nhưng 0 policy → khóa hoàn toàn. Thêm:
```sql
CREATE POLICY "Service role only" ON public.push_send_log
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Admin can read push log" ON public.push_send_log
  FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN']));
```

## ❌ KHÔNG cần fix (đã có sẵn)
- Avatar column, bucket, upload, hook useCompanyInfo, work_schedules table+RLS+UI, system_config policies, deposit constraint, special_notes/contracts schema → tất cả ✅
- Sprint 8 không có data vi phạm deposit
- Role count: 12 active / 22 hỗ trợ — không cần đổi knowledge

## 📝 Cần user điền tay (không thể tự fix)
- `/cai-dat → Thông tin công ty`: điền `COMPANY_TAX_CODE`, `COMPANY_EMAIL`, upload `COMPANY_LOGO_URL`, hoàn thiện 2 dòng bank account number.

---

**Phạm vi sửa code:**
1. `src/components/employees/EmployeeAvatarUpload.tsx` — resize 128 + WebP + cache 1 năm
2. `src/components/employees/EmployeeAvatar.tsx` — thêm `loading="lazy"` + `decoding="async"`
3. `src/pages/LeaveManagement.tsx` — render avatar 24px + cột "Lịch LV" trong table cells (nếu chưa có)
4. Migration SQL — DROP quotes + policy push_send_log

Sau khi user duyệt, tôi sẽ thực hiện và báo cáo file size mới.
