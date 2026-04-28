# 💼 HƯỚNG DẪN SỬ DỤNG CRM — PHÒNG KINH DOANH (SALE)
**Dành cho: Tất cả nhân viên Sale (Domestic, Outbound, Inbound, MICE)**

---

## Công việc của bạn trên CRM là gì?

Hãy tưởng tượng bạn là một nhân viên Sale. Mỗi ngày bạn sẽ làm những việc sau trên CRM:

1. Mở CRM → Xem **có ai cần gọi lại hôm nay không** (Badge đỏ trên menu "Tiềm năng")
2. Gọi điện cho khách → **Ghi chú lại** cuộc gọi trên hệ thống
3. Khách quan tâm → **Kéo card sang cột "Quan tâm"** trên bảng Kanban
4. Khách muốn báo giá → **Tạo báo giá** gửi qua email/Zalo
5. Khách chốt tour → **Kéo sang "Thành công"** → **Chuyển thành Khách hàng** → **Tạo Đặt tour**
6. Cuối ngày: Xem lại **còn Lead nào chưa xử lý không**

---

## PHẦN 1: KHO DATA — Nơi lưu data thô

### Kho Data là gì?
Đây là nơi lưu **tất cả số điện thoại, email** mà bạn thu thập được từ:
- Sự kiện, hội chợ
- Quảng cáo Facebook/Google
- Danh sách mua từ đối tác
- Người quan tâm trên website

### Cách sử dụng:
1. Vào menu **"Kho Data"** trên sidebar
2. Bấm **"Thêm"** hoặc **"Import Excel"** để nhập data
3. Khi bạn thấy một người có vẻ tiềm năng → Bấm **"Chuyển thành Lead"**

### Tại sao không nhập thẳng vào Lead?
Vì Kho Data giúp bạn **lọc rác** trước. Không phải data nào cũng là khách tiềm năng. Bạn lọc ở đây trước, chọn người thật sự quan tâm rồi mới chuyển thành Lead.

---

## PHẦN 2: TIỀM NĂNG (LEAD) — Trái tim công việc Sale

### Lead là gì?
Lead là một **người có khả năng sẽ mua tour**. Họ có thể đã liên hệ với bạn, hoặc bạn chủ động gọi cho họ.

### Giao diện Kanban — Bảng kéo thả

Khi vào menu **"Tiềm năng"**, bạn sẽ thấy một bảng chia thành **5 cột**, giống như 5 giai đoạn bán hàng:

```
|  MỚI  |  QUAN TÂM  |  ĐANG BÁO GIÁ  |  THÀNH CÔNG  |  KHÔNG TC  |
|-------|-----------|----------------|-------------|-----------|
| Card  | Card      | Card           | Card        | Card      |
| Card  | Card      |                |             |           |
| Card  |           |                |             |           |
```

**Mỗi ô nhỏ (card) là 1 khách tiềm năng.** Trên mỗi card bạn sẽ thấy:
- Tên khách
- Số điện thoại
- Icon nhiệt độ: 🔥 Nóng (rất quan tâm) / 🌤️ Ấm (quan tâm vừa) / ❄️ Lạnh (chưa rõ)
- Lịch hẹn follow-up (nếu có)
- Lần cuối liên hệ (nếu >7 ngày sẽ hiện ⚠️)
- Giá trị dự kiến (ví dụ: 50tr)

### Cách tạo Lead mới
1. Bấm nút **"+ Thêm lead"** ở góc phải
2. Điền thông tin: Tên, SĐT, Email, Nguồn (Facebook/Zalo/Hotline...), Điểm đến, Số khách, Ngân sách
3. Chọn **nhiệt độ**: Nóng/Ấm/Lạnh
4. Đặt **ngày follow-up** (ngày bạn sẽ gọi lại)
5. Bấm **"Tạo"**

### Cách chuyển trạng thái Lead (KHI KHÁCH TIẾN TRIỂN)

**Ví dụ thực tế:** Bạn gọi cho anh Minh, anh Minh nói "Anh quan tâm, gửi profile đi". Bạn cần:

