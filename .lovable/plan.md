# Plan: Fix profile mồ côi + giải thích flow tạo hồ sơ

## 1. Trả lời câu hỏi: Bước nào tạo "hồ sơ thật" trên Supabase?

Khi bấm **"Tạo tài khoản"** ở tab Nhân sự, hệ thống chạy 4 bước theo thứ tự:

```
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1 │ Frontend gọi edge function `manage-employee-accounts` │
│         │ với { action: "create", email, full_name, role, ... } │
├─────────┼───────────────────────────────────────────────────────┤
│  STEP 2 │ ⭐ Edge function gọi auth.admin.createUser()          │
│         │   ➜ Đây là bước TẠO HỒ SƠ THẬT trên Supabase          │
│         │   ➜ Insert 1 row vào auth.users (login identity)      │
│         │   ➜ Sinh ra UUID mới                                  │
├─────────┼───────────────────────────────────────────────────────┤
│  STEP 3 │ Trigger DB `on_auth_user_created` tự động chạy        │
│         │   ➜ INSERT vào public.profiles (id = auth user id)    │
│         │   ➜ Đây là nơi lưu role, department, is_active        │
├─────────┼───────────────────────────────────────────────────────┤
│  STEP 4 │ Edge function UPDATE employees.profile_id = uuid mới  │
│         │   ➜ Link bản ghi nhân sự HR với account login         │
└─────────┴───────────────────────────────────────────────────────┘
```

**Bước "thật" = STEP 2** (`auth.users`). Profile và employee chỉ là layer phụ trỏ về uuid này.

**Lỗi gia bao xảy ra ở STEP 2**: profile mồ côi đang giữ email `operator1.saigonholiday@gmail.com` → trigger STEP 3 fail vì `profiles_email_key` duplicate → toàn bộ transaction rollback → STEP 2 cũng bị xóa → không có gì được tạo.

---

## 2. Số lượng orphan toàn hệ thống (đã quét)

| Loại | Số lượng |
|---|---|
| Profile mồ côi (profile không có auth.users) | **1** — gia bao `765a6b58...` |
| Auth users không có profile | 0 |
| Employees link profile mồ côi | 1 — gia bao SHT-026 |
| Employees chưa có profile_id | 0 |

→ Chỉ cần xử lý đúng 1 case.

---

## 3. Migration cleanup orphan

```sql
-- Xóa 3 notifications của profile mồ côi
DELETE FROM notifications WHERE user_id = '765a6b58-bfa1-4638-874e-c28dae5d17c2';

-- Unlink employee
UPDATE employees SET profile_id = NULL WHERE profile_id = '765a6b58-bfa1-4638-874e-c28dae5d17c2';

-- Xóa profile mồ côi
DELETE FROM profiles WHERE id = '765a6b58-bfa1-4638-874e-c28dae5d17c2';
```

---

## 4. Nâng cấp edge function `manage-employee-accounts` (CHỐNG TÁI DIỄN)

Thêm **PRE-CHECK** trước STEP 2: tự dò profile dangling theo email & cleanup, rồi mới gọi `createUser`. Patch `supabase/functions/manage-employee-accounts/index.ts` action `create`:

```ts
// Trước khi gọi auth.admin.createUser:
const { data: existingProfile } = await adminClient
  .from("profiles").select("id").eq("email", email.toLowerCase()).maybeSingle();

if (existingProfile) {
  const { data: existingAuth } = 
    await adminClient.auth.admin.getUserById(existingProfile.id);
  if (!existingAuth?.user) {
    // Profile mồ côi → tự cleanup
    await adminClient.from("employees").update({ profile_id: null })
      .eq("profile_id", existingProfile.id);
    await adminClient.from("notifications").delete()
      .eq("user_id", existingProfile.id);
    await adminClient.from("profiles").delete().eq("id", existingProfile.id);
  } else {
    return jsonResponse({ error: "Email này đã được đăng ký trong hệ thống" }, 400);
  }
}
```

Deploy ngay sau khi patch.

---

## 5. Tự động retry tạo account cho gia bao

Sau khi cleanup, edge function call `create` cho gia bao bằng `supabase--curl_edge_functions` để xác nhận flow chạy thông. Trả về password mặc định `sgh123456` để anh báo nhân sự.

---

## 6. Verify cuối

```sql
-- Phải có 1 row mới
SELECT id, email FROM auth.users WHERE email = 'operator1.saigonholiday@gmail.com';

-- Profile mới = id auth mới
SELECT id, role, is_active, must_change_password FROM profiles 
WHERE email = 'operator1.saigonholiday@gmail.com';

-- Employee đã link đúng
SELECT employee_code, profile_id FROM employees WHERE employee_code = 'SHT-026';

-- Không còn orphan
SELECT COUNT(*) FROM profiles p 
LEFT JOIN auth.users u ON u.id = p.id WHERE u.id IS NULL;
-- Kết quả mong đợi: 0
```

---

## Tóm tắt 1 dòng

Hồ sơ thật được tạo ở `auth.admin.createUser` (STEP 2). Toàn hệ thống chỉ 1 orphan là gia bao → migration xóa profile mồ côi + nâng cấp edge function tự cleanup orphan tương lai + retry tạo account.
