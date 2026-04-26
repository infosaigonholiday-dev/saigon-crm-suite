// @ts-nocheck
// Utility: generate a fresh ECDSA P-256 VAPID keypair as a matched pair.
// Returns base64url-encoded public (65-byte uncompressed point) and private (32-byte d) keys.
// Caller must paste the returned values into Supabase secrets and the frontend .env.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

function bytesToB64u(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64uToBytes(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Generate ECDSA P-256 keypair (extractable so we can read d)
    const kp = await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"],
    ) as CryptoKeyPair;

    const pubJwk = await crypto.subtle.exportKey("jwk", kp.publicKey);
    const prvJwk = await crypto.subtle.exportKey("jwk", kp.privateKey);

    const x = b64uToBytes(pubJwk.x as string);
    const y = b64uToBytes(pubJwk.y as string);
    const d = b64uToBytes(prvJwk.d as string);

    // Uncompressed point: 0x04 || x(32) || y(32) = 65 bytes
    const pubRaw = new Uint8Array(65);
    pubRaw[0] = 0x04;
    pubRaw.set(x, 1);
    pubRaw.set(y, 33);

    const VAPID_PUBLIC_KEY = bytesToB64u(pubRaw);
    const VAPID_PRIVATE_KEY = bytesToB64u(d);

    // Sanity: re-verify the pair by signing+verifying a sample message
    const sampleSig = await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      kp.privateKey,
      new TextEncoder().encode("vapid-pair-check"),
    );
    const verified = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      kp.publicKey,
      sampleSig,
      new TextEncoder().encode("vapid-pair-check"),
    );

    return new Response(
      JSON.stringify({
        ok: true,
        verified,
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY,
        public_len: VAPID_PUBLIC_KEY.length,
        private_len: VAPID_PRIVATE_KEY.length,
        instructions: [
          "1. Update Supabase secret VAPID_PUBLIC_KEY with the value above",
          "2. Update Supabase secret VAPID_PRIVATE_KEY with the value above",
          "3. Update VITE_VAPID_PUBLIC_KEY in .env with the same VAPID_PUBLIC_KEY",
          "4. DELETE FROM push_subscriptions (clients must re-subscribe)",
          "5. Re-deploy send-notification and reload the frontend",
        ],
      }, null, 2),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ ok: false, error: e?.message || String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
