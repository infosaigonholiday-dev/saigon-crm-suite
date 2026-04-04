

# Fix trang trắng sau khi đăng nhập

## Nguyên nhân gốc

Khi đăng nhập, `AuthContext` gọi `setSession(newSession)` TRƯỚC khi fetch role xong. Điều này khiến `PermissionsContext` thấy `user` có nhưng `userRole` = null → load permissions rỗng → trang trắng.

Luồng lỗi:
```text
SIGNED_IN → setSession(session) → React render
                                    ↓
                          PermissionsContext thấy user nhưng userRole=null
                          → permissions = rỗng, loading=false
                          → PermissionGuard → trang trắng
                                    ↓
                          fetchRole xong → setUserRole("ADMIN")
                          → PermissionsContext load lại nhưng đã muộn
```

## Cách fix

Sửa `src/contexts/AuthContext.tsx`:

1. Trong handler `SIGNED_IN`: fetch role TRƯỚC, rồi mới set cả session + role cùng lúc (batch update)
2. Thêm trạng thái `loading=true` khi đang xử lý SIGNED_IN để PermissionsContext không chạy sớm
3. Tương tự cho `INITIAL_SESSION`

Thay đổi cụ thể:
- Đổi thứ tự: fetch role trước, sau đó gọi `setSession` + `setUserRole` liên tiếp (React 18 auto-batches)
- Đảm bảo `loading` vẫn `true` cho đến khi cả session + role đều sẵn sàng

## File cần sửa

| File | Thay đổi |
|------|----------|
| `src/contexts/AuthContext.tsx` | Fetch role trước khi setSession trong SIGNED_IN và INITIAL_SESSION |

## Kết quả
- Đăng nhập xong hiện Dashboard ngay, không cần reload
- PermissionsContext chỉ chạy khi cả user + role đều sẵn sàng

