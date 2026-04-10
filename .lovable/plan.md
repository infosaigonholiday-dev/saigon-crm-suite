

## Kế hoạch Fix toàn diện luồng Kho Data → Tiềm năng → Khách hàng (7 FIX)

Đây là bản tổng hợp 7 fix, sẽ được triển khai tuần tự.

---

### FIX 1: Chuyển đổi Raw → Lead mượt hơn

**Hiện trạng**: Nút "Chuyển Lead" gọi trực tiếp `convertMutation` không có dialog xác nhận, không cho bổ sung thông tin, không kiểm tra trùng, không redirect.

**Thay đổi** — `src/pages/RawContacts.tsx`:
- Thêm dialog xác nhận khi nhấn "Chuyển Lead" với preview data + form bổ sung (destination_interest, priority/temperature, estimated_pax, notes)
- Kiểm tra trùng SĐT trong bảng leads trước khi chuyển, hiện cảnh báo nếu trùng
- Mapping đầy đủ: company_address, contact_person, contact_position, channel = source || 'COLD_CALL', notes nối
- Sau chuyển: redirect đến `/tiem-nang` + toast
- Row đã chuyển: hiện badge "Đã chuyển Lead", disable nút Gọi/Sửa, hiện link "Xem Lead →"

### FIX 2: Sửa thông tin Lead trong chi tiết

**Hiện trạng**: LeadDetailDialog đã có nút "Sửa" mở LeadFormDialog với editData. Tuy nhiên form edit hoạt động qua dialog riêng, chưa có inline edit theo section.

**Thay đổi** — `src/components/leads/LeadDetailDialog.tsx`:
- Giữ nguyên cơ chế hiện tại (nút Sửa → mở LeadFormDialog)
- Bổ sung hiển thị đầy đủ: NV phụ trách (tên), phòng ban, ngày tạo, người tạo, lần LH cuối, số lần LH
- Thêm section "Thông tin meta" ở cuối tab info
- Permission check chi tiết hơn: ADMIN sửa tất cả, GDKD/MANAGER sửa phòng mình, SALE chỉ sửa lead mình được giao hoặc tạo

### FIX 3: Lịch sử chăm sóc

**Hiện trạng**: ✅ Đã triển khai đầy đủ — bảng `lead_care_history` tồn tại, CareHistoryTab + CareHistoryFormDialog hoạt động, trigger `update_lead_from_care` tự động cập nhật lead.

**Thay đổi**: Không cần thay đổi lớn, chỉ cải thiện badge màu theo yêu cầu (xanh lá cho kết quả tích cực, cam cho trung tính, đỏ cho tiêu cực, xám cho KBM/Bận).

### FIX 4: Lead → Khách hàng

**Hiện trạng**: `convertToCustomer` mutation tồn tại nhưng chỉ hoạt động khi status = WON, không có dialog xác nhận, không cho bổ sung ghi chú.

**Thay đổi** — `src/pages/Leads.tsx` + tạo component mới `ConvertToCustomerDialog.tsx`:
- Tạo dialog xác nhận với preview thông tin + input ghi chú thêm
- Cho phép chuyển khi status IN ('WON', 'NEGOTIATING', 'QUOTE_SENT')
- Mapping đầy đủ: tax_code, company_size, destination/destination_interest → tour_interest
- Cập nhật `converted_customer_id` trên lead
- Redirect đến `/khach-hang/:id`
- Lead đã chuyển: ẩn nút, hiện badge "Đã chuyển KH"

### FIX 5: Liên kết ngược Customer → Lead

**Hiện trạng**: `CustomerDetail.tsx` đã có section "Nguồn gốc" query leads WHERE converted_customer_id = customer.id. Tuy nhiên link chỉ dẫn đến `/tiem-nang` (không đến lead cụ thể), thiếu thông tin contact_count và thời gian chăm sóc.

**Thay đổi** — `src/pages/CustomerDetail.tsx`:
- Bổ sung query thêm contact_count, status từ lead
- Hiển thị: số lần chăm sóc, thời gian từ tạo lead đến chuyển đổi
- Link chính xác hơn (vì không có route `/tiem-nang/:id`, sẽ thêm thông tin tốt hơn)

**Thay đổi** — `src/components/leads/LeadDetailDialog.tsx`:
- Nếu lead có converted_customer_id: hiện link "Xem KH →" dẫn đến `/khach-hang/:id`

### FIX 6: Kanban liên kết chi tiết

**Hiện trạng**: Card Kanban click → mở dialog chi tiết (LeadDetailDialog). Card hiện tên, SĐT, destination, channel, pax, budget. Thiếu: tên công ty, NV phụ trách, số lần LH. Chưa có bộ lọc.

**Thay đổi** — `src/pages/Leads.tsx`:
- Kanban card: thêm company_name, assigned_profile_name, contact_count
- Card WON đã chuyển KH: hiện badge "Đã chuyển" thay nút
- Thêm bộ lọc phía trên Kanban: NV phụ trách, temperature, khoảng thời gian, tìm kiếm text
- Giữ click → mở dialog (phù hợp UX hơn navigate vì không có route riêng cho lead detail)

### FIX 7: Đồng bộ lịch sử Kho Data + Lead

**Thay đổi** — `src/components/leads/CareHistoryTab.tsx`:
- Query thêm `raw_contacts` WHERE `converted_lead_id = leadId`
- Nếu có raw_contact gốc: hiển thị lịch sử gọi từ Kho Data ở cuối timeline, đánh dấu "Từ Kho Data"
- Header hiện tổng lần liên hệ = raw call_count + lead contact_count

---

### Tổng kết file thay đổi

| File | Fix |
|------|-----|
| `src/pages/RawContacts.tsx` | FIX 1 |
| `src/components/leads/LeadDetailDialog.tsx` | FIX 2, 5 |
| `src/components/leads/CareHistoryTab.tsx` | FIX 3, 7 |
| `src/components/leads/ConvertToCustomerDialog.tsx` (mới) | FIX 4 |
| `src/pages/Leads.tsx` | FIX 4, 6 |
| `src/pages/CustomerDetail.tsx` | FIX 5 |

Không cần migration SQL — tất cả bảng và cột đã có sẵn.

