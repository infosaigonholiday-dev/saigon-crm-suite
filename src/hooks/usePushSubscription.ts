import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const VAPID_PUBLIC_KEY = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ?? "";

function keyFingerprint(key: string): string {
  if (!key) return "missing";
  return `${key.slice(0, 10)}…${key.slice(-6)} (len=${key.length})`;
}

if (!VAPID_PUBLIC_KEY && typeof window !== "undefined") {
  console.error(
    "[push] VITE_VAPID_PUBLIC_KEY is missing in .env — Web Push will fail. " +
    "Add it to .env and restart dev server."
  );
}

export type PushSubscribeError =
  | "unsupported"
  | "iframe"
  | "denied"
  | "sw_unreachable"
  | "sw_register_failed"
  | "vapid_invalid"
  | "subscribe_failed"
  | "db_failed"
  | "error";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const out = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) out[i] = rawData.charCodeAt(i);
  return out;
}

function bufToBase64(buf: ArrayBuffer | null): string {
  if (!buf) return "";
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function applicationServerKeyMatches(
  currentKey: ArrayBuffer | null | undefined,
  vapidPublicKey: string
): boolean {
  if (!currentKey || !vapidPublicKey) return false;
  const expectedBytes = urlBase64ToUint8Array(vapidPublicKey);
  const currentBytes = new Uint8Array(currentKey);
  if (currentBytes.byteLength !== expectedBytes.byteLength) return false;
  for (let i = 0; i < currentBytes.length; i++) {
    if (currentBytes[i] !== expectedBytes[i]) return false;
  }
  return true;
}

function isInIframe(): boolean {
  try {
    return typeof window !== "undefined" && window.top !== window.self;
  } catch {
    return true; // cross-origin access throws → definitely in iframe
  }
}

type SubscribeResult = { ok: boolean; error?: PushSubscribeError; detail?: string };
type SubscribeOptions = { forceResubscribe?: boolean };

export type PushStatusReason =
  | "ready"                  // browser sub + DB row khớp VAPID
  | "missing_vapid_env"      // VITE_VAPID_PUBLIC_KEY trống / sai
  | "unsupported"            // trình duyệt không hỗ trợ
  | "iframe_blocked"         // đang chạy trong iframe editor
  | "permission_denied"      // user đã chặn quyền notify
  | "permission_default"     // chưa hỏi quyền
  | "no_browser_sub"         // chưa subscribe ở browser
  | "vapid_mismatch"         // browser sub dùng VAPID cũ
  | "db_row_missing"         // browser có sub nhưng DB không có
  | "unknown";

export function usePushSubscription() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [loading, setLoading] = useState(false);
  const [inIframe, setInIframe] = useState(false);
  const [hasBrowserSubscription, setHasBrowserSubscription] = useState(false);
  const [hasDbSubscription, setHasDbSubscription] = useState(false);
  const [statusReason, setStatusReason] = useState<PushStatusReason>("unknown");
  const subscribeRef = useRef<(() => Promise<SubscribeResult>) | null>(null);

  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setIsSupported(supported);
    setInIframe(isInIframe());
    if (supported) setPermission(Notification.permission);
    console.log("[push] init", {
      supported,
      inIframe: isInIframe(),
      permission: supported ? Notification.permission : "n/a",
      vapidKeyLength: VAPID_PUBLIC_KEY.length,
      vapidFingerprint: keyFingerprint(VAPID_PUBLIC_KEY),
    });
  }, []);

  // Auto-detect VAPID key mismatch & re-sync subscription with DB
  useEffect(() => {
    if (!isSupported) {
      setStatusReason("unsupported");
      return;
    }
    if (inIframe) {
      setStatusReason("iframe_blocked");
      return;
    }
    if (!VAPID_PUBLIC_KEY) {
      setStatusReason("missing_vapid_env");
      return;
    }
    if (!user) return;

    (async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration("/sw.js");
        const sub = await reg?.pushManager.getSubscription();
        if (!sub) {
          setIsSubscribed(false);
          setHasBrowserSubscription(false);
          setHasDbSubscription(false);
          setStatusReason(
            Notification.permission === "denied"
              ? "permission_denied"
              : Notification.permission === "default"
              ? "permission_default"
              : "no_browser_sub"
          );
          console.log("[push] no existing subscription");
          return;
        }

        setHasBrowserSubscription(true);

        // So sánh applicationServerKey hiện tại với VAPID_PUBLIC_KEY
        const currentKey = sub.options?.applicationServerKey as ArrayBuffer | null | undefined;
        const keyMatches = applicationServerKeyMatches(currentKey, VAPID_PUBLIC_KEY);

        if (!keyMatches && VAPID_PUBLIC_KEY) {
          console.warn("[push] VAPID key changed — auto re-subscribing existing subscription");
          try {
            await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          } catch (e) {
            console.warn("[push] failed to delete old DB record", e);
          }
          try {
            await sub.unsubscribe();
          } catch (e) {
            console.warn("[push] failed to unsubscribe browser sub", e);
          }
          setIsSubscribed(false);
          setHasBrowserSubscription(false);
          setHasDbSubscription(false);
          setStatusReason("vapid_mismatch");

          if (Notification.permission === "granted" && !isInIframe()) {
            console.log("[push] auto-creating new subscription with current VAPID key");
            await subscribeRef.current?.();
          }
          return;
        }

        // VAPID khớp → kiểm tra DB còn record không, nếu thiếu thì upsert lại
        let dbHasRow = false;
        try {
          const { data: existing } = await supabase
            .from("push_subscriptions")
            .select("id")
            .eq("endpoint", sub.endpoint)
            .maybeSingle();

          if (!existing) {
            console.log("[push] browser sub exists but DB row missing — re-upserting");
            const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
            const endpoint = json.endpoint || sub.endpoint;
            const p256dh = json.keys?.p256dh || bufToBase64(sub.getKey ? sub.getKey("p256dh") : null);
            const authKey = json.keys?.auth || bufToBase64(sub.getKey ? sub.getKey("auth") : null);
            const { error: upErr } = await supabase
              .from("push_subscriptions")
              .upsert(
                {
                  user_id: user.id,
                  endpoint,
                  p256dh,
                  auth: authKey,
                  user_agent: navigator.userAgent,
                  last_used_at: new Date().toISOString(),
                },
                { onConflict: "endpoint" }
              );
            dbHasRow = !upErr;
          } else {
            dbHasRow = true;
          }
        } catch (e) {
          console.warn("[push] DB sync check failed", e);
        }

        setHasDbSubscription(dbHasRow);
        setIsSubscribed(true);
        setStatusReason(dbHasRow ? "ready" : "db_row_missing");
        console.log("[push] existing subscription matches current VAPID key");
      } catch (e) {
        console.warn("[push] subscription check failed", e);
        setIsSubscribed(false);
        setStatusReason("unknown");
      }
    })();
  }, [isSupported, user, inIframe]);

  const subscribe = useCallback(async (options?: SubscribeOptions): Promise<{ ok: boolean; error?: PushSubscribeError; detail?: string }> => {
    console.log("[push] subscribe() called");
    if (!isSupported) return { ok: false, error: "unsupported" };
    if (!user) return { ok: false, error: "error", detail: "no user" };
    if (inIframe) {
      console.warn("[push] blocked: running in iframe");
      return { ok: false, error: "iframe" };
    }

    setLoading(true);
    try {
      // Step 1: verify /sw.js is reachable
      try {
        const head = await fetch("/sw.js", { method: "HEAD" });
        console.log("[push] /sw.js HEAD", head.status, head.headers.get("content-type"));
        if (!head.ok) {
          return { ok: false, error: "sw_unreachable", detail: `HTTP ${head.status}` };
        }
      } catch (e) {
        console.error("[push] /sw.js fetch failed", e);
        return { ok: false, error: "sw_unreachable", detail: String(e) };
      }

      // Step 2: VAPID key sanity check (base64url, 65 bytes raw → 87 chars)
      if (VAPID_PUBLIC_KEY.length < 80 || VAPID_PUBLIC_KEY.length > 90) {
        console.error("[push] VAPID key suspicious length", VAPID_PUBLIC_KEY.length);
        return { ok: false, error: "vapid_invalid", detail: `length=${VAPID_PUBLIC_KEY.length}` };
      }

      // Step 3: request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      console.log("[push] permission result", perm);
      if (perm !== "granted") {
        return { ok: false, error: "denied" };
      }

      // Step 4: register/get SW
      let reg: ServiceWorkerRegistration | undefined;
      try {
        reg = await navigator.serviceWorker.getRegistration("/sw.js");
        if (!reg) {
          console.log("[push] registering /sw.js …");
          reg = await navigator.serviceWorker.register("/sw.js");
        }
        await navigator.serviceWorker.ready;
        console.log("[push] SW ready", reg.scope, reg.active?.state);
      } catch (e) {
        console.error("[push] SW register failed", e);
        return { ok: false, error: "sw_register_failed", detail: String(e) };
      }

      // Step 5: subscribe
      let sub: PushSubscription | null = null;
      try {
        sub = await reg.pushManager.getSubscription();
        if (sub) {
          const keyMatches = applicationServerKeyMatches(
            sub.options?.applicationServerKey as ArrayBuffer | null | undefined,
            VAPID_PUBLIC_KEY
          );
          const mustRecreate = !!options?.forceResubscribe || !keyMatches;

          if (mustRecreate) {
            console.warn("[push] existing subscription will be recreated", {
              forceResubscribe: !!options?.forceResubscribe,
              keyMatches,
              endpoint: sub.endpoint,
            });
            try {
              await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
            } catch (e) {
              console.warn("[push] failed to delete old DB record before resubscribe", e);
            }
            try {
              await sub.unsubscribe();
            } catch (e) {
              console.warn("[push] failed to unsubscribe old browser sub before resubscribe", e);
            }
            sub = null;
            setIsSubscribed(false);
            setHasBrowserSubscription(false);
            setHasDbSubscription(false);
            setStatusReason("vapid_mismatch");
          }
        }
        if (!sub) {
          const keyBytes = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
          const keyBuffer = new ArrayBuffer(keyBytes.byteLength);
          new Uint8Array(keyBuffer).set(keyBytes);
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: keyBuffer,
          });
          console.log("[push] new subscription created");
        } else {
          console.log("[push] reused existing subscription");
        }
      } catch (e) {
        console.error("[push] pushManager.subscribe failed", e);
        return { ok: false, error: "subscribe_failed", detail: (e as Error)?.message || String(e) };
      }

      // Step 6: upsert to Supabase
      try {
        const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
        const endpoint = json.endpoint || sub.endpoint;
        const p256dh = json.keys?.p256dh || bufToBase64(sub.getKey ? sub.getKey("p256dh") : null);
        const authKey = json.keys?.auth || bufToBase64(sub.getKey ? sub.getKey("auth") : null);

        const { error } = await supabase
          .from("push_subscriptions")
          .upsert(
            {
              user_id: user.id,
              endpoint,
              p256dh,
              auth: authKey,
              user_agent: navigator.userAgent,
              last_used_at: new Date().toISOString(),
            },
            { onConflict: "endpoint" }
          );
        if (error) {
          console.error("[push] DB upsert error", error);
          return { ok: false, error: "db_failed", detail: error.message };
        }
        console.log("[push] DB upsert OK");
      } catch (e) {
        console.error("[push] DB step crash", e);
        return { ok: false, error: "db_failed", detail: String(e) };
      }

      setIsSubscribed(true);
      setHasBrowserSubscription(true);
      setHasDbSubscription(true);
      setStatusReason("ready");
      return { ok: true };
    } catch (e) {
      console.error("[push] subscribe error (outer)", e);
      return { ok: false, error: "error", detail: String(e) };
    } finally {
      setLoading(false);
    }
  }, [isSupported, user, inIframe]);

  // Keep ref in sync so the auto re-subscribe effect can call latest subscribe
  useEffect(() => {
    subscribeRef.current = subscribe;
  }, [subscribe]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported || !user) return { ok: false };
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setIsSubscribed(false);
      setHasBrowserSubscription(false);
      setHasDbSubscription(false);
      setStatusReason("no_browser_sub");
      return { ok: true };
    } catch (e) {
      console.error("[push] unsubscribe error", e);
      return { ok: false };
    } finally {
      setLoading(false);
    }
  }, [isSupported, user]);

  return {
    isSupported,
    isSubscribed,
    permission,
    loading,
    inIframe,
    hasBrowserSubscription,
    hasDbSubscription,
    statusReason,
    subscribe,
    unsubscribe,
  };
}
