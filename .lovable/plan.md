

# Fix lỗi `.catch()` trong Edge Function

## Vấn đề
Dòng 128-129 dùng `.catch(() => {})` trên Supabase query builder. Trong Deno, kết quả trả về không phải Promise thuần nên không có `.catch()`. Lỗi này sẽ **lặp lại mỗi lần** cleanup được gọi (khi tạo tài khoản thất bại ở bước sau).

## Cách sửa
Thay `.catch(() => {})` bằng `try/catch` block:

**File**: `supabase/functions/manage-employee-accounts/index.ts` (dòng 127-130)

Từ:
```ts
if (createdUserId) {
  await adminClient.from("profiles").delete().eq("id", createdUserId).catch(() => {});
  await adminClient.auth.admin.deleteUser(createdUserId).catch(() => {});
}
```

Thành:
```ts
if (createdUserId) {
  try { await adminClient.from("profiles").delete().eq("id", createdUserId); } catch (_) {}
  try { await adminClient.auth.admin.deleteUser(createdUserId); } catch (_) {}
}
```

## Trả lời câu hỏi
Sau khi fix, lỗi này **không bao giờ lặp lại** nữa. Đây là lỗi cú pháp 1 lần, sửa xong là xong vĩnh viễn.

## Tổng: sửa 2 dòng trong 1 file, deploy lại edge function

