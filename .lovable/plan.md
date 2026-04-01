

## Cập nhật CustomerFormDialog

### Thay đổi chính

Form hiện tại đã có 2 tabs và hầu hết các trường. Cần điều chỉnh:

**1. Tab "Thông tin cá nhân" (đổi tên từ "Thông tin cơ bản")**
- Đổi nguồn từ hardcoded array → query `lead_sources` table
- Giới tính: đổi từ RadioGroup → Select dropdown
- Phân khúc: đổi từ Select editable → Badge read-only
- Ngày sinh: thêm badge "Sinh nhật sắp tới" nếu trong 7 ngày
- Phone validate: siết lại `^\d{10}$` (đúng 10 số)
- Bỏ trường Zalo ID (không có trong spec), thay bằng CCCD/Passport (đã có)

**2. Tab "Thông tin doanh nghiệp" (đổi tên từ "Thông tin công ty")**
- Thêm trường "Ngày sinh người liên hệ" (DatePicker) — map DB column `contact_birthday`
- Map `employee_count` → `company_size` trong DB insert (DB có cả 2 cột, dùng `company_size`)

**3. Submit logic**
- Thêm `contact_birthday` và `company_size` vào insert payload
- Giữ `segment` mặc định "NEW" nhưng không cho user sửa

### File thay đổi

**`src/components/customers/CustomerFormDialog.tsx`**
- Thêm `useQuery` cho `lead_sources`
- Thay `sources` hardcoded → dynamic từ DB
- Giới tính: `Select` thay `RadioGroup`
- Phân khúc: render Badge read-only thay Select
- Thêm helper `isBirthdayUpcoming(date)` — check 7 ngày tới
- Thêm `contact_birthday` DatePicker trong tab company
- Phone validation: `^\d{10}$`
- Insert payload: thêm `contact_birthday`, dùng `company_size` thay `employee_count`

### Không cần migration — tất cả cột đã tồn tại trong DB

