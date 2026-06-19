// Edge Function: cc-check-in-alert
// -----------------------------------------------------------------------------
// Chạy lúc 8:15 ICT qua cron `jibble-sync-815am` (sau khi sync xong 1 phút).
//
// Nhiệm vụ:
//   1. Đếm NV active hôm nay chưa có In event (sau 8:00 + buffer 15p = 8:15 ICT)
//   2. Nếu có ≥ 1 NV thiếu In → push OneSignal cho HR (HR_MANAGER + HR_INTERN)
//   3. Ghi log notification để HR xem lại
//
// Endpoint: POST /functions/v1/cc-check-in-alert
// Auth: X-Cron-Secret header (cron) hoặc Bearer JWT user (role ADMIN/SUPER_ADMIN/HR_MANAGER)
// -----------------------------------------------------------------------------

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const startedAt = new Date();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // 1) Auth: cron OR HR/admin user
  const cronSecret = Deno.env.get("CRON_SECRET")?.trim();
  const sentCronSecret = req.headers.get("X-Cron-Secret")?.trim();
  const isCron = !!cronSecret && sentCronSecret === cronSecret;

  const authHeader = req.headers.get("Authorization");
  if (!isCron) {
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
    }
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (claimsErr || !claims?.claims) return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
    const userId = claims.claims.sub as string;
    const { data: profile } = await admin.from("profiles").select("role, is_active").eq("id", userId).maybeSingle();
    const allowed = ["ADMIN", "SUPER_ADMIN", "HR_MANAGER"];
    if (!profile?.is_active || !allowed.includes(profile.role)) {
      return jsonResponse({ ok: false, error: "Forbidden" }, 403);
    }
  }

  try {
    // 2) Tính "hôm nay" theo ICT (UTC+7)
    const nowVN = new Date(Date.now() + 7 * 3600 * 1000);
    const todayVN = nowVN.toISOString().slice(0, 10);
    const dowVN = nowVN.getUTCDay(); // 0=CN, 6=T7
    const isWeekend = dowVN === 0 || dowVN === 6;

    // Skip weekend
    if (isWeekend) {
      return jsonResponse({ ok: true, skipped: "weekend", today: todayVN });
    }

    // 3) Lấy DS NV active có employee_code (chỉ NV chính thức/part-time)
    const { data: employees, error: empErr } = await admin
      .from("employees")
      .select("id, full_name, employee_code")
      .in("status", ["ACTIVE", "INTERN", "PROBATION"])
      .is("deleted_at", null);
    if (empErr) throw empErr;
    if (!employees || employees.length === 0) {
      return jsonResponse({ ok: true, skipped: "no_active_employees" });
    }

    // 4) Lấy DS NV đã có In event hôm nay
    const { data: inEvents, error: evErr } = await admin
      .from("cc_su_kien")
      .select("employee_id")
      .eq("belongs_to_date", todayVN)
      .eq("loai", "In")
      .eq("active", true);
    if (evErr) throw evErr;

    const checkedInIds = new Set((inEvents ?? []).map((e: any) => e.employee_id));
    const missing = employees.filter(e => !checkedInIds.has(e.id));

    console.log(`[cc-check-in-alert] today=${todayVN} total=${employees.length} checked_in=${checkedInIds.size} missing=${missing.length}`);

    if (missing.length === 0) {
      return jsonResponse({
        ok: true,
        today: todayVN,
        total: employees.length,
        checked_in: checkedInIds.size,
        missing: 0,
        alerts_sent: 0,
        duration_ms: Date.now() - startedAt.getTime(),
      });
    }

    // 5) Tìm HR users để push thông báo
    const { data: hrUsers, error: hrErr } = await admin
      .from("profiles")
      .select("id, full_name, role")
      .eq("is_active", true)
      .in("role", ["HR_MANAGER", "HR_INTERN"]);
    if (hrErr) throw hrErr;

    const title = `[Chấm công] ${missing.length} NV chưa chấm vào lúc 8:15`;
    const message = `Hôm nay ${todayVN} có ${missing.length}/${employees.length} nhân viên chưa có In trên Jibble. Xem chi tiết tại trang Chấm công.`;
    const targetUrl = `/cham-cong?from=${todayVN}&to=${todayVN}`;

    // 6) Gọi send-notification cho từng HR
    const onesignalAppId = Deno.env.get("ONESIGNAL_APP_ID");
    const onesignalKey = Deno.env.get("ONESIGNAL_REST_API_KEY");
    let alertsSent = 0;
    const errors: string[] = [];

    for (const hr of hrUsers ?? []) {
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            user_id: hr.id,
            title,
            message,
            url: targetUrl,
          }),
        });
        if (res.ok) alertsSent++;
        else {
          const t = await res.text();
          errors.push(`${hr.full_name}: ${res.status} ${t.slice(0, 100)}`);
        }
      } catch (e: any) {
        errors.push(`${hr.full_name}: ${e.message}`);
      }
    }

    // 7) Ghi notification vào DB để HR xem lại trong app (mỗi HR 1 row)
    const notificationRows = (hrUsers ?? []).map(hr => ({
      user_id: hr.id,
      type: "CC_MISSING_CHECKIN",
      title,
      message,
      priority: "high",
      action_required: true,
      action_url: targetUrl,
      is_pinned: false,
      is_archived: false,
    }));
    if (notificationRows.length > 0) {
      await admin.from("notifications").insert(notificationRows);
    }

    return jsonResponse({
      ok: true,
      today: todayVN,
      total: employees.length,
      checked_in: checkedInIds.size,
      missing: missing.length,
      missing_list: missing.slice(0, 20).map(m => m.employee_code),
      hr_notified: (hrUsers ?? []).length,
      alerts_sent: alertsSent,
      errors: errors.length > 0 ? errors : undefined,
      duration_ms: Date.now() - startedAt.getTime(),
    });
  } catch (e: any) {
    console.error(`[cc-check-in-alert] error: ${e.message}`);
    return jsonResponse({ ok: false, error: e.message }, 500);
  }
});
