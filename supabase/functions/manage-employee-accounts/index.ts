import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_ROLES = ["ADMIN", "HCNS", "HR_MANAGER"];
const DEFAULT_PASSWORD = "sgh123456";
const PRODUCTION_URL = "https://app.saigonholiday.vn";
const PUBLISHED_URL = "https://saigon-holiday-nexus.lovable.app";

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function safeRedirectOrigin(rawOrigin: string | null | undefined): string {
  const origin = (rawOrigin || "").replace(/\/+$/, "");
  if (!origin) return PRODUCTION_URL;
  // Không bao giờ gửi link localhost cho user qua email
  if (/localhost|127\.0\.0\.1/i.test(origin)) return PRODUCTION_URL;
  return origin;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawOrigin = req.headers.get("origin") || req.headers.get("referer") || "";
    const resetRedirectUrl = `${safeRedirectOrigin(rawOrigin)}/reset-password`;
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const callerId = userData.user.id;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", callerId)
      .single();

    if (!callerProfile || !ALLOWED_ROLES.includes(callerProfile.role)) {
      return jsonResponse({ error: "Bạn không có quyền thực hiện thao tác này" }, 403);
    }

    const { action, ...payload } = await req.json();

    // ─── CREATE ───
    if (action === "create") {
      const { full_name, email, role, department_id, employee_id } = payload;

      if (!full_name || !email || !role) {
        return jsonResponse({ error: "Vui lòng nhập đầy đủ họ tên, email và quyền" }, 400);
      }

      let createdUserId: string | null = null;

      try {
        const { data: authUser, error: createError } =
          await adminClient.auth.admin.createUser({
            email,
            password: DEFAULT_PASSWORD,
            email_confirm: true,
            user_metadata: { full_name, role },
          });

        if (createError) {
          const msg = createError.message.includes("already been registered")
            ? "Email này đã được đăng ký trong hệ thống"
            : createError.message;
          return jsonResponse({ error: msg }, 400);
        }

        createdUserId = authUser.user.id;

        // Set must_change_password = true for the new profile
        await adminClient
          .from("profiles")
          .update({ must_change_password: true })
          .eq("id", createdUserId);

        if (department_id) {
          const { error: profileError } = await adminClient
            .from("profiles")
            .update({ department_id })
            .eq("id", createdUserId);

          if (profileError) {
            throw new Error("Lỗi cập nhật phòng ban cho profile: " + profileError.message);
          }
        }

        if (employee_id) {
          const { error: linkError } = await adminClient
            .from("employees")
            .update({ profile_id: createdUserId })
            .eq("id", employee_id);

          if (linkError) {
            throw new Error("Lỗi liên kết tài khoản với nhân viên: " + linkError.message);
          }

          await adminClient
            .from("employees")
            .update({ email })
            .eq("id", employee_id)
            .is("email", null);
        }

        return jsonResponse({
          success: true,
          user_id: createdUserId,
          profile_id: createdUserId,
          message: `Tài khoản đã được tạo cho ${email} với mật khẩu mặc định nội bộ. Nhân viên cần đăng nhập lần đầu và đổi mật khẩu mới.`,
        });
      } catch (err) {
        // Cleanup: delete BOTH auth user AND orphan profile
        if (createdUserId) {
          try { await adminClient.from("profiles").delete().eq("id", createdUserId); } catch (_) {}
          try { await adminClient.auth.admin.deleteUser(createdUserId); } catch (_) {}
        }
        return jsonResponse({ error: (err as Error).message || "Lỗi tạo tài khoản" }, 400);
      }
    }

    // ─── DEACTIVATE ───
    if (action === "deactivate") {
      const { user_id } = payload;

      const { data: authCheck } = await adminClient.auth.admin.getUserById(user_id);

      if (authCheck?.user) {
        await adminClient.auth.admin.updateUserById(user_id, { ban_duration: "876000h" });
      }

      await adminClient.from("profiles").update({ is_active: false }).eq("id", user_id);

      return jsonResponse({
        success: true,
        warning: authCheck?.user ? undefined : "Auth user không tồn tại, chỉ vô hiệu hóa profile. Đây là profile mồ côi.",
      });
    }

    // ─── ACTIVATE ───
    if (action === "activate") {
      const { user_id } = payload;
      await adminClient.auth.admin.updateUserById(user_id, { ban_duration: "none" });
      await adminClient.from("profiles").update({ is_active: true, must_change_password: true }).eq("id", user_id);
      return jsonResponse({ success: true });
    }

    // ─── DELETE ACCOUNT ───
    if (action === "delete_account") {
      const { user_id } = payload;

      if (!user_id) {
        return jsonResponse({ error: "Thiếu user_id" }, 400);
      }

      if (user_id === callerId) {
        return jsonResponse({ error: "Không thể xóa tài khoản của chính mình" }, 400);
      }

      // 1. Unlink employee records
      const { error: unlinkError } = await adminClient
        .from("employees")
        .update({ profile_id: null })
        .eq("profile_id", user_id);
      // Ignore error if no employee linked (unlinkError can be null)

      // 2. Delete profile
      const { error: profileDeleteError } = await adminClient
        .from("profiles")
        .delete()
        .eq("id", user_id);

      // 3. Delete auth user (graceful for orphans)
      let authDeleted = false;
      const { data: authCheck } = await adminClient.auth.admin.getUserById(user_id);
      if (authCheck?.user) {
        const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(user_id);
        if (authDeleteError) {
          return jsonResponse({
            error: `Đã xóa profile nhưng lỗi xóa auth user: ${authDeleteError.message}`,
          }, 400);
        }
        authDeleted = true;
      }

      return jsonResponse({
        success: true,
        message: authDeleted
          ? "Đã xóa hoàn toàn tài khoản (auth + profile + unlink nhân viên)"
          : "Đã xóa profile và unlink nhân viên. Auth user không tồn tại (orphan đã dọn).",
        profile_deleted: !profileDeleteError,
        auth_deleted: authDeleted,
        employee_unlinked: !unlinkError,
      });
    }

    // ─── RESET PASSWORD (single) ───
    if (action === "reset_password") {
      const { user_id, email } = payload;
      if (!user_id && !email) {
        return jsonResponse({ error: "Thiếu user_id hoặc email" }, 400);
      }

      const authUser = await findAuthUser(adminClient, user_id, email);

      if (!authUser) {
        return jsonResponse({
          error: "Tài khoản auth không tồn tại cho profile này. Cần xóa profile lỗi hoặc tạo lại tài khoản.",
          orphan: true,
        }, 400);
      }

      const { error: resetError } = await adminClient.auth.admin.updateUserById(authUser, {
        password: DEFAULT_PASSWORD,
      });

      if (resetError) {
        return jsonResponse({ error: resetError.message }, 400);
      }

      await adminClient.from("profiles").update({ must_change_password: true }).eq("id", authUser);

      const targetEmail = email || (await getAuthUserEmail(adminClient, authUser));
      let emailSent = false;
      let emailError: string | null = null;

      if (targetEmail) {
        try {
          const { error: linkErr } = await adminClient.auth.resetPasswordForEmail(
            targetEmail,
            { redirectTo: resetRedirectUrl }
          );
          if (linkErr) {
            emailError = linkErr.message;
          } else {
            emailSent = true;
          }
        } catch (err) {
          emailError = (err as Error).message;
        }
      }

      return jsonResponse({
        success: true,
        email_sent: emailSent,
        email_error: emailError,
        message: emailSent
          ? `Đã reset mật khẩu. Email đặt lại mật khẩu đã được gửi đến ${targetEmail}. Nhân viên dùng link trong email hoặc đăng nhập bằng mật khẩu mặc định để đổi mật khẩu.`
          : `Đã reset mật khẩu về mặc định. ${emailError ? "Lỗi gửi email: " + emailError + ". " : ""}Nhân viên cần đăng nhập bằng mật khẩu mặc định và đổi mật khẩu mới.`,
      });
    }

    // ─── RESET ALL PASSWORDS ───
    if (action === "reset_all_passwords") {
      const { data: allProfiles } = await adminClient
        .from("profiles")
        .select("id, email")
        .neq("id", callerId);

      if (!allProfiles || allProfiles.length === 0) {
        return jsonResponse({ success: true, message: "Không có tài khoản nào để reset", count: 0 });
      }

      const { data: usersData, error: usersError } = await adminClient.auth.admin.listUsers({
        page: 1, perPage: 1000,
      });

      if (usersError) {
        return jsonResponse({ error: usersError.message }, 400);
      }

      const authUserIds = new Set(usersData.users.map((u) => u.id));
      const authUserByEmail = new Map(
        usersData.users.filter((u) => !!u.email).map((u) => [u.email!.toLowerCase(), u.id])
      );

      let resetCount = 0;
      let emailSentCount = 0;
      const errors: string[] = [];
      const skipped: string[] = [];

      for (const profile of allProfiles) {
        let targetUserId: string | null = null;

        if (authUserIds.has(profile.id)) {
          targetUserId = profile.id;
        } else if (profile.email) {
          targetUserId = authUserByEmail.get(profile.email.toLowerCase()) ?? null;
        }

        if (!targetUserId) {
          skipped.push(profile.email ?? profile.id);
          continue;
        }

        const { error: resetErr } = await adminClient.auth.admin.updateUserById(targetUserId, {
          password: DEFAULT_PASSWORD,
        });

        if (resetErr) {
          errors.push(`${profile.email ?? profile.id}: ${resetErr.message}`);
        } else {
          resetCount++;
          await adminClient.from("profiles").update({ must_change_password: true }).eq("id", targetUserId);

          if (profile.email) {
            try {
              const { error: linkErr } = await adminClient.auth.resetPasswordForEmail(
                profile.email,
                { redirectTo: resetRedirectUrl }
              );
              if (!linkErr) emailSentCount++;
            } catch (_) {}
          }
        }
      }

      return jsonResponse({
        success: true,
        message: `Đã reset ${resetCount}/${allProfiles.length} tài khoản. Gửi email recovery: ${emailSentCount}. Nhân viên cần đăng nhập bằng mật khẩu mặc định hoặc dùng link email để đổi mật khẩu.`,
        count: resetCount,
        email_sent_count: emailSentCount,
        errors: errors.length > 0 ? errors : undefined,
        skipped: skipped.length > 0 ? skipped : undefined,
      });
    }

    // ─── UPDATE EMAIL ───
    if (action === "update_email") {
      const { user_id, old_email, new_email } = payload;
      if (!new_email) {
        return jsonResponse({ error: "Thiếu email mới" }, 400);
      }

      const authUserId = await findAuthUser(adminClient, user_id, old_email);
      if (!authUserId) {
        return jsonResponse({ error: "Không tìm thấy tài khoản auth" }, 400);
      }

      const { error: authError } = await adminClient.auth.admin.updateUserById(authUserId, {
        email: new_email,
        email_confirm: true,
      });
      if (authError) {
        return jsonResponse({ error: authError.message }, 400);
      }

      await adminClient.from("profiles").update({ email: new_email }).eq("id", authUserId);

      return jsonResponse({
        success: true,
        message: `Đã đổi email thành ${new_email}. Dùng email mới để đăng nhập và reset mật khẩu.`,
      });
    }

    // ─── CLEANUP ORPHANS ───
    if (action === "cleanup_orphans") {
      const { data: allProfiles } = await adminClient
        .from("profiles")
        .select("id, email, full_name");

      if (!allProfiles || allProfiles.length === 0) {
        return jsonResponse({ success: true, message: "Không có profile nào", cleaned: 0 });
      }

      const { data: usersData, error: usersError } = await adminClient.auth.admin.listUsers({
        page: 1, perPage: 1000,
      });

      if (usersError) {
        return jsonResponse({ error: usersError.message }, 400);
      }

      const authUserIds = new Set(usersData.users.map((u) => u.id));
      const cleaned: string[] = [];

      for (const profile of allProfiles) {
        if (!authUserIds.has(profile.id)) {
          await adminClient.from("profiles").delete().eq("id", profile.id);
          cleaned.push(profile.email ?? profile.id);
        }
      }

      return jsonResponse({
        success: true,
        message: cleaned.length > 0
          ? `Đã dọn dẹp ${cleaned.length} profile lỗi: ${cleaned.join(", ")}`
          : "Không phát hiện profile lỗi nào",
        cleaned: cleaned.length,
        cleaned_emails: cleaned.length > 0 ? cleaned : undefined,
      });
    }

    return jsonResponse({ error: "Invalid action" }, 400);
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});

async function findAuthUser(
  adminClient: ReturnType<typeof createClient>,
  profileId?: string,
  email?: string
): Promise<string | null> {
  if (profileId) {
    const { data } = await adminClient.auth.admin.getUserById(profileId);
    if (data?.user) return data.user.id;
  }

  if (email) {
    const { data: usersData } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (usersData?.users) {
      const matched = usersData.users.find(
        (u) => u.email?.toLowerCase() === String(email).toLowerCase()
      );
      if (matched) return matched.id;
    }
  }

  return null;
}

async function getAuthUserEmail(
  adminClient: ReturnType<typeof createClient>,
  userId: string
): Promise<string | null> {
  const { data } = await adminClient.auth.admin.getUserById(userId);
  return data?.user?.email ?? null;
}