1. **Tìm card "Anh Minh"** trên bảng Kanban
2. **Kéo card** từ cột "Mới" sang cột **"Quan tâm"**
3. Hệ thống sẽ bật ra **popup ghi chú**: Yêu cầu bạn ghi lại nội dung cuộc gọi
   - Ví dụ: "Anh Minh quan tâm tour Phú Quốc 3N2Đ, đi gia đình 4 người, dự kiến tháng 7. Yêu cầu gửi profile resort."
4. Chọn **nhiệt độ mới** (ví dụ: chuyển từ Ấm → Nóng)
5. Bấm **"Xác nhận"**

💡 **Mẹo:** Bạn cũng có thể bấm vào **menu 3 chấm (⋮)** trên card → Chọn trạng thái cụ thể hơn (ví dụ: "Đã gửi profile", "Đã báo giá", "Đàm phán"...)

### Khi khách CHỐT TOUR (Thành công!)

1. Kéo card sang cột **"Thành công"**
2. Ghi chú: Nội dung chốt, giá tour, ngày đi...
3. Hệ thống sẽ hỏi: **"Chuyển Lead này thành Khách hàng luôn không?"**
4. Bấm **"Có"** → Lead tự động trở thành Khách hàng trong mục "Khách hàng"
5. Tiếp theo: Tạo Đặt tour cho khách

### Khi khách KHÔNG MUA (Thất bại)

1. Kéo card sang cột **"Không thành công"**
2. Popup bật ra yêu cầu chọn lý do:
   - Giá cao
   - Đã đặt nơi khác
   - Hoãn kế hoạch
   - Không liên lạc được
   - Khác
3. Ghi thêm chi tiết nếu cần
4. Bấm "Xác nhận"

ℹ️ **Lý do thất bại rất quan trọng** — Giúp công ty biết tại sao mất khách để cải thiện.

### Bộ lọc & Tìm kiếm

Phía trên bảng Kanban có thanh lọc:
- **Ô tìm kiếm:** Gõ tên hoặc SĐT → Tìm nhanh
- **Lọc theo nhiệt độ:** Chỉ xem Lead Nóng / Ấm / Lạnh
- **Lọc theo NV phụ trách:** GDKD dùng để xem Lead của từng Sale

### Hệ thống tự động nhắc nhở bạn

Bạn **KHÔNG CẦN nhớ** phải gọi ai. Hệ thống tự nhắc:

- **Badge đỏ trên sidebar:** Số Lead cần follow-up hôm nay
- **Thông báo chuông:** "📞 Follow-up hôm nay: Anh Minh"
- **Nếu bạn quên >7 ngày:** Hệ thống gửi "⚠️ Lead bị bỏ quên: Anh Minh - 8 ngày không liên hệ"
- **Nếu bạn quên >14 ngày:** Hệ thống gửi thêm cho **Trưởng phòng** để nhắc bạn

### Chế độ xem Bảng (Table)

Nếu bạn không thích kéo thả, bấm nút **"Bảng"** ở góc phải (cạnh nút "Kanban") để xem dạng danh sách — giống Excel, dễ rà soát số lượng lớn.

---

## PHẦN 3: KHÁCH HÀNG — Sau khi chốt tour

### Khách hàng khác Lead ở chỗ nào?
- **Lead** = Người **có thể** mua tour (đang chăm sóc)
- **Khách hàng** = Người **đã từng** mua tour hoặc đã chốt

### Cách xem chi tiết Khách hàng
1. Vào menu **"Khách hàng"**
2. Bấm vào tên khách → Trang chi tiết hiện ra với:
   - Thông tin cá nhân (tên, SĐT, email, ngày sinh)
   - Lịch sử booking (các tour đã đặt)
   - Ghi chú nội bộ (bạn và đồng nghiệp có thể ghi chú, tag nhau bằng @tên)

### 2 loại Khách hàng
- **Cá nhân (B2C):** Anh Minh, Chị Lan...
- **Doanh nghiệp (B2B):** Công ty ABC, Tập đoàn XYZ... (có thêm: Tên công ty, MST, Người liên hệ)

