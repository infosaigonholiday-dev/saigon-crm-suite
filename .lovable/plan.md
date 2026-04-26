1. Align the OneSignal app across frontend and backend
- Update the frontend push config to use the new App ID `5eb732df-76ec-4fa9-8741-115270a39c66` instead of the stale ID currently referenced in the project.
- Update the backend push configuration so the database-triggered send path uses the same OneSignal app and the new REST key you provided.
- Keep the existing worker file and SDK script loading in place, because both are already present and correctly wired.

2. Fix the toggle behavior completely
- Keep the notification toggle usable for the permission-request flow instead of blocking it in the wrong states.
- Ensure the enable flow is:
  - click toggle
  - call `OneSignal.Notifications.requestPermission()` when browser permission is `default`
  - after user presses Allow, re-read browser permission and opt the user into push
  - switch UI to “Đã bật thông báo” when subscription succeeds
- Keep blocking only for hard-stop cases such as browser-denied permission or iframe/editor limitations.
- Improve error messages so SDK init failure, permission denial, and “SDK not ready yet” are shown as distinct states.

3. Sync the backend delivery path with the new app
- Add a migration that updates the current `system_config` values used by `notify_push_on_insert()` so pushes are sent to the same OneSignal app the browser is subscribing to.
- Preserve the existing notification architecture: app inserts into `notifications` → DB trigger sends push → `push_send_log` remains available for diagnostics.
- Make sure daily reminders continue to work without separate push logic, since they already rely on inserts into `notifications`.

4. Clean up OneSignal typing and consistency gaps
- Correct the local OneSignal v16 type declarations so `requestPermission()` matches the real SDK behavior used by the hook.
- Remove stale assumptions and copy that still reflect the old configuration path.
- Keep the current service worker path (`/OneSignalSDKWorker.js`) and SDK page script unchanged unless verification proves otherwise.

5. Verify end-to-end after the fix
- Confirm SDK init succeeds with the new App ID.
- Confirm browser permission moves from `default` to `granted` after the prompt.
- Confirm service worker registration includes OneSignal’s worker.
- Confirm the toggle changes to enabled state after opt-in.
- Confirm at least one real notification path can reach the same OneSignal app configuration.

Technical details
- Current confirmed mismatch:
  - Frontend config still references `6d188763-a8d6-40c3-b5c2-3a1ca9f5fa4f`
  - You provided the correct app as `5eb732df-76ec-4fa9-8741-115270a39c66`
- Backend also has stale seeded values in the push config migration, so fixing only the frontend would still leave server-side sends pointed at the wrong OneSignal app.
- Already verified as correct:
  - `public/OneSignalSDKWorker.js` exists and imports OneSignal SDK v16 worker
  - `index.html` loads `https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js`
  - current push architecture uses `notify_push_on_insert()` and `push_send_log`

Expected outcome
- Toggle can request permission properly.
- OneSignal initializes against the correct app.
- Browser subscription and server-side delivery point to the same OneSignal project.
- “Đã bật thông báo / Tắt thông báo” works as expected instead of getting stuck in a broken state.