

## Báo cáo lỗi từ hôm qua đến nay

### Đã kiểm tra
| Hạng mục | Trạng thái |
|---|---|
| Migration `notes_read` RLS (10:40) | ✅ Đã apply, function `get_profile_is_active` tồn tại |
| Migration `push_subscriptions` (15:33 hôm qua) | ✅ Apply chuẩn, RLS đầy đủ |
| Cột "Ngày tạo" — Kho Data | ✅ Render đúng, `colSpan` 11/12 chính xác |
| Cột "Ngày tạo" — Tiềm năng | ✅ Render đúng, `colSpan` 10/11 chính xác |
| Nút 💬 ghi chú trong Kho Data | ✅ Có ở cả nhánh isConverted và chưa convert |
| Bảng `internal_notes` | ⚠️ Hiện đang rỗng (0 record) → không có badge số là đúng, không phải lỗi |

### Lỗi thực tế còn tồn tại (1 lỗi)

**React warning ở console** (đang hiện liên tục khi vào trang Cài đặt):
```
Warning: Function components cannot be given refs.
Check the render method of `SettingsAccountsTab`.
  at Badge (badge.tsx:37)
```

**Nguyên nhân:** `src/components/ui/badge.tsx` định nghĩa `Badge` là function component thường (không dùng `React.forwardRef`). Khi React/Radix nội bộ truyền `ref` vào (qua các wrapper như `<TableCell>` với key reconciliation, hoặc tương lai khi dùng trong Tooltip/Dropdown `asChild`), sẽ trigger warning này.

**Tác động:**
- Hiện tại: chỉ là dev warning, không vỡ UI
- Tương lai: nếu bọc `<Badge>` trong `<Tooltip asChild>` hoặc `<DropdownMenuTrigger asChild>` sẽ vỡ tooltip/dropdown
- Spam log → khó đọc log thật khi debug

### Sẽ sửa

**File:** `src/components/ui/badge.tsx`

Đổi `Badge` thành `React.forwardRef`:
```tsx
const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <div ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />
  )
);
Badge.displayName = "Badge";
```

Đây là pattern chuẩn shadcn/ui (giống `Button`, `Card`, `Input`). Không phá API hiện có — mọi chỗ dùng `<Badge>` vẫn hoạt động bình thường, chỉ thêm khả năng nhận `ref`.

### Không cần sửa
- Không có lỗi DB nào
- Không có lỗi RLS  
- Không có lỗi network (toàn bộ HEAD `/internal_notes` đều 200)
- Web Push toggle vẫn vướng cảnh báo iframe của browser — đã xử lý ở phần code, chỉ cần user mở app ở tab mới (đã có nút "Mở tab mới")

### Test sau khi sửa
1. Vào Cài đặt → tab Tài khoản → console **không còn warning** "Function components cannot be given refs"
2. Mọi `<Badge>` ở các trang khác (Lead, Kho Data, Khách hàng) vẫn hiển thị y nguyên

