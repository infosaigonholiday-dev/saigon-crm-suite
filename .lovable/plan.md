

# Plan: Fix slow loading, white screen after login, and module switching errors

## Root cause analysis

Three interconnected issues stem from the authentication and permission loading waterfall:

```text
Login success
  → onAuthStateChange fires → sets session → sets loading=false IMMEDIATELY
  → fetchRole runs async in setTimeout → userRole is still null
  → App renders ProtectedRoutes → PermissionGuard mounts
  → usePermissions sees userRole=null → returns empty permissions → loading=false
  → PermissionGuard redirects to "/" or shows blank
  → fetchRole finishes → userRole updates → but PermissionGuard already redirected
```

**Problem 1 - White screen after login**: `loading` is set to `false` before `fetchRole` completes. Components render with `userRole=null`, causing PermissionGuard to fail or redirect.

**Problem 2 - Slow module switching**: `usePermissions` runs 2 sequential DB queries (employees → employee_permissions) on EVERY route mount. Not cached at context level, so switching modules re-fetches each time.

**Problem 3 - Race condition**: Both `onAuthStateChange` and `getSession` independently set session and call fetchRole, causing duplicate fetches.

## Solution

### 1. Fix AuthContext - wait for role before setting loading=false

- Set up `onAuthStateChange` listener BEFORE calling `getSession` (already correct)
- On INITIAL_SESSION and SIGNED_IN events: fetch role FIRST, then set loading=false
- Remove the `setTimeout` wrapper around `fetchRole` - it's causing the race
- Remove the duplicate `getSession().then()` call - rely solely on `onAuthStateChange` with INITIAL_SESSION event
- Add an `authReady` flag that only becomes true when both session AND role are resolved

### 2. Create PermissionsContext - fetch once, cache globally

- Move `usePermissions` logic into a React Context (`PermissionsProvider`)
- Wrap it inside `AuthProvider` children in App.tsx
- The context fetches permissions ONCE when userRole changes (not per-route)
- All `PermissionGuard` and `AppSidebar` components consume from context (no duplicate queries)
- Use React Query with a long staleTime for the employee/permissions lookup

### 3. Gate dashboard queries with auth readiness

- Add `enabled: !!user && !!userRole` to all dashboard useQuery calls
- This prevents queries from firing before auth is ready (which causes RLS errors with null auth.uid())

## Files to modify

| # | File | Change |
|---|------|--------|
| 1 | `src/contexts/AuthContext.tsx` | Fix loading state to wait for role; remove race condition; handle INITIAL_SESSION properly |
| 2 | `src/contexts/PermissionsContext.tsx` | NEW - global permissions context with one-time fetch and caching |
| 3 | `src/hooks/usePermissions.ts` | Refactor to consume from PermissionsContext instead of fetching independently |
| 4 | `src/App.tsx` | Wrap with PermissionsProvider |
| 5 | `src/hooks/useDashboardData.ts` | Add `enabled: !!user && !!userRole` gates to all queries |

## Expected result

- Login → immediate transition to dashboard (no white screen, no reload needed)
- Module switching is instant (permissions cached in context, not re-fetched)
- No more RLS errors from premature queries with null auth.uid()

