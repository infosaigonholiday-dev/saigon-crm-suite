// Edge Function: send-notification
// Nhận { user_id, title, message, url } → gọi OneSignal API push tới thiết bị
// Mục đích: bypass việc pg_net từ Supabase DB bị OneSignal chặn IP

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  user_id: string;
  title: string;
  message: string;
  url?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID");
    const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY");

    // DEBUG: in ra để xác nhận secret có được nạp đúng không
    const _key = ONESIGNAL_REST_API_KEY ?? "";
    console.log(
      "DEBUG_SECRETS",
      JSON.stringify({
        APP_ID: ONESIGNAL_APP_ID,
        KEY_LENGTH: _key.length || null,
        KEY_FULL_HEAD_30: _key.substring(0, 30) || null,
        KEY_FULL_TAIL_30: _key.substring(Math.max(0, _key.length - 30)) || null,
        KEY_PREFIX_OS_V2: _key.startsWith("os_v2_"),
        KEY_HAS_WHITESPACE: /\s/.test(_key),
      })
    );

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Missing ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY env",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let payload: PushPayload;
    try {
      payload = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { user_id, title, message, url } = payload;
    if (!user_id || !title || !message) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing user_id/title/message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // OneSignal v2 keys (os_v2_app_*, os_v2_org_*) dùng "Key xxx"
    // Legacy keys dùng "Basic xxx"
    const authHeader = ONESIGNAL_REST_API_KEY.startsWith("os_v2_")
      ? `Key ${ONESIGNAL_REST_API_KEY}`
      : `Basic ${ONESIGNAL_REST_API_KEY}`;

    const fullUrl = `https://app.saigonholiday.vn${url || "/"}`;

    const oneSignalBody = {
      app_id: ONESIGNAL_APP_ID,
      include_aliases: { external_id: [user_id] },
      target_channel: "push",
      headings: { en: title, vi: title },
      contents: { en: message, vi: message },
      web_url: fullUrl,
    };

    const osRes = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(oneSignalBody),
    });

    const osText = await osRes.text();
    let osJson: unknown = osText;
    try {
      osJson = JSON.parse(osText);
    } catch { /* keep as text */ }

    console.log("ONESIGNAL_RESPONSE", JSON.stringify({ status: osRes.status, body: osJson }));


    return new Response(
      JSON.stringify({
        ok: osRes.ok,
        status: osRes.status,
        onesignal: osJson,
      }),
      {
        status: osRes.ok ? 200 : osRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
