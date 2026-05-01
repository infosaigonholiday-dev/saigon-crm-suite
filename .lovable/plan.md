# Anti-Regression Guards — Reset Password Flow

Mục tiêu: bọc kiến trúc reset password mới (edge function `send-recovery-email` + Resend + `verifyOtp(token_hash)`) bằng 4 lớp bảo vệ. **Không sửa logic đang chạy** — chỉ ADD guards.

---

## 1. Cập nhật `AUTH_CONFIG.md` (mục #7)

Thêm section **mới** ở đầu mục #7 (giữ nguyên 7.1 / 7.2 phía dưới):

```
### ⚠️ KIẾN TRÚC RESET PASSWORD — DO NOT MODIFY

Sprint 02/05/2026: chuyển hoàn toàn sang Resend + edge function tự custom,
KHÔNG còn dùng Supabase Auth Email flow cho recovery. Lý do: Supabase Free
plan không cho dùng Auth Hook reliably + iOS cross-device fail với PKCE.

❌ TUYỆT ĐỐI KHÔNG:
- Gọi `supabase.auth.resetPasswordForEmail()` ở Login.tsx (hoặc bất kỳ đâu)
- Bật "Send email hook" trong Supabase Dashboard → Auth → Hooks
- Sửa Email Template "Reset Password" trong Supabase Dashboard
- Dùng `exchangeCodeForSession()` trong ResetPassword.tsx
- Set `flowType: 'pkce'` cho recovery flow (PKCE chỉ dùng cho login)
- Dùng link dạng `https://<ref>.supabase.co/auth/v1/verify?token=pkce_...`

✅ PHẢI:
- Login.tsx → `supabase.functions.invoke('send-recovery-email', { body: { email } })`
- ResetPassword.tsx → `supabase.auth.verifyOtp({ token_hash, type: 'recovery' })`
- Email gửi từ Resend, From: `Saigon Holiday CRM <noreply@saigonholiday.vn>`
- Link format: `https://app.saigonholiday.vn/reset-password?token_hash=<hash>&type=recovery`

Vi phạm sẽ bị chặn bởi: ESLint rule (`eslint.config.js`),
Playwright e2e (`tests/auth/reset-password.spec.ts`), và edge function
`check-auth-health` (chạy thủ công khi nghi ngờ regression).
```

---

## 2. ESLint guards (`eslint.config.js`)

Thêm 1 block override **chỉ áp dụng cho `Login.tsx` + `ResetPassword.tsx`** (giữ nguyên rule `localhost` global hiện có):

```js
{
  files: ["src/pages/Login.tsx", "src/pages/ResetPassword.tsx"],
  rules: {
    "no-restricted-syntax": [
      "error",
      // giữ rule localhost cũ
      {
        selector: "Literal[value=/localhost:[0-9]+/]",
        message: "Không hardcode localhost — dùng getAppBaseUrl()",
      },
      {
        selector: "MemberExpression[property.name='resetPasswordForEmail']",
        message: "Recovery dùng supabase.functions.invoke('send-recovery-email') — xem AUTH_CONFIG.md mục #7",
      },
      {
        selector: "MemberExpression[property.name='exchangeCodeForSession']",
        message: "Recovery dùng verifyOtp(token_hash) — xem AUTH_CONFIG.md mục #7",
      },
      {
        selector: "Property[key.name='flowType'][value.value='pkce']",
        message: "Recovery KHÔNG dùng PKCE — xem AUTH_CONFIG.md mục #7",
      },
    ],
  },
},
```

Rule `localhost` global vẫn giữ ở block trước đó cho phần còn lại của codebase.

---

## 3. Playwright e2e (`tests/auth/reset-password.spec.ts` — NEW)

3 test case (chạy headless trên Preview URL):

```ts
import { test, expect } from "@playwright/test";

const APP = "https://id-preview--1632605d-2e2c-4155-8254-0b9de359ce51.lovable.app";

