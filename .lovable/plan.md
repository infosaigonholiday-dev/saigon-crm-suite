
Mục tiêu
- Sửa triệt để lỗi đăng nhập xong bị trang trắng, phải F5 mới chạy.

Tôi đã xác định được lỗi chính
1. `src/contexts/AuthContext.tsx` đang `await fetchProfile()` trực tiếp bên trong `supabase.auth.onAuthStateChange(...)`. Đây là pattern dễ gây race/deadlock sau `signInWithPassword`, nhất là khi callback auth lại gọi tiếp query Supabase.
2. App đang phụ thuộc vào timing của `INITIAL_SESSION`, chưa bootstrap phiên bằng `supabase.auth.getSession()` sau khi đăng ký listener.
3. Trong lúc session/role/permissions chưa đồng bộ xong, app có thể render Dashboard/Sidebar/Guard ở trạng thái nửa chừng, dẫn tới trắng trang hoặc trạng thái sai cho đến khi refresh.

Kế hoạch sửa
1. Sửa gốc ở `src/contexts/AuthContext.tsx`
- Tách logic đồng bộ session + profile thành hàm riêng, ví dụ `syncAuthState(session)`.
- Trong `onAuthStateChange`, không `await` nữa; chỉ nhận event rồi gọi `void syncAuthState(...)`.
- Đăng ký listener trước, sau đó gọi `supabase.auth.getSession()` để khôi phục phiên ổn định ngay lần đầu.
- Bọc `fetchProfile` bằng `try/catch/finally`; dù query profile lỗi vẫn phải hạ `loading` để app không treo.
- Thêm cơ chế chống race (request id hoặc cancel flag) để response cũ không ghi đè state mới.

2. Siết lại `src/contexts/PermissionsContext.tsx`
- Không trả permissions rỗng khi auth/profile còn đang khởi tạo.
- Nếu đã có `user` nhưng auth/profile chưa ready thì giữ `loading=true`, chưa kết luận “không có quyền”.
- Chỉ load permission overrides sau khi auth state đã ổn định.

3. Chặn render sớm ở các điểm nhạy cảm
- `src/App.tsx`: chỉ render protected routes khi auth đã ready thật sự.
- `src/pages/Dashboard.tsx`: không chọn loại dashboard khi `userRole` còn chưa resolve xong.
- `src/components/AppSidebar.tsx`: tránh render menu rỗng trong lúc permissions còn loading.

4. Rà query phụ thuộc auth
- `src/hooks/useDashboardData.ts`: giữ hoặc tăng điều kiện `enabled` theo `user`, `userRole`, và trạng thái auth-ready.
- Soát các query dùng `user!.id` / `departmentId` để tránh chạy lúc session vừa đổi.

File dự kiến chỉnh
- `src/contexts/AuthContext.tsx`
- `src/contexts/PermissionsContext.tsx`
- `src/App.tsx`
- `src/pages/Dashboard.tsx`
- `src/components/AppSidebar.tsx`
- Có thể rà thêm `src/hooks/useDashboardData.ts`

Kết quả mong đợi
- Login xong vào app ngay, không cần F5
- Không còn trắng trang do race auth
- Sidebar, dashboard, route guard hiện đúng ngay lần đầu
- Logout/login nhiều lần vẫn ổn định

Kiểm tra sau khi làm
1. Login từ `/login` với ít nhất 1 role admin và 1 role nghiệp vụ
2. Xác nhận vào thẳng dashboard, không trắng trang, không cần refresh
3. Chuyển qua vài module có guard quyền để chắc không còn race
4. Logout rồi login lại nhiều lần liên tiếp để xác nhận hết lỗi

Chi tiết kỹ thuật
- Trọng tâm là bỏ `await` trong `onAuthStateChange` và thêm bootstrap `getSession()`.
- Nếu vẫn giữ callback auth async như hiện tại, lỗi này rất dễ tái phát dù đã “fix” trước đó.
