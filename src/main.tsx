import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Khởi tạo OneSignal Web SDK v16. SDK tự đăng ký service worker /OneSignalSDKWorker.js
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