### Sinh nhật Khách hàng
Hệ thống tự động gửi thông báo cho bạn **trước 3 ngày** khi KH có sinh nhật → Bạn gửi lời chúc + offer ưu đãi.

---

## PHẦN 4: BÁO GIÁ → ĐẶT TOUR → HỢP ĐỒNG → THANH TOÁN

Sau khi khách quan tâm, luồng tiếp theo là:

### 4.1 Tạo Báo giá
1. Vào menu **"Báo giá"** → Bấm **"Tạo báo giá"**
2. Chọn khách hàng → Nhập chi tiết tour, giá, điều kiện
3. Gửi báo giá cho khách qua email/Zalo
4. **Nếu khách không phản hồi >5 ngày** → Hệ thống nhắc bạn

### 4.2 Tạo Đặt tour (Booking)
1. Khi khách đồng ý giá → Vào **"Đặt tour"** → **"Tạo booking"**
2. Nhập: Khách hàng, Gói tour, Ngày đi, Số khách, Giá
3. Booking sẽ hiện trên danh sách để phòng Điều hành phân công HDV

### 4.3 Hợp đồng
1. Tạo hợp đồng từ booking → In hoặc gửi email cho khách ký
2. Hệ thống theo dõi trạng thái: Nháp → Đã ký → Hoàn thành

### 4.4 Thanh toán
1. Theo dõi khách đã cọc chưa, còn nợ bao nhiêu
2. **Cảnh báo tự động:** Hạn cọc sắp đến (3 ngày), Thanh toán quá hạn

---

## PHẦN 5: PHIẾU CHI — Khi bạn cần chi tiền

**Ví dụ:** Bạn cần chi 500.000đ tiền gửi xe tháng này.

1. Vào menu **"Tài chính"**
2. Bấm **"Lập phiếu"** hoặc **"Nhập chi phí"**
3. Chọn: Loại = Chi, Nhóm = Gửi xe, Số tiền = 500.000
4. Nhập nội dung: "Tiền gửi xe tháng 4/2026"
5. Chọn người nhận tiền (gõ tên → hệ thống tự gợi ý từ danh bạ)
6. Bấm **"Gửi duyệt"**

**Sau khi bấm Gửi:**
- Phiếu tự động chuyển lên **Trưởng phòng** của bạn để duyệt
- Trưởng phòng duyệt xong → Phiếu chuyển lên **Kế toán**
- Kế toán duyệt xong → Phiếu chuyển lên **CEO** để chi
- CEO duyệt → Bạn nhận tiền

💡 Nếu phiếu **bị từ chối** → Bạn sẽ thấy lý do và có thể sửa rồi gửi lại.

---

## PHẦN 6: XEM PHIẾU LƯƠNG

1. Vào menu **"Bảng lương"**
2. Chọn tháng/năm
3. Bạn chỉ thấy phiếu lương **của chính mình** (không ai khác thấy)
4. Phiếu chỉ hiện khi CEO đã duyệt (nếu chưa có = đang trong quá trình tính)
5. Chi tiết: Lương cứng, Lương KPI, Hoa hồng, OT, Phụ cấp, BHXH, Thuế, Thực nhận

---

## TÓM TẮT: MỖI NGÀY BẠN CẦN LÀM GÌ?

| Thời điểm | Việc cần làm | Ở đâu trên CRM |
|-----------|-------------|-----------------|
| **Sáng (8h)** | Xem có Lead nào cần gọi hôm nay | Menu "Tiềm năng" (xem badge đỏ) |
| **Trong ngày** | Gọi khách → Ghi chú → Kéo card | Bảng Kanban Tiềm năng |
| **Khi khách chốt** | Chuyển Lead → KH → Tạo Booking | Tiềm năng → Khách hàng → Đặt tour |
| **Khi cần chi tiền** | Tạo Phiếu chi | Menu "Tài chính" |
| **Cuối ngày** | Kiểm tra thông báo, xem còn gì chưa xử lý | Chuông 🔔 + Cảnh báo ⚠️ |
| **Cuối tháng** | Xem phiếu lương | Menu "Bảng lương" |
