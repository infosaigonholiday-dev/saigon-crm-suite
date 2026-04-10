
Mình đã check kỹ rồi: lỗi chính không nằm ở nút dropdown, mà ở database trigger nên bấm đổi trạng thái nào cũng có thể “đéo được”.

### Kết luận nguyên nhân
- UI hiện tại đã có dropdown đổi trạng thái ở:
  - `src/pages/Leads.tsx`
  - `src/components/leads/LeadDetailDialog.tsx`
- Request `PATCH /rest/v1/leads?...` thực tế có chạy.
- Nhưng Supabase trả `400` với lỗi:
  `new row for relation "audit_logs" violates check constraint "audit_logs_action_check"`
- Trigger `log_leads_changes()` đang ghi `action = 'STATUS_CHANGE'`, nhưng constraint của bảng `audit_logs` không chấp nhận giá trị này.
- Vì vậy:
  - đổi sang `WON` fail
  - kéo thả cũng fail
  - nên nút `→ KH` không hiện vì lead chưa đổi được sang `WON`

### Fix cần làm
#### 1. Sửa database trước
Tạo migration cập nhật constraint/check của `audit_logs` để cho phép ít nhất:
- `STATUS_CHANGE`
- `REASSIGN`
- giữ các action cũ như `CREATE`, `UPDATE`, `DELETE`

Nếu constraint đang hardcode danh sách cũ thì cần:
- drop constraint cũ
- add lại constraint mới đúng với trigger hiện tại

#### 2. Tăng độ rõ lỗi ở frontend
Trong `Leads.tsx` và `LeadDetailDialog.tsx`:
- thêm `onError` cho `updateStatus.mutate(...)`
- show toast lỗi rõ ràng từ `err.message`
- tránh cảm giác “bấm không có gì xảy ra”

#### 3. Đồng bộ state sau khi đổi trạng thái
Trong `LeadDetailDialog.tsx`:
- hiện đang mutate theo `lead.id` nhưng UI dialog dùng prop `lead` cũ
- cần cập nhật `selectedLead` local hoặc refetch/detail-sync sau khi status đổi thành công
- để badge trạng thái, nút `Chuyển thành KH`, và link customer phản ánh ngay

Trong `Leads.tsx`:
- sau khi đổi sang `WON` thành công, mở `ConvertToCustomerDialog` bằng dữ liệu lead đã merge status mới
- tránh phụ thuộc object cũ đang còn `status = NEW`

#### 4. Verify luồng sau fix
Kiểm tra đủ 4 case:
- đổi trạng thái thường từ dropdown trên Kanban
- đổi trạng thái trong Lead detail
- đổi sang `LOST` mở popup lý do rồi lưu được
- đổi sang `NURTURE` / `DORMANT` mở popup ngày gọi lại rồi lưu được
- đổi sang `WON` xong hiện/trigger `Chuyển thành KH`
- bấm `→ KH` tạo customer thành công và cập nhật `converted_customer_id`

### File dự kiến đụng tới
- `supabase/migrations/...sql`  
  Sửa constraint `audit_logs_action_check`
- `src/pages/Leads.tsx`  
  Bổ sung error handling + sync dữ liệu sau đổi trạng thái
- `src/components/leads/LeadDetailDialog.tsx`  
  Bổ sung error handling + cập nhật trạng thái hiển thị ngay sau mutate

### Ghi chú kỹ thuật
```text
Hiện tại:
UI dropdown -> PATCH leads.status
               -> trigger log_leads_changes()
               -> insert audit_logs(action='STATUS_CHANGE')
               -> audit_logs_action_check reject
               -> PATCH fail 400

Nghĩa là:
Không phải nút không chạy
Mà là backend reject nên toàn bộ flow đứng ở bước update status
```
