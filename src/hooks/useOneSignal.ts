import { useCallback, useEffect, useRef, useState } from "react";
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
 * Đăng ký một global signal về kết quả init OneSignal (set bởi src/main.tsx).
 * Hook chỉ subscribe vào signal này, KHÔNG tự gọi OneSignal.init lần nữa.
 */
type OneSignalInitState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; sdk: OneSignalAPI }
  | { status: "error"; message: string };

declare global {
  interface Window {
    __oneSignalInitState?: OneSignalInitState;
    __oneSignalInitListeners?: Array<(s: OneSignalInitState) => void>;
  }
}

function getInitState(): OneSignalInitState {
  if (typeof window === "undefined") return { status: "idle" };
  return window.__oneSignalInitState ?? { status: "idle" };
}

function subscribeInitState(cb: (s: OneSignalInitState) => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.__oneSignalInitListeners = window.__oneSignalInitListeners || [];
  window.__oneSignalInitListeners.push(cb);
  // Phát ngay state hiện tại
  cb(getInitState());
  return () => {
    if (!window.__oneSignalInitListeners) return;
    window.__oneSignalInitListeners = window.__oneSignalInitListeners.filter((x) => x !== cb);
  };
}

export type PushSubscribeError =
  | "unsupported"
  | "not_configured"
  | "iframe"
  | "denied"
  | "init_failed"
  | "sdk_not_loaded"
  | "error";

export type UseOneSignalReturn = {
  isSupported: boolean;
  isReady: boolean;
  initError: string | null;
  isSubscribed: boolean;
  permission: NotificationPermission;
  loading: boolean;
  inIframe: boolean;
  configured: boolean;
  subscribe: () => Promise<{ ok: boolean; error?: PushSubscribeError; detail?: string }>;
  unsubscribe: () => Promise<{ ok: boolean }>;
};

export function useOneSignal(): UseOneSignalReturn {
  const [initState, setInitState] = useState<OneSignalInitState>(getInitState);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [loading, setLoading] = useState(false);
  const sdkRef = useRef<OneSignalAPI | null>(null);

  const isSupported =
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window;
  const inIframe = isInIframe();
  const configured = APP_ID.length > 0;

  // Subscribe vào init signal — không tự gọi init
  useEffect(() => {
    return subscribeInitState((s) => setInitState(s));
  }, []);

  // Khi SDK ready → đọc trạng thái subscription/permission + lắng nghe thay đổi
  useEffect(() => {
    if (initState.status !== "ready") return;
    const sdk = initState.sdk;
    sdkRef.current = sdk;

    try {
      setIsSubscribed(!!sdk.User?.PushSubscription?.optedIn);
      setPermission(sdk.Notifications?.permissionNative ?? Notification.permission);
    } catch (e) {
      console.warn("[onesignal] read initial state failed", e);
    }

    try {
      sdk.User?.PushSubscription?.addEventListener?.("change", (ev) => {
        setIsSubscribed(!!ev.current.optedIn);
      });
      sdk.Notifications?.addEventListener?.("permissionChange", (granted) => {
        setPermission(granted ? "granted" : Notification.permission);
      });
    } catch (e) {
      console.warn("[onesignal] addEventListener failed", e);
    }
  }, [initState]);

  const subscribe = useCallback(async (): Promise<{ ok: boolean; error?: PushSubscribeError; detail?: string }> => {
    if (!isSupported) return { ok: false, error: "unsupported" };
    if (!configured) return { ok: false, error: "not_configured" };
    if (inIframe) return { ok: false, error: "iframe" };
    if (initState.status === "error") {
      return { ok: false, error: "init_failed", detail: initState.message };
    }
    if (initState.status !== "ready" || !sdkRef.current) {
      return { ok: false, error: "sdk_not_loaded", detail: `init status: ${initState.status}` };
    }

    setLoading(true);
    try {
      const sdk = sdkRef.current;
      if (Notification.permission === "default") {
        const perm = await sdk.Notifications.requestPermission();
        setPermission(perm);
        if (perm !== "granted") return { ok: false, error: "denied" };
      } else if (Notification.permission === "denied") {
        setPermission("denied");
        return { ok: false, error: "denied" };
      }

      await sdk.User.PushSubscription.optIn();
      setIsSubscribed(true);
      return { ok: true };
    } catch (e: any) {
      console.error("[onesignal] subscribe failed", e);
      return { ok: false, error: "error", detail: e?.message || String(e) };
    } finally {
      setLoading(false);
    }
  }, [isSupported, configured, inIframe, initState]);

  const unsubscribe = useCallback(async (): Promise<{ ok: boolean }> => {
    if (initState.status !== "ready" || !sdkRef.current) return { ok: false };
    setLoading(true);
    try {
      await sdkRef.current.User.PushSubscription.optOut();
      setIsSubscribed(false);
      return { ok: true };
    } catch (e) {
      console.error("[onesignal] unsubscribe failed", e);
      return { ok: false };
    } finally {
      setLoading(false);
    }
  }, [initState]);

  return {
    isSupported,
    isReady: initState.status === "ready",
    initError: initState.status === "error" ? initState.message : null,
    isSubscribed,
    permission,
    loading,
    inIframe,
    configured,
    subscribe,
    unsubscribe,
  };
}
