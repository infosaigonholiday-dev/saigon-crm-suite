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
    console.log(
      "DEBUG_SECRETS",
      JSON.stringify({
        APP_ID_LENGTH: ONESIGNAL_APP_ID?.length ?? null,
        APP_ID_START: ONESIGNAL_APP_ID?.substring(0, 8) ?? null,
        KEY_LENGTH: ONESIGNAL_REST_API_KEY?.length ?? null,
        KEY_START: ONESIGNAL_REST_API_KEY?.substring(0, 20) ?? null,
        KEY_PREFIX_OS_V2: ONESIGNAL_REST_API_KEY?.startsWith("os_v2_") ?? null,
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

    // Format Authorization header theo prefix key
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
      url: fullUrl,
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
