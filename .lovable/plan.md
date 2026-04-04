
Mục tiêu: sửa dứt điểm lỗi “không thêm được khách hàng”.

Do I know what the issue is? Có.

Nguyên nhân chính
- Lỗi hiện tại không còn là RLS nữa.
- Database đang có constraint `customers_type_check` với rule:
```text
type chỉ được là: INDIVIDUAL hoặc CORPORATE
```
- Nhưng frontend đang gửi sai giá trị:
  - `src/components/customers/CustomerFormDialog.tsx`: gửi `"CÁ NHÂN"` / `"DOANH NGHIỆP"`
  - `src/pages/Leads.tsx` khi convert lead sang customer: gửi `"Cá nhân"` / `"Doanh nghiệp"`
- Vì vậy insert bị chặn ngay ở database, đúng như toast trong ảnh.

Kế hoạch fix tổng thể
1. Chuẩn hóa field `customers.type` trên toàn hệ thống
- Dùng 2 giá trị chuẩn duy nhất cho DB:
  - `INDIVIDUAL`
  - `CORPORATE`
- UI vẫn hiển thị tiếng Việt:
  - `INDIVIDUAL` = Cá nhân
  - `CORPORATE` = Doanh nghiệp

2. Sửa form thêm khách hàng
- `src/components/customers/CustomerFormDialog.tsx`
  - đổi `initial.type` từ `"CÁ NHÂN"` sang `"INDIVIDUAL"`
  - đổi `SelectItem value` từ chuỗi tiếng Việt sang:
    - `INDIVIDUAL`
    - `CORPORATE`
  - giữ label hiển thị cho người dùng là “Cá nhân” / “Doanh nghiệp”
  - insert customer sẽ gửi đúng code DB thay vì label tiếng Việt

3. Sửa luồng convert Lead -> Customer
- `src/pages/Leads.tsx`
  - đổi logic:
```text
lead.company_name ? "CORPORATE" : "INDIVIDUAL"
```
- tránh lỗi khi chuyển lead thành khách hàng

4. Sửa chỗ đọc dữ liệu khách hàng sau khi chuẩn hóa
- `src/pages/CustomerDetail.tsx`
  - đổi điều kiện hiển thị block doanh nghiệp từ so sánh `"Doanh nghiệp"` sang `"CORPORATE"`
  - nếu có chỗ nào hiển thị loại khách hàng thì dùng map label thay vì hardcode chuỗi tiếng Việt

5. Thêm migration dọn dữ liệu cũ để tránh lỗi lặp lại
- tạo migration SQL để convert mọi giá trị legacy nếu đang tồn tại:
  - `"CÁ NHÂN"` / `"Cá nhân"` -> `INDIVIDUAL`
  - `"DOANH NGHIỆP"` / `"Doanh nghiệp"` -> `CORPORATE`
- giữ nguyên constraint hiện tại, vì constraint DB đang đúng; dữ liệu gửi lên mới là phần sai

Files sẽ sửa
- `src/components/customers/CustomerFormDialog.tsx`
- `src/pages/Leads.tsx`
- `src/pages/CustomerDetail.tsx`
- `supabase/migrations/...sql`

Kết quả sau fix
- Thêm khách hàng mới sẽ không còn bị lỗi `customers_type_check`
- Convert lead sang customer cũng không còn fail
- Dữ liệu khách hàng doanh nghiệp vẫn hiển thị đúng
- Tránh tình trạng mỗi màn dùng một kiểu chuỗi khác nhau

Chi tiết kỹ thuật
```text
DB value      -> UI label
INDIVIDUAL    -> Cá nhân
CORPORATE     -> Doanh nghiệp
```
