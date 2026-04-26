// @ts-nocheck
// Web Push thuần Deno: implement RFC 8291 (aes128gcm) + VAPID JWT (ES256)
// Không dùng thư viện npm/esm.sh nào để tránh crash trong edge runtime.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-call, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const VAPID_PUBLIC_KEY = (Deno.env.get("VAPID_PUBLIC_KEY") || "").trim();
const VAPID_PRIVATE_KEY = (Deno.env.get("VAPID_PRIVATE_KEY") || "").trim();

function normalizeVapidSubject(raw: string): string {
  const v = (raw || "").trim();
  if (!v) return "mailto:info@saigonholiday.com";
  if (/^(mailto:|https?:\/\/)/i.test(v)) return v;
  if (v.includes("@")) return `mailto:${v}`;
  return "mailto:info@saigonholiday.com";
}
const VAPID_SUBJECT = normalizeVapidSubject(Deno.env.get("VAPID_SUBJECT") || "");

// ---------- base64url helpers ----------
function b64uToBytes(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToB64u(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function strToBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}
function concat(...arrs: Uint8Array[]): Uint8Array {
  const len = arrs.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(len);
  let off = 0;
  for (const a of arrs) { out.set(a, off); off += a.length; }
  return out;
}

// ---------- VAPID ECDSA key ----------
// VAPID_PRIVATE_KEY là d (32 bytes base64url). VAPID_PUBLIC_KEY là uncompressed point 65 bytes (0x04|x|y).
async function importVapidKey(): Promise<CryptoKey> {
  const d = b64uToBytes(VAPID_PRIVATE_KEY);
  const pub = b64uToBytes(VAPID_PUBLIC_KEY);
  if (pub.length !== 65 || pub[0] !== 0x04) {
    throw new Error(`VAPID_PUBLIC_KEY invalid (length=${pub.length})`);
  }
  const x = pub.slice(1, 33);
  const y = pub.slice(33, 65);
  const jwk = {
    kty: "EC", crv: "P-256",
    x: bytesToB64u(x), y: bytesToB64u(y), d: bytesToB64u(d),
    ext: true,
  };
  return await crypto.subtle.importKey(
    "jwk", jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false, ["sign"],
  );
}

async function buildVapidJwt(audience: string): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: VAPID_SUBJECT,
  };
  const headerB64 = bytesToB64u(strToBytes(JSON.stringify(header)));
  const payloadB64 = bytesToB64u(strToBytes(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;
  const key = await importVapidKey();
  const sigDer = await crypto.subtle.sign(
    { name: "ECDSA", hash: { name: "SHA-256" } },
    key, strToBytes(signingInput),
  );
  // Web Crypto already returns r||s (64 bytes) for ECDSA, NOT DER.
  return `${signingInput}.${bytesToB64u(sigDer)}`;
}

// ---------- HKDF ----------
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const baseKey = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info },
    baseKey, length * 8,
  );
  return new Uint8Array(bits);
}

// ---------- aes128gcm encryption (RFC 8188 + RFC 8291) ----------
async function encryptPayload(
  payload: Uint8Array,
  uaPublicRaw: Uint8Array,  // 65 bytes uncompressed (browser P-256 public key)
  authSecret: Uint8Array,   // 16 bytes
): Promise<{ body: Uint8Array; asPublicKey: Uint8Array }> {
  // 1. Generate ephemeral ECDH key pair (server)
  const asKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"],
  ) as CryptoKeyPair;
  const asPublicJwk = await crypto.subtle.exportKey("jwk", asKeyPair.publicKey);
  const asPublicRaw = concat(
    new Uint8Array([0x04]),
    b64uToBytes(asPublicJwk.x as string),
    b64uToBytes(asPublicJwk.y as string),
  );

  // 2. Import UA public key
  const uaPubJwk = {
    kty: "EC", crv: "P-256",
    x: bytesToB64u(uaPublicRaw.slice(1, 33)),
    y: bytesToB64u(uaPublicRaw.slice(33, 65)),
    ext: true,
  };
  const uaPubKey = await crypto.subtle.importKey(
    "jwk", uaPubJwk, { name: "ECDH", namedCurve: "P-256" }, false, [],
  );

  // 3. ECDH shared secret
  const sharedBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: uaPubKey }, asKeyPair.privateKey, 256,
  );
  const ecdhSecret = new Uint8Array(sharedBits);

  // 4. PRK_key = HKDF(authSecret, ecdhSecret, "WebPush: info\0" || ua_public || as_public, 32)
  const keyInfo = concat(
    strToBytes("WebPush: info\0"),
    uaPublicRaw,
    asPublicRaw,
  );
  const ikm = await hkdf(authSecret, ecdhSecret, keyInfo, 32);

  // 5. Salt (16 bytes random)
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // 6. Content Encryption Key (16) + Nonce (12)
  const cek = await hkdf(salt, ikm, concat(strToBytes("Content-Encoding: aes128gcm\0"), new Uint8Array([0x01])), 16);
  const nonce = await hkdf(salt, ikm, concat(strToBytes("Content-Encoding: nonce\0"), new Uint8Array([0x01])), 12);

  // 7. Encrypt: payload || 0x02 (last record marker per RFC 8188)
  const plaintext = concat(payload, new Uint8Array([0x02]));
  const aesKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, plaintext));

  // 8. Build aes128gcm header: salt(16) || rs(4 BE = 4096) || idlen(1) || keyid(idlen)
  // For Web Push, keyid = as_public_raw (65 bytes)
  const rs = new Uint8Array([0x00, 0x00, 0x10, 0x00]); // 4096
  const idlen = new Uint8Array([asPublicRaw.length]);  // 65
  const body = concat(salt, rs, idlen, asPublicRaw, ct);

  return { body, asPublicKey: asPublicRaw };
}

