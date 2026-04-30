// Edge Function: broadcast-notification
// Quy tắc:
//   1. Validate quyền + payload → trả 4xx CỤ THỂ (mỗi case có code + error message rõ)
//   2. Insert broadcast_messages (history)
//   3. Bulk insert notifications cho TẤT CẢ allowedIds (CRITICAL)
//   4. Best-effort push qua send-notification, KHÔNG rollback nếu fail.
//   5. Ghi notification_delivery_logs (try/catch).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_SENDER_ROLES = ["ADMIN", "SUPER_ADMIN", "GDKD", "MANAGER", "HCNS", "HR_MANAGER"];

interface BroadcastPayload {
  title: string;
  message: string;
  priority?: "low" | "medium" | "high" | "critical";
  url?: string;
  target_user_ids: string[];
  target_filter?: Record<string, unknown>;
}

function json(body: unknown, status = 200) {
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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) return json({ ok: false, code: "AUTH_MISSING", error: "Thiếu token đăng nhập" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      return json({ ok: false, code: "AUTH_INVALID", error: "Phiên đăng nhập đã hết hạn — vui lòng đăng nhập lại" }, 401);
    }
    const senderId = userData.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: senderProfile, error: pErr } = await admin
      .from("profiles")
      .select("id, role, department_id, is_active, full_name")
      .eq("id", senderId)
      .maybeSingle();
    if (pErr) return json({ ok: false, code: "PROFILE_ERROR", error: `Không đọc được profile: ${pErr.message}` }, 500);
    if (!senderProfile) return json({ ok: false, code: "PROFILE_NOT_FOUND", error: "Tài khoản không tồn tại trong hệ thống" }, 403);
    if (!senderProfile.is_active) return json({ ok: false, code: "PROFILE_INACTIVE", error: "Tài khoản đã bị vô hiệu hoá" }, 403);
    if (!ALLOWED_SENDER_ROLES.includes(senderProfile.role)) {
      return json({
        ok: false,
        code: "FORBIDDEN_ROLE",
        error: `Vai trò "${senderProfile.role}" không có quyền gửi thông báo broadcast. Chỉ ADMIN/GDKD/MANAGER/HCNS/HR_MANAGER được phép.`,
      }, 403);
    }

    let payload: BroadcastPayload;
    try {
      payload = await req.json();
    } catch {
      return json({ ok: false, code: "INVALID_JSON", error: "Body request không phải JSON hợp lệ" }, 400);
    }

    const title = (payload.title || "").trim();
    const message = (payload.message || "").trim();
    const priority = payload.priority || "medium";
    const url = (payload.url && payload.url.trim().length > 1 ? payload.url.trim() : "/canh-bao");
    const targetIds = Array.isArray(payload.target_user_ids)
      ? Array.from(new Set(payload.target_user_ids.filter((x) => typeof x === "string" && x.length > 0)))
      : [];

    if (!title) return json({ ok: false, code: "MISSING_TITLE", error: "Thiếu tiêu đề thông báo" }, 400);
    if (title.length > 120) return json({ ok: false, code: "TITLE_TOO_LONG", error: "Tiêu đề > 120 ký tự" }, 400);
    if (!message) return json({ ok: false, code: "MISSING_MESSAGE", error: "Thiếu nội dung thông báo" }, 400);
    if (message.length > 500) return json({ ok: false, code: "MESSAGE_TOO_LONG", error: "Nội dung > 500 ký tự" }, 400);
    if (!["low", "medium", "high", "critical"].includes(priority))
      return json({ ok: false, code: "INVALID_PRIORITY", error: "Mức độ phải là low/medium/high/critical" }, 400);
    if (targetIds.length === 0)
      return json({ ok: false, code: "NO_RECIPIENTS", error: "Vui lòng chọn ít nhất 1 người nhận" }, 400);
    if (targetIds.length > 500)
      return json({ ok: false, code: "TOO_MANY_RECIPIENTS", error: "Tối đa 500 người/lần gửi" }, 400);

    if ((priority === "high" || priority === "critical") &&
        (url === "/" || url === "#" || url.length <= 1)) {
      return json({
        ok: false,
        code: "URL_REQUIRED_FOR_HIGH_PRIORITY",
        error: "Thông báo Cao/Khẩn bắt buộc URL điều hướng hợp lệ (không được '/', '#' hoặc trống)",
      }, 400);
    }

    // Server-side scope check
    let scopeQuery = admin
      .from("profiles")
      .select("id, role, department_id")
      .in("id", targetIds)
      .eq("is_active", true);

    if (senderProfile.role === "GDKD") {
      scopeQuery = scopeQuery.in("role", [
        "GDKD", "SALE_OUTBOUND", "SALE_DOMESTIC", "SALE_MICE",
        "INTERN_SALE_OUTBOUND", "INTERN_SALE_DOMESTIC", "INTERN_SALE_MICE",
      ]);
    } else if (senderProfile.role === "MANAGER") {
      if (!senderProfile.department_id) {
        return json({ ok: false, code: "MANAGER_NO_DEPT", error: "Tài khoản MANAGER chưa được gán phòng ban" }, 403);
      }
      scopeQuery = scopeQuery.eq("department_id", senderProfile.department_id);
    }

    const { data: allowedRows, error: scopeErr } = await scopeQuery;
    if (scopeErr) return json({ ok: false, code: "SCOPE_QUERY_ERROR", error: scopeErr.message }, 500);
    const allowedIds = (allowedRows || []).map((r: any) => r.id);
    if (allowedIds.length === 0) {
      return json({
        ok: false,
        code: "NO_ALLOWED_RECIPIENTS",
        error: "Không có người nhận nào nằm trong phạm vi quyền của bạn (đã bị filter hết).",
      }, 403);
    }

    // === STEP 1: Insert broadcast history ===
    const { data: broadcastRow, error: bErr } = await admin
      .from("broadcast_messages")
      .insert({
        title,
        message,
        priority,
        url,
        target_filter: payload.target_filter || null,
        recipient_ids: allowedIds,
        sent_count: allowedIds.length,
        sent_by: senderId,
      })
      .select()
      .single();
    if (bErr) return json({
      ok: false,
      code: "BROADCAST_INSERT_FAILED",
      error: `Không tạo được broadcast_messages: ${bErr.message}`,
    }, 500);

    // === STEP 2: Bulk insert notifications (CRITICAL) ===
    const notifRows = allowedIds.map((uid) => ({
      user_id: uid,
      type: "BROADCAST",
      title,
      message,
      entity_type: "broadcast",
      entity_id: broadcastRow.id,
      priority,
      action_url: url,
    }));

    const { data: insertedNotifs, error: nErr } = await admin
      .from("notifications")
      .insert(notifRows)
      .select("id, user_id");

    if (nErr) {
      return json({
        ok: false,
        code: "NOTIFICATION_INSERT_FAILED",
        error: `Tạo notification thất bại: ${nErr.message}`,
        broadcast_id: broadcastRow.id,
      }, 500);
    }

    const inAppCount = insertedNotifs?.length || 0;

    // === STEP 3: Best-effort PUSH qua send-notification (KHÔNG rollback) ===
    const pushResults = {
      sent: 0,
      not_subscribed: 0,
      failed: 0,
      errors: [] as Array<{ user_id: string; reason: string }>,
    };

    const sendUrl = `${SUPABASE_URL}/functions/v1/send-notification`;
    const pushTasks = (insertedNotifs || []).map(async (n: any) => {
      let status: "sent" | "not_subscribed" | "push_failed" = "push_failed";
      let errMsg: string | null = null;
      let respBody: any = null;

      try {
        const res = await fetch(sendUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SERVICE_ROLE}`,
          },
          body: JSON.stringify({ user_id: n.user_id, title, message, url }),
        });
        const text = await res.text();
        try { respBody = JSON.parse(text); } catch { respBody = { raw: text }; }

        const osErrors: string[] = respBody?.onesignal?.errors || [];
        const notSubscribed =
          osErrors.some((e: string) =>
            /All included players are not subscribed|invalid_player_ids|no recipients|invalid_external_user_ids/i.test(e)
          ) || respBody?.onesignal?.recipients === 0;

        if (res.ok && respBody?.ok && !notSubscribed) {
          status = "sent";
          pushResults.sent++;
        } else if (notSubscribed) {
          status = "not_subscribed";
          pushResults.not_subscribed++;
        } else {
          status = "push_failed";
          errMsg = JSON.stringify(respBody).slice(0, 500);
          pushResults.failed++;
          pushResults.errors.push({ user_id: n.user_id, reason: errMsg.slice(0, 200) });
        }
      } catch (e) {
        status = "push_failed";
        errMsg = String(e).slice(0, 500);
        pushResults.failed++;
        pushResults.errors.push({ user_id: n.user_id, reason: errMsg.slice(0, 200) });
      }

      // Best-effort log
      try {
        await admin.from("notification_delivery_logs").insert({
          notification_id: n.id,
          user_id: n.user_id,
          channel: "push",
          status,
          provider: "onesignal",
          provider_response: respBody,
          error_message: errMsg,
        });
      } catch (_) { /* bảng có thể chưa tồn tại — bỏ qua */ }
    });

    await Promise.allSettled(pushTasks);

    // === STEP 4: Audit log (best-effort) ===
    try {
      await admin.from("audit_logs").insert({
        actor_id: senderId,
        action: "BROADCAST_NOTIFICATION",
        entity_type: "broadcast_messages",
        entity_id: broadcastRow.id,
        metadata: { title, sent_count: allowedIds.length, priority, push: pushResults },
      });
    } catch (_) { /* ignore */ }

    return json({
      ok: true,
      broadcast_id: broadcastRow.id,
      sent_count: inAppCount,
      requested_count: targetIds.length,
      filtered_out: targetIds.length - allowedIds.length,
      push: pushResults,
      summary: `Đã tạo ${inAppCount} thông báo trong hệ thống. Push: ${pushResults.sent} thành công, ${pushResults.not_subscribed} chưa bật, ${pushResults.failed} lỗi.`,
    });
  } catch (err) {
    return json({
      ok: false,
      code: "INTERNAL_ERROR",
      error: `Lỗi máy chủ: ${String(err).slice(0, 300)}`,
    }, 500);
  }
});
