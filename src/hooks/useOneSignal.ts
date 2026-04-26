import { useCallback, useEffect, useState } from "react";
import type { OneSignalAPI } from "@/types/onesignal";

const APP_ID = (import.meta.env.VITE_ONESIGNAL_APP_ID as string | undefined)?.trim() ?? "";

function isInIframe(): boolean {
  try {
    return typeof window !== "undefined" && window.top !== window.self;
  } catch {
    return true;
  }
}

/**
 * Chờ OneSignal SDK sẵn sàng (script CDN load + init xong).
 * Trả về OneSignal API instance hoặc null nếu không có.
 */
function whenOneSignalReady(): Promise<OneSignalAPI | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(null);
      return;
    }
    if (window.OneSignal) {
      resolve(window.OneSignal);
      return;
    }
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push((OneSignal) => {
      resolve(OneSignal);
    });
    // safety timeout — SDK không load được (chặn bởi adblock, mạng…)
    setTimeout(() => resolve(window.OneSignal ?? null), 10000);
  });
}

export type UseOneSignalReturn = {
  isSupported: boolean;
  isReady: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission;
  loading: boolean;
  inIframe: boolean;
  configured: boolean;
  subscribe: () => Promise<{ ok: boolean; error?: string }>;
  unsubscribe: () => Promise<{ ok: boolean }>;
};

export function useOneSignal(): UseOneSignalReturn {
  const [isReady, setIsReady] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [loading, setLoading] = useState(false);

  const isSupported =
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window;
  const inIframe = isInIframe();
  const configured = APP_ID.length > 0;

  useEffect(() => {
    if (!isSupported || !configured) return;

    let cancelled = false;
    (async () => {
      const OneSignal = await whenOneSignalReady();
      if (cancelled || !OneSignal) return;

      setIsReady(true);
      try {
        setIsSubscribed(!!OneSignal.User.PushSubscription.optedIn);
        setPermission(OneSignal.Notifications.permissionNative ?? Notification.permission);
      } catch {
        // ignore
      }

      // Lắng nghe thay đổi subscription (user opt-in/out, browser revoke…)
      try {
        OneSignal.User.PushSubscription.addEventListener("change", (ev) => {
          setIsSubscribed(!!ev.current.optedIn);
        });
        OneSignal.Notifications.addEventListener("permissionChange", (granted) => {
          setPermission(granted ? "granted" : Notification.permission);
        });
      } catch (e) {
        console.warn("[onesignal] addEventListener failed", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isSupported, configured]);

  const subscribe = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    if (!isSupported) return { ok: false, error: "unsupported" };
    if (!configured) return { ok: false, error: "not_configured" };
    if (inIframe) return { ok: false, error: "iframe" };

    setLoading(true);
    try {
      const OneSignal = await whenOneSignalReady();
      if (!OneSignal) return { ok: false, error: "sdk_not_loaded" };

      // Yêu cầu permission nếu chưa có
      if (Notification.permission === "default") {
        const perm = await OneSignal.Notifications.requestPermission();
        setPermission(perm);
        if (perm !== "granted") return { ok: false, error: "denied" };
      } else if (Notification.permission === "denied") {
        setPermission("denied");
        return { ok: false, error: "denied" };
      }

      await OneSignal.User.PushSubscription.optIn();
      setIsSubscribed(true);
      return { ok: true };
    } catch (e: any) {
      console.error("[onesignal] subscribe failed", e);
      return { ok: false, error: e?.message || "error" };
    } finally {
      setLoading(false);
    }
  }, [isSupported, configured, inIframe]);

  const unsubscribe = useCallback(async (): Promise<{ ok: boolean }> => {
    if (!isSupported || !configured) return { ok: false };
    setLoading(true);
    try {
      const OneSignal = await whenOneSignalReady();
      if (!OneSignal) return { ok: false };
      await OneSignal.User.PushSubscription.optOut();
      setIsSubscribed(false);
      return { ok: true };
    } catch (e) {
      console.error("[onesignal] unsubscribe failed", e);
      return { ok: false };
    } finally {
      setLoading(false);
    }
  }, [isSupported, configured]);

  return {
    isSupported,
    isReady,
    isSubscribed,
    permission,
    loading,
    inIframe,
    configured,
    subscribe,
    unsubscribe,
  };
}
