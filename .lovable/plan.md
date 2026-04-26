1. Confirm and isolate the failure state
- Treat the current root cause as a OneSignal configuration failure, not just a UI issue: browser logs show `[onesignal] init failed: App not configured for web push`.
- Verify whether the broken state affects only preview/Lovable domain or also `app.saigonholiday.vn`, and note that worker file delivery is already correct.

2. Harden the frontend OneSignal lifecycle
- Update `src/main.tsx` and `src/hooks/useOneSignal.ts` so the app tracks real SDK init success/failure instead of assuming `window.OneSignal` means ready.
- Add an explicit `initStatus` model such as `idle | loading | ready | error` and surface the actual error message.
- Prevent `subscribe()` / `unsubscribe()` from running when SDK init failed, timed out, or never completed.
- Ensure loading state always resets, even if OneSignal is partially loaded but not initialized.

3. Fix the notification UI behavior
- Update `PushToggleButton` and `PushNotificationToggle` so they stop showing an endless spinner and instead display a clear trạng thái lỗi.
- Show a specific message for this case, e.g. “OneSignal chưa bật Web Push trong dashboard” instead of generic retry text.
- Disable the toggle/button when init is in error state, and keep the current iframe / permission-denied guidance.

4. Add lightweight diagnostics for future debugging
- Log a stable frontend error code/message when OneSignal init fails.
- Optionally expose a small status line in Settings > Notifications showing SDK state, permission, subscription state, and init error.
- Keep backend push logging (`push_send_log`) as-is for delivery debugging after subscription is fixed.

5. External config to verify outside code
- In OneSignal dashboard, enable Web Push for the app and verify the web platform/origin setup matches the production domain.
- Re-test on `https://app.saigonholiday.vn` in a real top-level tab after the UI hardening is shipped.

Technical details
- Likely bug in current code: `whenOneSignalReady()` resolves as soon as `window.OneSignal` exists or deferred queue flushes, but that does not guarantee `OneSignal.init()` succeeded.
- Because of that, `useOneSignal()` may mark SDK as ready and allow opt-in calls even when init already failed with `App not configured for web push`.
- The fix should separate “SDK object available” from “SDK initialized successfully”.

Expected outcome
- No more endless spinning.
- Notification controls clearly explain why push cannot be enabled.
- Once Web Push is enabled in OneSignal dashboard, the same UI should recover cleanly and allow subscription.