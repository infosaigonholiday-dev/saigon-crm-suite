// Edge Function: broadcast-notification
// Gửi 1 thông báo đến nhiều user cùng lúc.
// Bulk insert vào notifications + lưu lịch sử broadcast_messages.
// Trigger trg_notifications_push (đã có) sẽ tự gọi send-notification → OneSignal.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_SENDER_ROLES = ["ADMIN", "GDKD", "MANAGER", "HCNS"];

interface BroadcastPayload {
  title: string;
  message: string;
  priority?: "low" | "medium" | "high" | "critical";
  url?: string;
  target_user_ids: string[];
  target_filter?: Record<string, unknown>;
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
    if (!jwt) {
      return json({ ok: false, error: "Thiếu token" }, 401);
    }

    // Verify caller
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      return json({ ok: false, error: "Token không hợp lệ" }, 401);
    }
    const senderId = userData.user.id;

    // Service role client (bypass RLS for sender role check + bulk insert)
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: senderProfile, error: pErr } = await admin
      .from("profiles")
      .select("id, role, department_id, is_active, full_name")
      .eq("id", senderId)
      .maybeSingle();
    if (pErr || !senderProfile || !senderProfile.is_active) {
      return json({ ok: false, error: "Tài khoản không hoạt động" }, 403);
    }
    if (!ALLOWED_SENDER_ROLES.includes(senderProfile.role)) {
      return json({ ok: false, error: "Bạn không có quyền gửi thông báo broadcast" }, 403);
    }

    // Parse body
    let payload: BroadcastPayload;
    try {
      payload = await req.json();
    } catch {
      return json({ ok: false, error: "Body không hợp lệ" }, 400);
    }

    const title = (payload.title || "").trim();
    const message = (payload.message || "").trim();
    const priority = payload.priority || "medium";
    // BROADCAST có thể không gắn entity → URL fallback /canh-bao
    const url = (payload.url && payload.url.trim().length > 1 ? payload.url.trim() : "/canh-bao");
    const targetIds = Array.isArray(payload.target_user_ids)
      ? Array.from(new Set(payload.target_user_ids.filter((x) => typeof x === "string")))
      : [];

    if (!title || title.length > 120) return json({ ok: false, error: "Tiêu đề bắt buộc, ≤120 ký tự" }, 400);
    if (!message || message.length > 500) return json({ ok: false, error: "Nội dung bắt buộc, ≤500 ký tự" }, 400);
    if (!["low", "medium", "high", "critical"].includes(priority)) return json({ ok: false, error: "Priority không hợp lệ" }, 400);
    if (targetIds.length === 0) return json({ ok: false, error: "Chọn ít nhất 1 người nhận" }, 400);
    if (targetIds.length > 500) return json({ ok: false, error: "Tối đa 500 người/lần gửi" }, 400);

    // Validate URL bắt buộc khi priority cao (Prompt #5B layer 2/4: API)
    if ((priority === "high" || priority === "critical") &&
        (url === "/" || url === "#" || url.length <= 1)) {
      return json({ ok: false, error: "Priority Cao/Khẩn bắt buộc URL điều hướng hợp lệ (không được '/', '#' hoặc trống)" }, 400);
    }

    // Server-side scope check: filter targetIds by sender scope
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
        return json({ ok: false, error: "Tài khoản MANAGER chưa gán phòng ban" }, 403);
      }
      scopeQuery = scopeQuery.eq("department_id", senderProfile.department_id);
    }
    // ADMIN, HCNS: không filter thêm

    const { data: allowedRows, error: scopeErr } = await scopeQuery;
    if (scopeErr) return json({ ok: false, error: scopeErr.message }, 500);
    const allowedIds = (allowedRows || []).map((r: any) => r.id);
    if (allowedIds.length === 0) {
      return json({ ok: false, error: "Không có người nhận hợp lệ trong phạm vi quyền của bạn" }, 403);
    }

    // 1) Insert broadcast_messages
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
    if (bErr) return json({ ok: false, error: bErr.message }, 500);

    // 2) Bulk insert notifications
    const notifRows = allowedIds.map((uid) => ({
      user_id: uid,
      type: "BROADCAST",
      title,
      message,
      entity_type: "broadcast",
      entity_id: broadcastRow.id,
      priority,
    }));

    const { error: nErr } = await admin.from("notifications").insert(notifRows);
    if (nErr) return json({ ok: false, error: `Insert notifications thất bại: ${nErr.message}` }, 500);

    // 3) Audit log (best-effort)
    try {
      await admin.from("audit_logs").insert({
        actor_id: senderId,
        action: "BROADCAST_NOTIFICATION",
        entity_type: "broadcast_messages",
        entity_id: broadcastRow.id,
        metadata: { title, sent_count: allowedIds.length, priority },
      });
    } catch (_) { /* ignore */ }

    return json({
      ok: true,
      broadcast_id: broadcastRow.id,
      sent_count: allowedIds.length,
      requested_count: targetIds.length,
      filtered_out: targetIds.length - allowedIds.length,
    });
  } catch (err) {
    return json({ ok: false, error: String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
