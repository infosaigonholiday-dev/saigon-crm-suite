import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// 1) Cleanup service worker cũ thời VAPID (`/sw.js`) — nếu còn cài trên thiết bị
//    user, chúng sẽ chiếm scope "/" và chặn OneSignal đăng ký SW của nó.
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then(async (regs) => {
      for (const reg of regs) {
        const url = reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL || "";
        if (url.endsWith("/sw.js")) {
          try {
            await reg.unregister();
            console.log("[push] cleaned up legacy VAPID service worker:", url);
          } catch (e) {
            console.warn("[push] failed to unregister legacy SW", e);
          }
        }
      }
    })
    .catch((e) => console.warn("[push] getRegistrations failed", e));
}

// 2) Khởi tạo OneSignal Web SDK v16 + lưu trạng thái init vào window để hook đọc.
//    Tách "SDK loaded" và "SDK init success" — nhiều hệ thống nhầm 2 cái này.
type InitState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; sdk: any }
  | { status: "error"; message: string };

function setInitState(state: InitState) {
  if (typeof window === "undefined") return;
  (window as any).__oneSignalInitState = state;
  const listeners = ((window as any).__oneSignalInitListeners ?? []) as Array<(s: InitState) => void>;
  for (const cb of listeners) {
    try {
      cb(state);
    } catch (e) {
      console.warn("[onesignal] listener error", e);
    }
  }
}

const ONESIGNAL_APP_ID = (import.meta.env.VITE_ONESIGNAL_APP_ID as string | undefined)?.trim();
if (typeof window !== "undefined") {
  if (!ONESIGNAL_APP_ID) {
    setInitState({ status: "error", message: "VITE_ONESIGNAL_APP_ID is missing in .env" });
    console.warn("[onesignal] VITE_ONESIGNAL_APP_ID is missing — push notifications disabled");
  } else {
    setInitState({ status: "loading" });
    (window as any).OneSignalDeferred = (window as any).OneSignalDeferred || [];
    (window as any).OneSignalDeferred.push(async (OneSignal: any) => {
      try {
        await OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          allowLocalhostAsSecureOrigin: true,
          notifyButton: { enable: false },
          autoResubscribe: true,
          serviceWorkerPath: "/OneSignalSDKWorker.js",
          serviceWorkerParam: { scope: "/" },
        });
        console.log("[onesignal] initialized");
        setInitState({ status: "ready", sdk: OneSignal });
      } catch (e: any) {
        const msg = e?.message || String(e);
        console.error("[onesignal] init failed:", msg);
        setInitState({ status: "error", message: msg });
      }
    });

    // Safety: nếu CDN script không load nổi sau 15s → đánh dấu lỗi
    setTimeout(() => {
      const cur = (window as any).__oneSignalInitState as InitState | undefined;
      if (cur?.status === "loading") {
        setInitState({
          status: "error",
          message: "OneSignal SDK không tải được sau 15 giây (có thể do mạng hoặc adblock)",
        });
      }
    }, 15000);
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
