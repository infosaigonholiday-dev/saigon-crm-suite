

## Bổ sung trường cho Kho Data (raw_contacts)

### Vấn đề
Form "Thêm data mới" thiếu 3 trường quan trọng:
1. **Quy mô nhân sự** (company_size) — cần cho data B2B
2. **Họ tên = Họ tên người phụ trách** — đổi label "Họ tên" → "Họ tên người phụ trách" (contact_person) để rõ nghĩa, giữ full_name cho tên công ty/cá nhân
3. **Thời gian tổ chức dự kiến** (planned_event_date) — để đẩy qua Lead với ngày đi dự kiến

### Thay đổi

#### 1. Migration — Thêm 2 cột vào raw_contacts

```sql
ALTER TABLE raw_contacts ADD COLUMN IF NOT EXISTS company_size text;
ALTER TABLE raw_contacts ADD COLUMN IF NOT EXISTS planned_event_date date;
```

#### 2. RawContacts.tsx

- Thêm state: `formCompanySize`, `formPlannedEventDate`
- Cập nhật type `RawContact` thêm `company_size`, `planned_event_date`
- Đổi label "Họ tên" → "Người phụ trách" (vẫn lưu vào `full_name`)
- Thêm trường "Quy mô nhân sự" (input text, ví dụ: "50-100 người") — hiện khi Loại = Doanh nghiệp
- Thêm trường "Thời gian tổ chức dự kiến" (date input)
- Cập nhật insertMutation gửi `company_size`, `planned_event_date`
- Cập nhật convertMutation: map `planned_event_date` → `planned_travel_date` khi tạo Lead
- Cập nhật `resetForm` và bảng hiển thị

#### 3. types.ts — Cập nhật raw_contacts type (tự động sau migration)

### Thứ tự
1. Migration (2 cột mới)
2. Cập nhật RawContacts.tsx (form + bảng + convert logic)

