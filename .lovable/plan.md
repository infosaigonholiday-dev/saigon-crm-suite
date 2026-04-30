1. Sửa triệt để dialog cập nhật trạng thái Lead
- Kiểm tra và cập nhật `LeadStatusChangeDialog.tsx` để đảm bảo payload insert vào `lead_care_history` luôn có `result` hợp lệ ở mọi nhánh submit.
- Bổ sung log/debug tạm thời nếu cần để xác nhận payload runtime thực sự chứa `result` trước khi gửi Supabase.
- Đối chiếu schema DB hiện tại để tránh lệch kiểu hoặc giá trị không khớp `care_result_check`.
- Rà thêm các luồng khác có thể ghi `lead_care_history` để chắc không còn đường nào gây lỗi tương tự.

2. Ép preview dùng bundle mới cho trang Cảnh báo
- Cập nhật `AlertsCenter.tsx` theo cách tạo thay đổi hiển thị rõ ràng ở phần tabs/tab list để buộc preview rebuild và tránh trạng thái bundle cũ.
- Giữ nguyên logic tab mặc định `all`, đảm bảo 4 tab: Tất cả, Khẩn cấp, Tài chính, Vận hành.
- Kiểm tra route `/canh-bao` và component render để xác nhận không có component trùng hoặc route sai.

3. Test thực tế sau khi sửa
- Dùng preview để mở dialog Lead, đổi status theo kịch bản user nêu và xác nhận không còn toast lỗi constraint.
- Query DB để paste record mới nhất trong `lead_care_history`, gồm tối thiểu: `id, result, note, contact_method, created_at`.
- Mở `/canh-bao`, chụp screenshot thể hiện tab “Tất cả” xuất hiện mặc định.
- Nếu có notification mẫu phù hợp, test click card để kiểm tra mark-as-read + navigate.

4. Báo cáo kết quả đúng format user yêu cầu
- Paste kết quả test thực tế.
- Paste query result thật từ DB.
- Đính kèm screenshot/tab evidence cho Alerts Center.

Chi tiết kỹ thuật
- File chính: `src/components/leads/LeadStatusChangeDialog.tsx`, `src/pages/AlertsCenter.tsx`
- Có thể rà thêm: `src/pages/Leads.tsx`, `src/components/leads/CareHistoryFormDialog.tsx`
- DB đã xác nhận hiện tại: `lead_care_history.result` là `NOT NULL`, default `'NO_ANSWER'`.
- Hiện code đọc được đã có UI cho `Kết quả liên hệ`, nhưng lỗi user gửi cho thấy preview đang không phản ánh đúng bundle/runtime hiện tại; cần sửa và rebuild để kiểm chứng bằng test thật.