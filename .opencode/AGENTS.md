# Saigon CRM Suite - OpenCode Agent Guide

## Project context
- **Stack**: Vite + React 18 + TypeScript + shadcn/ui + Supabase (Postgres + Auth + Edge Functions + Realtime)
- **Domain**: CRM for a Saigon-based tour operator (Bookings, Customers, Leads, Vendors, HR, Payroll, KPI)
- **Language**: UI is in Vietnamese (vi-VN); code/comments in English
- **Supabase project ref**: `aneazkhnqkkpqtcxunqd`

## Conventions
- Use shadcn/ui components from `src/components/ui/`
- Forms: react-hook-form + zod resolvers
- Data fetching: @tanstack/react-query via `useScopedQuery` hook
- Auth: `useAuth()` from `src/contexts/AuthContext.tsx`
- Permissions: `usePermissions()` for role-based UI gates
- Supabase client: `src/integrations/supabase/client.ts`
- Types: `src/integrations/supabase/types.ts` (regenerate with `/db-types`)

## Available MCP tools

### `supabase` (remote, OAuth)
- Authenticate once: `opencode mcp auth supabase` (or accept browser prompt on first use)
- Tools: list tables, inspect schema, run SQL, generate TypeScript types, manage RLS
- Project-scoped to `aneazkhnqkkpqtcxunqd` via URL parameter

### `github` (local stdio, PAT-based)
- Token loaded from `~/.config/opencode/github-token` via `opencode.jsonc` file substitution
- Tools: issues, PRs, code review, branch/commit operations

## Available agents
- `build` (default) - full access
- `plan` - read-only planning
- `db` - database specialist (migrations, schema, RLS)
- `review` - read-only code reviewer

## Available commands (slash)
- `/db-types` - regenerate Supabase TS types
- `/db-schema` - show current schema
- `/migrate` - scaffold a new migration file
- `/review-pr <number>` - review a GitHub PR

## How to run
Use the wrapper to auto-load `.env`:
```
.\scripts\opencode.ps1              # launch web GUI (recommended default)
.\scripts\opencode.ps1 tui          # launch TUI
.\scripts\opencode.ps1 run "..."    # one-shot
.\scripts\opencode.ps1 continue     # resume last session
.\scripts\opencode.ps1 sessions     # list sessions
.\scripts\opencode.ps1 export <sid> # export session JSON
.\scripts\opencode.ps1 snapshot     # snapshot workspace state
.\scripts\opencode.ps1 ide [dir]    # launch Antigravity-style IDE (Phase 1: shell + sidebar)
```

Or launch the Antigravity-style **native desktop shell** (legacy, embeds `opencode web`):
```
.\scripts\opencode-desktop\opencode-desktop.bat                       # opens in repo root
.\scripts\opencode-desktop\opencode-desktop.bat "C:\path\to\project" # opens in any folder
```

Or launch the **new custom IDE** (Vite + React, uses `opencode serve` API):
```
.\scripts\opencode-ide\opencode-ide.bat                       # opens in repo root
.\scripts\opencode-ide\opencode-ide.bat "C:\path\to\project" # opens in any folder
```

Or just `opencode` directly (env vars from `.env` won't be loaded then).

## opencode-ide
- Lives in `scripts/opencode-ide/`
- Vite + React 18 + TS + shadcn-style components + Electron shell
- Spawns `opencode serve` (loopback, random port) and Vite dev server (5173)
- Electron `webRequest.onBeforeRequest` proxies `/api/*` from renderer → opencode port
- See `scripts/opencode-ide/README.md` for endpoints used + phase plan

## Don't
- Don't commit `.env`, `.env.local`, `.env.production`
- Don't edit `src/integrations/supabase/types.ts` by hand (regenerate)
- Don't run `DROP TABLE` / `DROP COLUMN` without explicit user OK
- Don't disable RLS on any table

## opencode-ide Phase 1 — done
- Scaffold: Vite + React 18 + TS + Tailwind, 322KB bundle (101KB gzip)
- Electron shell (`src/main.js`): spawns `opencode serve` + Vite, loads `http://localhost:5173`
- CORS proxy via `webRequest.onBeforeRequest` for `/api/*`
- UI: cwd picker, session list sidebar (grouped by date, status dots, search), topbar (project/agent/model/status), empty state
- Prefs persisted in `localStorage` (`opencode-ide:prefs:v1`)
- Next: Phase 2 — streaming chat composer + message renderer + tool cards
