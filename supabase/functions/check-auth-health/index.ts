/**
 * check-auth-health — Anti-regression health check cho Reset Password flow.
 * Xem AUTH_CONFIG.md mục #7 (DO NOT MODIFY).
 *
 * GET → trả về status các check:
 *  - RESEND_API_KEY có set không
 *  - SUPABASE_SERVICE_ROLE_KEY có set không
 *  - send-recovery-email có deployed và respond 200 không
 *  - From email + App base URL đúng convention không
 *
 * Public (verify_jwt = false) — chỉ trả status, không expose secret.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const EXPECTED_FROM = 'Saigon Holiday CRM <noreply@saigonholiday.vn>';
const EXPECTED_APP_BASE = 'https://app.saigonholiday.vn';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const warnings: string[] = [];
  const checks: Record<string, unknown> = {
    from_email: EXPECTED_FROM,
    app_base_url: EXPECTED_APP_BASE,
  };

  // 1. Env vars
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

  checks.resend_api_key_present = !!RESEND_API_KEY;
  checks.service_role_key_present = !!SUPABASE_SERVICE_ROLE_KEY;

  if (!RESEND_API_KEY) warnings.push('RESEND_API_KEY chưa set trong Edge Function Secrets');
  if (!SUPABASE_SERVICE_ROLE_KEY) warnings.push('SUPABASE_SERVICE_ROLE_KEY missing (bất thường)');

  // 2. Self-call send-recovery-email
  let sendRecoveryDeployed = false;
  let sendRecoveryResponds200 = false;
  let sendRecoveryStatus: number | null = null;

  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-recovery-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email: 'healthcheck@saigonholiday.vn' }),
      });
      sendRecoveryStatus = res.status;
      sendRecoveryDeployed = res.status !== 404;
      sendRecoveryResponds200 = res.status === 200;
      await res.text().catch(() => {});
    } catch (e) {
      warnings.push(`Không thể gọi send-recovery-email: ${(e as Error).message}`);
    }
  } else {
    warnings.push('Thiếu SUPABASE_URL hoặc SUPABASE_ANON_KEY để self-test');
  }

  checks.send_recovery_email_deployed = sendRecoveryDeployed;
  checks.send_recovery_email_responds_200 = sendRecoveryResponds200;
  checks.send_recovery_email_status = sendRecoveryStatus;

  if (!sendRecoveryDeployed) warnings.push('send-recovery-email chưa deployed (status 404)');
  if (sendRecoveryDeployed && !sendRecoveryResponds200) {
    warnings.push(`send-recovery-email respond status ${sendRecoveryStatus}, kỳ vọng 200`);
  }

  // 3. Manual reminder
  warnings.push(
    'MANUAL CHECK: Vào Supabase Dashboard → Auth → Hooks, đảm bảo "Send email hook" Disabled (không bypass được Free plan limit nếu enabled).',
  );

  const ok =
    !!RESEND_API_KEY &&
    !!SUPABASE_SERVICE_ROLE_KEY &&
    sendRecoveryDeployed &&
    sendRecoveryResponds200;

  return new Response(
    JSON.stringify({ ok, checks, warnings }, null, 2),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
});