test.describe("Reset password — anti-regression", () => {
  test("TC1: forgot password gọi send-recovery-email, KHÔNG gọi /auth/v1/recover", async ({ page }) => {
    const calls: string[] = [];
    page.on("request", (r) => calls.push(r.url()));

    await page.goto(`${APP}/login?forgot=1`);
    await page.getByLabel(/email/i).first().fill("qa-guard@example.com");
    await page.getByRole("button", { name: /gửi|reset|đặt lại/i }).click();
    await page.waitForTimeout(2000);

    expect(calls.some((u) => u.includes("/functions/v1/send-recovery-email"))).toBe(true);
    expect(calls.some((u) => u.includes("/auth/v1/recover"))).toBe(false);
    expect(calls.some((u) => u.includes("/auth/v1/otp"))).toBe(false);
  });

  test("TC2: ResetPassword.tsx source KHÔNG chứa exchangeCodeForSession", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile("src/pages/ResetPassword.tsx", "utf8");
    expect(src).not.toMatch(/exchangeCodeForSession/);
    expect(src).toMatch(/verifyOtp/);
  });

  test("TC3: Login.tsx source KHÔNG chứa resetPasswordForEmail", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile("src/pages/Login.tsx", "utf8");
    expect(src).not.toMatch(/resetPasswordForEmail/);
    expect(src).toMatch(/send-recovery-email/);
  });
});
```

Lưu ý: TC2/TC3 thay thế cho yêu cầu "verify URL phải có domain app.saigonholiday.vn" và "Console phải log [reset-password] verifyOtp" — vì cả 2 đòi hỏi inbox email thật + click link cross-device, không thể tự động hoá trong CI. Dùng source-grep + network-assert đạt cùng mục đích regression-guard.

---

## 4. Edge function `check-auth-health` (NEW)

`supabase/functions/check-auth-health/index.ts` — CORS, `verify_jwt = false`, GET only. Trả về JSON status:

```json
{
  "ok": true,
  "checks": {
    "send_recovery_email_deployed": true,
    "send_recovery_email_responds_200": true,
    "resend_api_key_present": true,
    "service_role_key_present": true,
    "from_email": "Saigon Holiday CRM <noreply@saigonholiday.vn>",
    "app_base_url": "https://app.saigonholiday.vn"
  },
  "warnings": []
}
```

Logic:
1. Check env: `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` có set không.
2. Tự gọi `${SUPABASE_URL}/functions/v1/send-recovery-email` với email test `healthcheck@saigonholiday.vn` → kỳ vọng status 200 (rate-limit hoặc generateLink-error vẫn trả 200 theo design).
3. Trả về JSON tổng hợp + warnings nếu có check fail.

Không tự verify "hook list empty" vì Supabase Management API yêu cầu PAT — out of scope. Thay vào đó: warning text nhắc admin kiểm tra Dashboard manual khi gọi endpoint.

Add vào `supabase/config.toml`:
```toml
[functions.check-auth-health]
verify_jwt = false
```

---

## 5. Verify (sẽ paste bằng chứng thực tế trong response sau khi build)

| # | Lệnh | Kỳ vọng |
|---|---|---|
| V1 | `grep "DO NOT MODIFY" AUTH_CONFIG.md` | Có match |
| V2 | `bun run lint` (code hiện tại) | 0 error |
| V3 | Tạm thêm `supabase.auth.resetPasswordForEmail("x")` vào Login.tsx → `bun run lint` | Báo error đỏ, revert ngay |
| V4 | `bunx playwright test tests/auth/reset-password.spec.ts` | 3/3 pass |
| V5 | `curl https://aneazkhnqkkpqtcxunqd.supabase.co/functions/v1/check-auth-health` | JSON `ok: true` |

---

## Files thay đổi

- **Sửa**: `AUTH_CONFIG.md` (thêm section DO NOT MODIFY ở đầu mục #7)
- **Sửa**: `eslint.config.js` (thêm block override cho 2 file)
- **Sửa**: `supabase/config.toml` (thêm `[functions.check-auth-health]`)
- **Tạo mới**: `tests/auth/reset-password.spec.ts`
- **Tạo mới**: `supabase/functions/check-auth-health/index.ts`

## KHÔNG đụng

- `supabase/functions/send-recovery-email/index.ts`
- `src/pages/ResetPassword.tsx`
- `src/pages/Login.tsx` (logic — chỉ ESLint cover)
- `src/integrations/supabase/client.ts` (giữ `flowType: 'pkce'` cho login)

Confirm "OK build" để em chuyển sang default mode và thực thi + paste evidence.
