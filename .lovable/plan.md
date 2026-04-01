

## Root Cause

When the user clicks the password reset link from email, Supabase appends a `code` query parameter to the URL (PKCE flow). The current `ResetPassword.tsx` only listens for the `PASSWORD_RECOVERY` auth event but **never calls `supabase.auth.exchangeCodeForSession()`** to exchange that code for a valid session. Without this exchange, the recovery session is never established, the `PASSWORD_RECOVERY` event never fires, and the page times out showing "Liên kết không hợp lệ".

Additionally, `AuthContext.tsx` redirects to `/login` on `SIGNED_OUT` which could interfere during the recovery flow.

## Fix Plan

### 1. `src/pages/ResetPassword.tsx` — Add code exchange logic

In the `useEffect`, before listening for auth events, check for `code` in the URL query params and call `exchangeCodeForSession`:

```typescript
useEffect(() => {
  const init = async () => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        setReady(true);
        return;
      }
    }
    // Also check hash-based tokens (older Supabase flow)
    if (window.location.hash.includes('type=recovery')) {
      setReady(true);
    }
  };
  init();

  // Keep existing onAuthStateChange listener as fallback
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") {
      setReady(true);
    }
  });
  // ... rest unchanged
```

### 2. `src/contexts/AuthContext.tsx` — Skip redirect on `/reset-password`

In the `SIGNED_OUT` handler, check if the current path is `/reset-password` and skip the redirect:

```typescript
if (event === "SIGNED_OUT") {
  if (window.location.pathname !== "/reset-password") {
    toast.error("Phiên đăng nhập đã kết thúc...");
    window.location.href = "/login";
  }
}
```

### Summary

- **File 1**: `src/pages/ResetPassword.tsx` — add `exchangeCodeForSession(code)` call when `code` param exists
- **File 2**: `src/contexts/AuthContext.tsx` — prevent redirect to `/login` when on `/reset-password`

