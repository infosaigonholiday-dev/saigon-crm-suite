

## Cập nhật hướng dẫn sử dụng cho các phòng ban + bổ sung mục bật thông báo Web Push

### Vấn đề phát hiện khi rà soát

Trang `Cài đặt → tab Tài khoản` hiện chứa toggle Web Push, **NHƯNG** tab này chỉ hiện cho 4 role: `ADMIN`, `SUPER_ADMIN`, `HR_MANAGER`, `HCNS` (xem `Settings.tsx` dòng 18 — `ACCOUNT_MANAGER_ROLES`).

→ Sale, Intern, Ops, Kế toán, Marketing, HDV, GDKD/Manager **không vào được tab Tài khoản** → không có chỗ bật thông báo. Đây là lỗi UX cần sửa song song khi viết hướng dẫn.

### Sẽ sửa

#### 1. Tách toggle Web Push ra một section riêng ai cũng truy cập được

**File:** `src/pages/Settings.tsx`

Thêm một tab mới **"Thông báo"** (value: `notifications`) hiển thị cho **mọi user** có `settings.view`. Tab này chỉ chứa duy nhất `<PushNotificationToggle/>` + ghi chú ngắn "Cần bật riêng trên mỗi thiết bị". Đặt tab ngay sau "Tài khoản" trong danh sách.

```tsx
const showNotifications = true; // mọi role có settings.view đều thấy
// ...
showNotifications && { value: "notifications", label: "Thông báo" },
// ...
{showNotifications && (
  <TabsContent value="notifications" className="mt-4">
    <div className="space-y-2">
      <h3 className="text-base font-semibold">Thông báo trên thiết bị này</h3>
      <p className="text-sm text-muted-foreground">
        Bật để nhận thông báo (giống Zalo) khi được tag, có lead cần follow-up,
        sinh nhật khách hàng. Phải bật riêng trên TỪNG thiết bị (laptop, điện thoại).
      </p>
      <PushNotificationToggle />
    </div>
  </TabsContent>
)}
```

Đồng thời giữ nguyên `<PushNotificationToggle/>` trong `SettingsAccountsTab` (Admin/HR vẫn thấy ở 2 chỗ — không sao, tiện hơn).

#### 2. Bổ sung workflow "Bật thông báo Web Push" vào TẤT CẢ 8 phòng ban

**File:** `src/pages/UserGuide.tsx`

Tạo 1 component dùng chung và chèn vào cuối mỗi `Guide` function (Admin, HCNS, Ops, SalesMgr, Sales, Intern, Ketoan, Mkt/Hdv):

```tsx
function PushNotifGuide() {
  return (
    <Workflow title="🔔 Bật thông báo trên thiết bị (BẮT BUỘC)" icon={null} steps={[
      "Vào Cài đặt → Tab 'Thông báo'",
      "Gạt công tắc 'Thông báo Web Push' sang BẬT",
      "Trình duyệt hỏi → Chọn 'Cho phép' (Allow)",
      "Lặp lại trên MỌI thiết bị bạn dùng (laptop công ty, laptop cá nhân, điện thoại)",
      "Trên iPhone: phải 'Thêm vào màn hình chính' (Share → Add to Home Screen) rồi mở từ icon đó mới bật được",
      "Nếu đang xem trong iframe editor (lovable.dev) → nhấn 'Mở tab mới' trước khi bật",
      "Lưu ý: nếu trình duyệt báo 'Đã chặn' → mở 🔒 cạnh thanh địa chỉ → đổi Notifications thành 'Cho phép' → tải lại trang",
    ]} />
  );
}
```

Sau đó chèn `<PushNotifGuide />` vào cuối `<CardContent>` của 8 component: `AdminGuide`, `HCNSGuide`, `OpsGuide`, `SalesMgrGuide`, `SalesGuide`, `InternGuide`, `KetoanGuide`, `MktHdvGuide` (chèn trong cả 2 section "Marketing" và "Hướng dẫn viên").

#### 3. Cập nhật memory

**File:** `mem://docs/departmental-manuals` — bổ sung 1 dòng:
> Mỗi guide có thêm mục "Bật thông báo Web Push" vì cần bật riêng trên từng thiết bị, là yêu cầu bắt buộc cho mọi vai trò.

### KHÔNG làm trong scope này
- Không tái xuất 7 file PDF trong `/mnt/documents/` (nếu cần xuất bản lại bản PDF, hỏi sau)
- Không đổi logic phân quyền của tab "Tài khoản" hiện tại — chỉ thêm tab mới "Thông báo" công khai cho mọi user

### Test sau khi apply
1. Đăng nhập bằng SALE → Cài đặt → thấy 2 tab: "Quyền hạn" + "Thông báo" → bật toggle thành công
2. Đăng nhập bằng ADMIN → Cài đặt → vẫn đủ tab cũ + tab "Thông báo" mới
3. Vào Hướng dẫn sử dụng → mỗi tab phòng ban đều có mục 🔔 cuối cùng

