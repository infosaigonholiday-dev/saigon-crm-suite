// Edge Function: send push to OneSignal.
// Trigger DB gọi qua pg_net → edge function này → OneSignal.
// Lý do: pg_net gửi từ IP Supabase bị OneSignal trả 403 (block dải IP / UA),
// edge function chạy trên Deno Deploy có IP khác nên qua được.

const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID");
const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY");

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
  priority?: "high" | "urgent" | "normal";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "OneSignal credentials missing in edge function env",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = (await req.json()) as PushPayload;
    if (!body.user_id || !body.title) {
      return new Response(
        JSON.stringify({ ok: false, error: "user_id and title are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const auth = ONESIGNAL_REST_API_KEY.startsWith("os_v2_")
      ? `Key ${ONESIGNAL_REST_API_KEY}`
      : `Basic ${ONESIGNAL_REST_API_KEY}`;

    const osBody = {
      app_id: ONESIGNAL_APP_ID,
      channel_for_external_user_ids: "push",
      include_external_user_ids: [body.user_id],
      headings: { en: body.title },
      contents: { en: body.message ?? "" },
      url: body.url,
      priority: body.priority === "high" || body.priority === "urgent" ? 10 : 5,
    };

    const osRes = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: auth,
      },
      body: JSON.stringify(osBody),
    });

    const osText = await osRes.text();
    return new Response(
      JSON.stringify({
        ok: osRes.ok,
        status_code: osRes.status,
        response: osText,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: String((e as Error).message ?? e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
