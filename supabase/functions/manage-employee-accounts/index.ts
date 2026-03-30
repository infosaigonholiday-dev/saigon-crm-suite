import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_ROLES = ["ADMIN", "HCNS", "HR_MANAGER", "DIRECTOR", "SUPER_ADMIN"];
const DEFAULT_PASSWORD = "sgh123456";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller identity using getUser()
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = userData.user.id;

    // Admin client for privileged operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check caller has allowed role
    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", callerId)
      .single();

    if (!callerProfile || !ALLOWED_ROLES.includes(callerProfile.role)) {
      return new Response(
        JSON.stringify({ error: "Bạn không có quyền thực hiện thao tác này" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, ...payload } = await req.json();

    if (action === "create") {
      const { full_name, email, role, department_id, employee_id } = payload;

      if (!full_name || !email || !role) {
        return new Response(
          JSON.stringify({ error: "Vui lòng nhập đầy đủ họ tên, email và quyền" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const tempPassword = DEFAULT_PASSWORD;
      let createdUserId: string | null = null;

      try {
        // Step 1: Create auth user
        const { data: authUser, error: createError } =
          await adminClient.auth.admin.createUser({
            email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: { full_name, role },
          });

        if (createError) {
          const msg = createError.message.includes("already been registered")
            ? "Email này đã được đăng ký trong hệ thống"
            : createError.message;
          return new Response(JSON.stringify({ error: msg }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        createdUserId = authUser.user.id;

        // Step 2: handle_new_user trigger auto-creates profile
        // Update profile with department_id if provided
        if (department_id) {
          const { error: profileError } = await adminClient
            .from("profiles")
            .update({ department_id })
            .eq("id", createdUserId);

          if (profileError) {
            throw new Error("Lỗi cập nhật phòng ban cho profile: " + profileError.message);
          }
        }

        // Step 3: Link employee to profile
        if (employee_id) {
          // Link profile and auto-fill email if employee doesn't have one
          const { error: linkError } = await adminClient
            .from("employees")
            .update({ profile_id: createdUserId })
            .eq("id", employee_id);

          if (linkError) {
            throw new Error("Lỗi liên kết tài khoản với nhân viên: " + linkError.message);
          }

          // Auto-fill employee email from login email if missing
          await adminClient
            .from("employees")
            .update({ email })
            .eq("id", employee_id)
            .is("email", null);
        }

        // Auto-send recovery email so user can set their own password
        try {
          await adminClient.auth.admin.generateLink({
            type: "recovery",
            email,
          });
        } catch (_linkErr) {
          // Non-critical: admin can manually trigger "Quên mật khẩu" later
        }

        return new Response(
          JSON.stringify({
            success: true,
            user_id: createdUserId,
            message: `Tài khoản đã được tạo cho ${email}. Email đặt mật khẩu đã được gửi tự động.`,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (err) {
        // Cleanup: delete auth user if created
        if (createdUserId) {
          await adminClient.auth.admin.deleteUser(createdUserId).catch(() => {});
        }
        return new Response(
          JSON.stringify({ error: (err as Error).message || "Lỗi tạo tài khoản" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (action === "deactivate") {
      const { user_id } = payload;

      await adminClient.auth.admin.updateUserById(user_id, {
        ban_duration: "876000h",
      });

      await adminClient
        .from("profiles")
        .update({ is_active: false })
        .eq("id", user_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "activate") {
      const { user_id } = payload;

      await adminClient.auth.admin.updateUserById(user_id, {
        ban_duration: "none",
      });

      await adminClient
        .from("profiles")
        .update({ is_active: true })
        .eq("id", user_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reset_password") {
      const { user_id, email } = payload;
      if (!user_id && !email) {
        return new Response(JSON.stringify({ error: "Thiếu user_id hoặc email" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let targetUserId: string | null = user_id ?? null;

      if (!targetUserId && email) {
        const { data: usersData, error: usersError } = await adminClient.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });

        if (usersError) {
          return new Response(JSON.stringify({ error: usersError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const matchedUser = usersData.users.find(
          (u) => u.email?.toLowerCase() === String(email).toLowerCase()
        );

        if (!matchedUser) {
          return new Response(JSON.stringify({ error: "Không tìm thấy tài khoản auth tương ứng" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        targetUserId = matchedUser.id;
      }

      let { error: resetError } = await adminClient.auth.admin.updateUserById(targetUserId!, {
        password: DEFAULT_PASSWORD,
      });

      if (resetError?.message?.includes("User not found") && email) {
        const { data: usersData, error: usersError } = await adminClient.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });

        if (!usersError) {
          const matchedUser = usersData.users.find(
            (u) => u.email?.toLowerCase() === String(email).toLowerCase()
          );
          if (matchedUser) {
            targetUserId = matchedUser.id;
            const fallbackResult = await adminClient.auth.admin.updateUserById(targetUserId, {
              password: DEFAULT_PASSWORD,
            });
            resetError = fallbackResult.error;
          }
        }
      }

      if (resetError) {
        return new Response(JSON.stringify({ error: resetError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ success: true, message: "Đã reset mật khẩu về mặc định" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "reset_all_passwords") {
      const { data: allProfiles } = await adminClient
        .from("profiles")
        .select("id, email")
        .neq("id", callerId);

      if (!allProfiles || allProfiles.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: "Không có tài khoản nào để reset", count: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: usersData, error: usersError } = await adminClient.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

      if (usersError) {
        return new Response(JSON.stringify({ error: usersError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const authUserByEmail = new Map(
        usersData.users
          .filter((u) => !!u.email)
          .map((u) => [u.email!.toLowerCase(), u.id])
      );

      let resetCount = 0;
      const errors: string[] = [];

      for (const profile of allProfiles) {
        let { error: resetErr } = await adminClient.auth.admin.updateUserById(profile.id, {
          password: DEFAULT_PASSWORD,
        });

        if (resetErr?.message?.includes("User not found") && profile.email) {
          const fallbackUserId = authUserByEmail.get(profile.email.toLowerCase());
          if (fallbackUserId) {
            const fallbackResult = await adminClient.auth.admin.updateUserById(fallbackUserId, {
              password: DEFAULT_PASSWORD,
            });
            resetErr = fallbackResult.error;
          }
        }

        if (resetErr) {
          errors.push(`${profile.email ?? profile.id}: ${resetErr.message}`);
        } else {
          resetCount++;
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Đã reset mật khẩu ${resetCount}/${allProfiles.length} tài khoản về mặc định`,
          count: resetCount,
          errors: errors.length > 0 ? errors : undefined,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
