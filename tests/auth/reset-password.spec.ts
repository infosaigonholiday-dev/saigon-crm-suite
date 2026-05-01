import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Anti-regression guards cho Reset Password flow.
 * Xem AUTH_CONFIG.md mục #7 — DO NOT MODIFY.
 */

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

test.describe("Reset password — anti-regression guards", () => {
  test("TC1: Login.tsx source dùng send-recovery-email, KHÔNG dùng resetPasswordForEmail", async () => {
    const src = await readFile(path.join(PROJECT_ROOT, "src/pages/Login.tsx"), "utf8");
    expect(src, "Login.tsx phải gọi edge function send-recovery-email").toMatch(/send-recovery-email/);
    expect(src, "Login.tsx KHÔNG được dùng resetPasswordForEmail (xem AUTH_CONFIG.md mục #7)").not.toMatch(/resetPasswordForEmail/);
  });

  test("TC2: ResetPassword.tsx source dùng verifyOtp, KHÔNG dùng exchangeCodeForSession", async () => {
    const src = await readFile(path.join(PROJECT_ROOT, "src/pages/ResetPassword.tsx"), "utf8");
    expect(src, "ResetPassword.tsx phải dùng verifyOtp").toMatch(/verifyOtp/);
    expect(src, "ResetPassword.tsx KHÔNG được dùng exchangeCodeForSession (xem AUTH_CONFIG.md mục #7)").not.toMatch(/exchangeCodeForSession/);
  });

  test("TC3: send-recovery-email edge function dùng đúng From và link format", async () => {
    const src = await readFile(
      path.join(PROJECT_ROOT, "supabase/functions/send-recovery-email/index.ts"),
      "utf8",
    );
    expect(src).toMatch(/noreply@saigonholiday\.vn/);
    expect(src).toMatch(/app\.saigonholiday\.vn\/reset-password/);
    expect(src).toMatch(/token_hash=/);
    expect(src).toMatch(/type=recovery/);
  });
});
