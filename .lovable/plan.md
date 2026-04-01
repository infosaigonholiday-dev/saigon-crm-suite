

## Cập nhật CustomerDetail - Hiển thị đầy đủ thông tin

### Hiện trạng
Trang CustomerDetail hiện chỉ hiển thị: tên, phone, email, segment badge, 4 stat cards, và 3 tabs (Bookings, Payments, Chart). Thiếu hoàn toàn thông tin cá nhân mở rộng và thông tin doanh nghiệp.

### Kế hoạch

**1. Thêm tab "Hồ sơ" làm tab mặc định** (trước Bookings)

Chia thành 2 Card:

**Card "Thông tin cá nhân"** — grid 2 cột hiển thị:
- Ngày sinh (date_of_birth) + badge "Sinh nhật sắp tới" nếu trong 7 ngày
- Giới tính (gender)
- CCCD/Passport (id_number)
- Địa chỉ (address)
- Nguồn đến (source) — join `lead_sources` để lấy tên
- Phân hạng (tier) — badge màu: Mới/Silver/Gold/Diamond
- Phân khúc (segment) — badge hiện có
- Ghi chú (notes)

**Card "Thông tin doanh nghiệp"** — chỉ hiện khi `type === 'DOANH NGHIỆP'` hoặc có `company_name`:
- Tên công ty (company_name)
- MST (tax_code)
- Địa chỉ công ty (company_address)
- Người liên hệ (contact_person) + chức vụ (contact_position)
- Ngày sinh người liên hệ (contact_birthday)
- Email công ty (company_email)
- Ngày thành lập (founded_date)
- Quy mô nhân sự (company_size)

**2. Cập nhật header**
- Thêm tier badge cạnh segment badge
- Thêm nút "Sửa" mở CustomerFormDialog (edit mode) — nếu chưa có edit mode, bỏ qua

**3. Thêm query join lead_sources**
- Sửa customer query: `.select("*, lead_sources(name)")` hoặc query riêng dựa trên `source_id`

### File thay đổi
- `src/pages/CustomerDetail.tsx` — thêm tab Hồ sơ, tier badge, lead_sources join, helper `isBirthdayUpcoming`

