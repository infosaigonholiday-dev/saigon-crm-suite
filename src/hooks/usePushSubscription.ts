import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const VAPID_PUBLIC_KEY =
  (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ||
  "BNpfULcP4VHvXsJez4GYvQLR_6uhSW6vWPzSo9QiZW5T7toIMU-YaJkX5ue4EI96HFJHclyVslPdXpdFe3tEXJ4";

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

export function usePushSubscription() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setIsSupported(supported);
    if (supported) setPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (!isSupported) return;
    (async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration("/sw.js");
        const sub = await reg?.pushManager.getSubscription();
        setIsSubscribed(!!sub);
      } catch {
        setIsSubscribed(false);
      }
    })();
  }, [isSupported]);

  const subscribe = useCallback(async () => {
    if (!isSupported || !user) return { ok: false, error: "unsupported" as const };
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setLoading(false);
        return { ok: false, error: "denied" as const };
      }

      let reg = await navigator.serviceWorker.getRegistration("/sw.js");
      if (!reg) reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        const keyBytes = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        // Copy into a fresh ArrayBuffer to satisfy BufferSource typing
        const keyBuffer = new ArrayBuffer(keyBytes.byteLength);
        new Uint8Array(keyBuffer).set(keyBytes);
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyBuffer,
        });
      }

      const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      const endpoint = json.endpoint || sub.endpoint;
      const p256dh =
        json.keys?.p256dh || bufToBase64(sub.getKey ? sub.getKey("p256dh") : null);
      const authKey =
        json.keys?.auth || bufToBase64(sub.getKey ? sub.getKey("auth") : null);

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
      if (error) throw error;
      setIsSubscribed(true);
      return { ok: true as const };
    } catch (e) {
      console.error("[push] subscribe error", e);
      return { ok: false, error: "error" as const };
    } finally {
      setLoading(false);
    }
  }, [isSupported, user]);

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
      return { ok: true };
    } catch (e) {
      console.error("[push] unsubscribe error", e);
      return { ok: false };
    } finally {
      setLoading(false);
    }
  }, [isSupported, user]);

  return { isSupported, isSubscribed, permission, loading, subscribe, unsubscribe };
}
