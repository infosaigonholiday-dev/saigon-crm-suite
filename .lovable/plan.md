## Tách quyền bật thông báo khỏi quyền Cài đặt quản trị

### Vấn đề
Hiện tại hệ thống dùng `settings.view` để mở trang `/cai-dat` và hiển thị nút **Cài đặt** trong sidebar.

Hậu quả:
- Muốn cho thực tập sinh bật Web Push thì phải cấp `settings.view`
- Nhưng `settings.view` cũng đồng thời mở luôn trang **Cài đặt** và tab **Quyền hạn**
- Điều này không đúng yêu cầu: thực tập sinh chỉ cần vào chỗ bật thông báo, không phải được mở toàn bộ khu vực cài đặt

### Sẽ sửa

#### 1) Tạo điểm vào riêng cho thông báo thiết bị
**File:** `src/pages/NotificationSettings.tsx` (mới)

Tạo 1 trang riêng, chỉ chứa:
- tiêu đề đơn giản kiểu “Thông báo trên thiết bị này”
- mô tả bật riêng trên từng thiết bị
- component `<PushNotificationToggle />`

Trang này là nơi duy nhất dành cho user phổ thông / thực tập sinh bật Web Push.

#### 2) Thêm route riêng không phụ thuộc `settings.view`
**File:** `src/App.tsx`

Thêm route mới, ví dụ:
- `/thong-bao`

Route này không dùng `PermissionGuard module="settings" action="view"`.
Thay vào đó, cho mọi user đã đăng nhập truy cập được.

#### 3) Thêm menu riêng “Thông báo” trên sidebar
**File:** `src/components/AppSidebar.tsx`

Tách **Thông báo** khỏi nhóm **Cài đặt**:
- thêm item sidebar riêng: `/thong-bao`
- item này không gắn `moduleKey: "settings"`
- vẫn giữ **Cài đặt** cho nhóm role quản trị / trưởng phòng như hiện tại

Kết quả:
- thực tập sinh thấy nút **Thông báo**
- không cần thấy nút **Cài đặt**

#### 4) Thu hẹp lại quyền `settings.view` của INTERN
**Files:**
- `src/hooks/usePermissions.ts`
- migration mới cho DB function `get_default_permissions_for_role`

Gỡ lại `settings.view` khỏi toàn bộ role `INTERN_*` để tránh mở nhầm khu vực quản trị.

Đồng bộ client + DB theo rule memory `Client Server Sync`.

#### 5) Giữ tab “Thông báo” bên trong Cài đặt cho role quản trị
**File:** `src/pages/Settings.tsx`

Không bỏ tab hiện tại cho Admin/HR/Manager nếu vẫn muốn họ bật ngay trong Cài đặt.
Nhưng phần cho user thường sẽ đi qua route `/thong-bao` riêng.

Nếu cần gọn hơn, có thể đổi tab trong Cài đặt thành bản tái sử dụng chung cùng nội dung với trang mới để tránh lặp UI.

#### 6) Cập nhật hướng dẫn sử dụng
**File:** `src/pages/UserGuide.tsx`

Đổi các bước hiện tại từ:
- `Cài đặt → Tab "Thông báo"`

thành:
- `Vào mục "Thông báo" ở menu bên trái`

để đúng cho cả thực tập sinh và toàn bộ user thường.

### Kết quả sau khi sửa
- Thực tập sinh có thể bật thông báo
- Thực tập sinh **không** được mở khu vực Cài đặt quản trị
- Admin/HR vẫn giữ nguyên trang Cài đặt và các tab quản trị
- Hướng dẫn sử dụng khớp với luồng thực tế

### Technical details
- `settings.view` sẽ quay về đúng nghĩa: quyền vào khu vực quản trị Settings
- trang `/thong-bao` là trang riêng cho self-service notification setup
- sidebar sẽ có 2 entry độc lập:
  - `Cài đặt` → cần `settings.view`
  - `Thông báo` → chỉ cần đăng nhập
- migration DB bắt buộc để loại lại `settings.view` khỏi các role INTERN trong `get_default_permissions_for_role`

### Test
1. Đăng nhập bằng INTERN → sidebar có **Thông báo**, không có **Cài đặt**
2. Vào `/thong-bao` → bật toggle thành công
3. INTERN vào `/cai-dat` trực tiếp → bị chặn như cũ
4. Đăng nhập bằng ADMIN → vẫn thấy cả **Cài đặt** và **Thông báo**
5. User Guide hiển thị đúng đường dẫn mới cho mọi phòng ban