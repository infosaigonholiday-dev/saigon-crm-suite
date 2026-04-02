import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_ROLES = ["ADMIN", "HCNS", "HR_MANAGER"];
const DEFAULT_PASSWORD = "sgh123456";

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
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

        try {
          await adminClient.auth.admin.generateLink({ type: "recovery", email });
        } catch (_linkErr) {
          // Non-critical
        }

        return jsonResponse({
          success: true,
          user_id: createdUserId,
          message: `Tài khoản đã được tạo cho ${email}. Email đặt mật khẩu đã được gửi tự động.`,
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
      await adminClient.auth.admin.updateUserById(user_id, { ban_duration: "876000h" });
      await adminClient.from("profiles").update({ is_active: false }).eq("id", user_id);
      return jsonResponse({ success: true });
    }

    // ─── ACTIVATE ───
    if (action === "activate") {
      const { user_id } = payload;
      await adminClient.auth.admin.updateUserById(user_id, { ban_duration: "none" });
      await adminClient.from("profiles").update({ is_active: true }).eq("id", user_id);
      return jsonResponse({ success: true });
    }

    // ─── RESET PASSWORD (single) ───
    if (action === "reset_password") {
      const { user_id, email } = payload;
      if (!user_id && !email) {
        return jsonResponse({ error: "Thiếu user_id hoặc email" }, 400);
      }

      // Try to find auth user
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

      return jsonResponse({
        success: true,
        message: "Đã reset mật khẩu về mặc định. Nhân viên cần dùng chức năng Quên mật khẩu để đặt lại.",
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

      // Build auth user lookup
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
      const errors: string[] = [];
      const skipped: string[] = [];

      for (const profile of allProfiles) {
        // Check if auth user exists for this profile
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
        }
      }

      return jsonResponse({
        success: true,
        message: `Đã reset ${resetCount}/${allProfiles.length} tài khoản. Nhân viên cần dùng Quên mật khẩu để đặt lại.`,
        count: resetCount,
        errors: errors.length > 0 ? errors : undefined,
        skipped: skipped.length > 0 ? skipped : undefined,
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
          // Orphan detected — delete profile
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

/** Find an auth user by profile ID or email. Returns auth user ID or null. */
async function findAuthUser(
  adminClient: ReturnType<typeof createClient>,
  profileId?: string,
  email?: string
): Promise<string | null> {
  if (profileId) {
    // Try direct lookup
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