// ---------- send one push ----------
async function sendOne(
  endpoint: string,
  p256dhB64u: string,
  authB64u: string,
  payloadJson: string,
): Promise<{ ok: boolean; status?: number; body?: string }> {
  const ua = b64uToBytes(p256dhB64u);
  const auth = b64uToBytes(authB64u);
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const jwt = await buildVapidJwt(audience);

  const { body } = await encryptPayload(strToBytes(payloadJson), ua, auth);

  const resp = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      "TTL": "86400",
      "Authorization": `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
    },
    body,
  });

  if (resp.status >= 200 && resp.status < 300) {
    return { ok: true, status: resp.status };
  }
  const text = await resp.text().catch(() => "");
  return { ok: false, status: resp.status, body: text };
}

interface PushBody {
  user_id: string;
  title: string;
  message?: string;
  url?: string;
  tag?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return jsonResponse({ error: "VAPID keys not configured" }, 500);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const isServiceRole = token === serviceRoleKey;
    const internalCallHeader = req.headers.get("x-internal-call") === "true";

    let authedUserId: string | null = null;
    let authMethod = "unknown";

    if (isServiceRole) {
      authMethod = "service_role";
    } else if (internalCallHeader && token) {
      try {
        const userClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data, error } = await userClient.auth.getClaims(token);
        authMethod = !error && data?.claims?.role ? `internal_${data.claims.role}` : "internal_unverified";
      } catch {
        authMethod = "internal_unverified";
      }
    } else {
      if (!token) {
        return jsonResponse({ error: "Unauthorized: missing token" }, 401);
      }
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data, error } = await userClient.auth.getClaims(token);
      if (error || !data?.claims?.sub) {
        return jsonResponse({ error: "Unauthorized: invalid JWT" }, 401);
      }
      authedUserId = data.claims.sub as string;
      authMethod = "jwt_user";
    }

    console.log(`[send-notification] auth=${authMethod}`);

    let body: PushBody;
    try {
      body = (await req.json()) as PushBody;
    } catch (e: any) {
      return jsonResponse({ error: "Invalid JSON body: " + (e?.message || "parse failed") }, 400);
    }
    if (!body?.user_id || !body?.title) {
      return jsonResponse({ error: "user_id and title are required" }, 400);
    }

    if (authedUserId && body.user_id !== authedUserId) {
      return jsonResponse({ error: "Forbidden: can only push to self" }, 403);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: subs, error: subErr } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", body.user_id);

    if (subErr) {
      return jsonResponse({ error: subErr.message }, 500);
    }

    if (!subs || subs.length === 0) {
      return jsonResponse({ sent: 0, failed: 0, reason: "no_subscriptions" });
    }

    const payload = JSON.stringify({
      title: body.title,
      message: body.message ?? "",
      url: body.url ?? "/",
      tag: body.tag ?? `sh-${body.user_id}`,
    });

    let sent = 0, failed = 0;
    const staleIds: string[] = [];
    const liveIds: string[] = [];
    const errorDetails: Array<{ status?: number; body?: string }> = [];

    await Promise.all(subs.map(async (s) => {
      try {
        const r = await sendOne(s.endpoint, s.p256dh, s.auth, payload);
        if (r.ok) {
          sent++;
          liveIds.push(s.id);
        } else {
          failed++;
          errorDetails.push({ status: r.status, body: r.body?.slice(0, 200) });
          if (r.status === 404 || r.status === 410) {
            staleIds.push(s.id);
            console.log(`[send-notification] stale removed: ${s.endpoint.slice(0, 60)}…`);
          } else if (r.status === 400 && /vapid|VapidPkHashMismatch/i.test(r.body || "")) {
            staleIds.push(s.id);
            console.warn(`[send-notification] VAPID mismatch — sub deleted, client will recreate.`);
          } else {
            console.error(`[send-notification] push failed status=${r.status} body=${r.body?.slice(0, 200)}`);
          }
        }
      } catch (e: any) {
        failed++;
        errorDetails.push({ body: e?.message || String(e) });
        console.error(`[send-notification] exception:`, e?.message || e);
      }
    }));

    if (staleIds.length > 0) {
      await admin.from("push_subscriptions").delete().in("id", staleIds);
    }
    if (liveIds.length > 0) {
      await admin.from("push_subscriptions")
        .update({ last_used_at: new Date().toISOString() })
        .in("id", liveIds);
    }

    console.log(`[send-notification] result user=${body.user_id} sent=${sent} failed=${failed} cleaned=${staleIds.length}`);

    return jsonResponse({
      sent,
      failed,
      cleaned: staleIds.length,
      errors: failed > 0 ? errorDetails : undefined,
    });
  } catch (err: any) {
    console.error("[send-notification] uncaught:", err?.message || err);
    return jsonResponse({ error: err?.message || "unknown" }, 500);
  }
});
