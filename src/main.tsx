import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// 1) Cleanup service worker cũ thời VAPID (`/sw.js`) — nếu còn cài trên thiết bị
//    user, chúng sẽ chiếm scope "/" và chặn OneSignal đăng ký SW của nó.
//    Chạy 1 lần khi app load, không await để không chặn render.
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then(async (regs) => {
      for (const reg of regs) {
        const url = reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL || "";
        // Chỉ unregister SW VAPID cũ (`/sw.js`). KHÔNG đụng vào OneSignalSDKWorker.js.
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

// 2) Khởi tạo OneSignal Web SDK v16. SDK tự đăng ký /OneSignalSDKWorker.js
//    Khai báo explicit serviceWorkerPath để chắc chắn không chạy default khác.
const ONESIGNAL_APP_ID = (import.meta.env.VITE_ONESIGNAL_APP_ID as string | undefined)?.trim();
if (typeof window !== "undefined" && ONESIGNAL_APP_ID) {
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async (OneSignal) => {
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
    } catch (e) {
      console.error("[onesignal] init failed", e);
    }
  });
} else if (!ONESIGNAL_APP_ID) {
  console.warn("[onesignal] VITE_ONESIGNAL_APP_ID is missing — push notifications disabled");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

