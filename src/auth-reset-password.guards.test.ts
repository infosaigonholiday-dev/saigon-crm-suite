import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Anti-regression guards cho Reset Password flow.
 * Xem AUTH_CONFIG.md mục #7 — DO NOT MODIFY.
 *
 * Lưu ý: chạy được trong vitest (không cần browser). E2E network/console
 * checks không tự động hoá được vì cần inbox email thật + iOS device thật;
 * thay bằng source-grep + ESLint guards (đã enforce) + edge function
 * `check-auth-health` (gọi thủ công).
 */

const ROOT = process.cwd();

describe("Reset password — anti-regression guards", () => {
  it("TC1: Login.tsx dùng send-recovery-email, KHÔNG dùng resetPasswordForEmail", () => {
    const src = readFileSync(path.join(ROOT, "src/pages/Login.tsx"), "utf8");
    expect(src).toMatch(/send-recovery-email/);
    expect(src).not.toMatch(/resetPasswordForEmail/);
  });

  it("TC2: ResetPassword.tsx dùng verifyOtp, KHÔNG dùng exchangeCodeForSession", () => {
    const src = readFileSync(path.join(ROOT, "src/pages/ResetPassword.tsx"), "utf8");
    expect(src).toMatch(/verifyOtp/);
    expect(src).not.toMatch(/exchangeCodeForSession/);
  });

  it("TC3: send-recovery-email dùng đúng From + link app.saigonholiday.vn + token_hash", () => {
    const src = readFileSync(
      path.join(ROOT, "supabase/functions/send-recovery-email/index.ts"),
      "utf8",
    );
    expect(src).toMatch(/noreply@saigonholiday\.vn/);
    expect(src).toMatch(/app\.saigonholiday\.vn\/reset-password/);
    expect(src).toMatch(/token_hash=/);
    expect(src).toMatch(/type=recovery/);
  });
});
