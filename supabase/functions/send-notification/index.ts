import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") || "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") || "";

function normalizeVapidSubject(raw: string): string {
  const v = (raw || "").trim();
  if (!v) return "mailto:info@saigonholiday.com";
  if (/^(mailto:|https?:\/\/)/i.test(v)) return v;
  if (v.includes("@")) return `mailto:${v}`;
  return "mailto:info@saigonholiday.com";
}

const VAPID_SUBJECT = normalizeVapidSubject(Deno.env.get("VAPID_SUBJECT") || "");
console.log("[send-notification] VAPID_SUBJECT normalized to:", VAPID_SUBJECT);

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    console.log("[send-notification] webpush VAPID details configured OK");
  } catch (e) {
    console.error("[send-notification] setVapidDetails failed:", e);
  }
}

interface PushBody {
  user_id: string;
  title: string;
  message?: string;
  url?: string;
  tag?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    // 3 luồng auth được chấp nhận:
    // 1) Service role key (gọi từ edge function khác như daily-reminders)
    // 2) Internal call: header x-internal-call=true + Authorization là JWT có role='anon' hoặc service role
    //    (DB trigger gửi với anon JWT + header này — không ai từ ngoài internet biết để gửi cùng lúc cả 2)
    // 3) JWT user hợp lệ với claims.sub (frontend đã login)
    const isServiceRole = token === serviceRoleKey;
    const internalCallHeader = req.headers.get("x-internal-call") === "true";

    let authedUserId: string | null = null;
    let authMethod = "unknown";

    if (isServiceRole) {
      authMethod = "service_role";
    } else if (internalCallHeader && token) {
      // Verify token là JWT hợp lệ (anon hoặc user) — không cần check sub
      try {
        const userClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data, error } = await userClient.auth.getClaims(token);
        if (!error && data?.claims?.role) {
          authMethod = `internal_${data.claims.role}`;
        } else {
          // JWT không decode được — vẫn cho qua nếu có header internal (backward compat với pg_net)
          authMethod = "internal_unverified";
        }
      } catch {
        authMethod = "internal_unverified";
      }
    } else {
      // Phải là JWT user hợp lệ với claims.sub
      if (!token) {
        console.warn("[send-notification] no auth token");
        return new Response(JSON.stringify({ error: "Unauthorized: missing token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data, error } = await userClient.auth.getClaims(token);
      if (error || !data?.claims?.sub) {
        console.warn("[send-notification] invalid JWT (no sub):", error?.message || "no claims");
        return new Response(JSON.stringify({ error: "Unauthorized: invalid JWT" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      authedUserId = data.claims.sub as string;
      authMethod = "jwt_user";
    }

    console.log(`[send-notification] auth: ${authMethod}`);

    let authedUserId: string | null = null;

    if (!isServiceRole && !isInternalCall) {
      // Phải là JWT user hợp lệ với claims.sub
      if (!token) {
        console.warn("[send-notification] no auth token provided");
        return new Response(JSON.stringify({ error: "Unauthorized: missing token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data, error } = await userClient.auth.getClaims(token);
      if (error || !data?.claims?.sub) {
        console.warn("[send-notification] invalid JWT (no sub):", error?.message || "no claims");
        return new Response(JSON.stringify({ error: "Unauthorized: invalid JWT" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      authedUserId = data.claims.sub as string;
    }

    const body = (await req.json()) as PushBody;
    if (!body.user_id || !body.title) {
      return new Response(JSON.stringify({ error: "user_id and title are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Bảo vệ: nếu là JWT user → chỉ được gửi cho chính mình (tránh abuse)
    if (authedUserId && body.user_id !== authedUserId) {
      console.warn(`[send-notification] user ${authedUserId} tried to push to ${body.user_id} — denied`);
      return new Response(JSON.stringify({ error: "Forbidden: can only push to self" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: subs, error: subErr } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", body.user_id);

    if (subErr) {
      console.error("[send-notification] DB select failed:", subErr.message);
      return new Response(JSON.stringify({ error: subErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!subs || subs.length === 0) {
      console.log(`[send-notification] no subscriptions for user ${body.user_id}`);
      return new Response(JSON.stringify({ sent: 0, failed: 0, reason: "no_subscriptions" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.stringify({
      title: body.title,
      message: body.message ?? "",
      url: body.url ?? "/",
      tag: body.tag ?? `sh-${body.user_id}`,
    });

    let sent = 0;
    let failed = 0;
    const staleIds: string[] = [];
    const liveIds: string[] = [];
    const errorDetails: Array<{ status?: number; body?: string }> = [];

    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
            { TTL: 60 * 60 * 24 }
          );
          sent++;
          liveIds.push(s.id);
        } catch (err: any) {
          failed++;
          const status = err?.statusCode || err?.status;
          const errBody = err?.body || err?.message || String(err);
          errorDetails.push({ status, body: errBody });
          if (status === 404 || status === 410) {
            staleIds.push(s.id);
            console.log(`[send-notification] stale subscription removed: ${s.endpoint.slice(0, 60)}…`);
          } else {
            console.error(`[send-notification] push failed status=${status} body=${errBody} endpoint=${s.endpoint.slice(0, 60)}…`);
          }
        }
      })
    );

    if (staleIds.length > 0) {
      await admin.from("push_subscriptions").delete().in("id", staleIds);
    }
    if (liveIds.length > 0) {
      await admin
        .from("push_subscriptions")
        .update({ last_used_at: new Date().toISOString() })
        .in("id", liveIds);
    }

    console.log(
      `[send-notification] result user=${body.user_id} sent=${sent} failed=${failed} cleaned=${staleIds.length}`
    );

    return new Response(
      JSON.stringify({ sent, failed, cleaned: staleIds.length, errors: failed > 0 ? errorDetails : undefined }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[send-notification] uncaught error:", err);
    return new Response(JSON.stringify({ error: err?.message || "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
