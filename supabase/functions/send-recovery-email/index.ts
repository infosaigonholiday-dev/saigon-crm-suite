import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const APP_BASE_URL = 'https://app.saigonholiday.vn';
const FROM_EMAIL = 'Saigon Holiday CRM <noreply@saigonholiday.vn>';
const BRAND_COLOR = '#E8963A';

// In-memory rate limit: 1 request / email / 60s
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 60_000;

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function buildEmailHtml(recoveryUrl: string): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Đặt lại mật khẩu - Saigon Holiday CRM</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f5f5f5;padding:40px 0;">
    <tr><td align="center">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
        <tr><td style="background-color:${BRAND_COLOR};padding:32px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:0.5px;">Saigon Holiday CRM</h1>
        </td></tr>
        <tr><td style="padding:40px 32px;">
          <h2 style="margin:0 0 16px;color:#1a1a1a;font-size:20px;font-weight:600;">Đặt lại mật khẩu</h2>
          <p style="margin:0 0 24px;color:#4a4a4a;font-size:15px;line-height:1.6;">
            Xin chào,<br><br>
            Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Nhấn nút bên dưới để tạo mật khẩu mới:
          </p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr><td align="center" style="padding:8px 0 24px;">
              <a href="${recoveryUrl}" style="display:inline-block;background-color:${BRAND_COLOR};color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 36px;border-radius:8px;">Đặt lại mật khẩu</a>
            </td></tr>
          </table>
          <p style="margin:0 0 12px;color:#6a6a6a;font-size:13px;line-height:1.5;">
            Hoặc copy đường link sau vào trình duyệt:
          </p>
          <p style="margin:0 0 24px;word-break:break-all;color:${BRAND_COLOR};font-size:13px;line-height:1.5;">
            <a href="${recoveryUrl}" style="color:${BRAND_COLOR};text-decoration:underline;">${recoveryUrl}</a>
          </p>
          <div style="border-top:1px solid #eaeaea;padding-top:20px;margin-top:8px;">
            <p style="margin:0;color:#8a8a8a;font-size:12px;line-height:1.6;">
              ⏱ Liên kết này có hiệu lực trong <strong>1 giờ</strong>.<br>
              🔒 Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
            </p>
          </div>
        </td></tr>
        <tr><td style="background-color:#fafafa;padding:24px 32px;text-align:center;border-top:1px solid #eaeaea;">
          <p style="margin:0;color:#9a9a9a;font-size:12px;line-height:1.5;">
            © ${new Date().getFullYear()} Saigon Holiday. Email tự động — vui lòng không trả lời.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email ?? '').trim().toLowerCase();

    if (!isValidEmail(email)) {
      return new Response(JSON.stringify({ error: 'Email không hợp lệ' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rate limit
    const now = Date.now();
    const lastSent = rateLimitMap.get(email);
    if (lastSent && now - lastSent < RATE_LIMIT_MS) {
      console.log(`[recovery] rate-limited: ${email}`);
      // Return success anyway (no enumeration)
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    rateLimitMap.set(email, now);
    // Cleanup old entries
    if (rateLimitMap.size > 1000) {
      for (const [k, v] of rateLimitMap.entries()) {
        if (now - v > RATE_LIMIT_MS) rateLimitMap.delete(k);
      }
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[recovery] Missing env vars');
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Generate recovery link
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${APP_BASE_URL}/reset-password` },
    });

    if (error) {
      // user not found or other — return 200 to prevent enumeration
      console.log(`[recovery] generateLink error for ${email}: ${error.message}`);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const actionLink = data?.properties?.action_link;
    const tokenHash = data?.properties?.hashed_token;

    if (!actionLink || !tokenHash) {
      console.error('[recovery] missing action_link or hashed_token in generateLink response');
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build clean recovery URL pointing directly at our app
    const recoveryUrl = `${APP_BASE_URL}/reset-password?token_hash=${encodeURIComponent(tokenHash)}&type=recovery`;

    // Send via Resend
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [email],
        subject: 'Đặt lại mật khẩu - Saigon Holiday CRM',
        html: buildEmailHtml(recoveryUrl),
      }),
    });

    const resendBody = await resendRes.json().catch(() => ({}));

    if (!resendRes.ok) {
      console.error(`[recovery] Resend failed for ${email}: ${resendRes.status}`, resendBody);
      return new Response(JSON.stringify({ error: 'Không thể gửi email. Vui lòng thử lại sau.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[recovery] email sent successfully to ${email}, resend_id=${resendBody?.id}`);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[recovery] unhandled error', err);
    return new Response(JSON.stringify({ error: 'Lỗi máy chủ' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
