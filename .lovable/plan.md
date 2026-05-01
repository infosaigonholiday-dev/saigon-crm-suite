# Fix B2B Tours List — Ẩn/đánh dấu tour đã hết hạn

## Bối cảnh
Trong `LKH Tour 2026` (`src/pages/B2BTours.tsx`), tour có ngày khởi hành đã qua hoặc visa hết hạn vẫn hiển thị → Sale có thể quote nhầm. Cần thêm filter trạng thái + badge cảnh báo + disable booking cho tour đã khởi hành.

**Lưu ý dữ liệu**: cột `departure_date` và `visa_deadline` trong `b2b_tours` là **text dạng `dd/MM/yyyy`** (không phải ISO date). Vì vậy không thể filter ở Supabase bằng `.gte()` — phải parse và filter ở client sau khi fetch.

## Thay đổi
Chỉ sửa 1 file: `src/pages/B2BTours.tsx`. Không đụng các module khác, không xóa data.

### 1. Helper parse ngày `dd/MM/yyyy`
Thêm hàm `parseVnDate(s: string | null): Date | null` (return `null` nếu rỗng/sai format).
Thêm `today` = `new Date()` reset về 00:00 để so sánh ngày.

### 2. Tính trạng thái mỗi tour
Cho mỗi tour:
- `departed = parseVnDate(departure_date) < today`
- `visaExpired = visa_deadline && parseVnDate(visa_deadline) < today`
- `expired = departed || visaExpired` (dùng cho filter "Còn hạn / Đã hết hạn")

### 3. State filter mode + persist localStorage
- Thêm state `expiryFilter: "active" | "expired" | "all"`, default `"active"`.
- Khởi tạo từ `localStorage.getItem("b2b_tours_expiry_filter")` (fallback `"active"`).
- `useEffect` ghi lại vào localStorage khi đổi.
- Khi đổi filter → reset `page = 0`.

### 4. Cách filter — chuyển sang client-side
Vì 3 cột date là text `dd/MM/yyyy`, không filter được ở Postgres. Giải pháp:
- Bỏ `range()` server-side cho query chính, lấy đầy đủ tour theo các filter còn lại (market/dest/month/search) — bảng b2b_tours hiện không lớn (vài trăm dòng).
- Sau khi fetch, filter theo `expiryFilter` ở client, rồi tự phân trang client-side `PAGE_SIZE = 20`.
- Bỏ luôn query `b2b-tours-count` riêng, dùng `filteredTours.length` để tính `totalPages`.

(Nếu sau này dữ liệu lớn lên thì tách cột `departure_date_iso` ở DB; phạm vi task này không đụng DB.)

### 5. UI dropdown filter
Thêm 1 `Select` ở hàng filter (đổi grid từ `md:grid-cols-4` → `md:grid-cols-5`):
- "Còn hạn" (default) / "Đã hết hạn" / "Tất cả"

### 6. Badges trên từng dòng
- Cột **Ngày đi**: nếu `departed` → thêm `<Badge variant="secondary" className="bg-gray-200 text-gray-700">ĐÃ KHỞI HÀNH</Badge>` cạnh ngày.
- Cột **Hạn Visa**: nếu `visaExpired` → đổi badge hiện tại thành đỏ `bg-red-50 text-red-700 border-red-200` với text `VISA HẾT HẠN` (kèm ngày).

### 7. Nút Booking
- Nếu `departed` → `<Button disabled>` bọc trong `Tooltip` với content `"Tour đã hết hạn, không thể tạo booking"`.
- Nếu chỉ `visaExpired` (departure còn) → vẫn click được (chỉ cảnh báo qua badge).
- Cần wrap disabled button trong `<span>` để Tooltip hoạt động (Radix yêu cầu).

## Test (sẽ chạy & paste kết quả)
- TC1: default load → chỉ tour `departure_date >= today` AND visa OK.
- TC2: chọn "Tất cả" → hiện hết, badge đúng.
- TC3: tour visa hết hạn, departure còn → badge đỏ "VISA HẾT HẠN", Booking vẫn click được.
- TC4: tour đã khởi hành → badge xám "ĐÃ KHỞI HÀNH", Booking disabled + tooltip.
- TC5: đổi filter sang "Tất cả", reload trang → vẫn ở "Tất cả" (localStorage).
- Verify SQL: confirm hôm nay 01/05/2026 các tour `OS5N5D-260430-03` (01/05 00:05) bị ẩn ở "Còn hạn"; `LG5N4D-260512-01` (visa 06/05) vẫn hiện vì visa chưa qua; v.v.

## Không làm
- Không thay đổi schema `b2b_tours`.
- Không sửa `B2BTourDetailSheet`, `Quotations`, `Bookings`.
- Không xóa data hết hạn.
