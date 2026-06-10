# opencode-ide

Antigravity-style native shell around [opencode](https://github.com/sst/opencode). Vite + React 18 + TypeScript + shadcn-style components, wrapped in Electron.

## What it does

- Spawns `opencode serve` as a subprocess on a random loopback port
- Spawns Vite dev server on `http://localhost:5173` (dev) or loads `dist/` (prod)
- Proxies `/api/*` requests from renderer to the opencode port
- Shows a session sidebar (auto-persisted by opencode in `~/.local/share/opencode`)
- Lets you switch projects (working directory)
- Polls opencode session status (idle / busy / retry)

## Phase status

- **Phase 1 (current)**: scaffold, Electron shell, project picker, session list sidebar, status indicators
- Phase 2: streaming chat composer, message rendering, tool call cards
- Phase 3: model/agent picker, settings, command palette, keyboard shortcuts

## Run

```powershell
.\scripts\opencode-ide\opencode-ide.bat
# or with a specific project:
.\scripts\opencode-ide\opencode-ide.bat "C:\path\to\project"
```

Or web-only (no Electron):

```powershell
cd scripts\opencode-ide
npm install
npm run dev    # Vite on :5173, talks to opencode on :4096
```

## Architecture

```
┌──────────────────────────────────────────────────────┐
│  Electron main (src/main.js)                         │
│  ├─ spawn: opencode serve  (loopback, random port)   │
│  ├─ spawn: vite dev server  (5173)                   │
│  ├─ webRequest.onBeforeRequest: proxy /api/* → :port │
│  └─ BrowserWindow → http://localhost:5173            │
└──────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────┐
│  Renderer (React)                                    │
│  ├─ App.tsx     — layout, query client, IPC          │
│  ├─ sidebar     — session list, search, new session  │
│  ├─ topbar      — project / model / agent / status   │
│  ├─ cwd-picker  — first-run folder chooser           │
│  └─ empty-state — landing page                       │
└──────────────────────────────────────────────────────┘
```

## OpenCode HTTP API (used)

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/session` | GET | List sessions (filtered by cwd) |
| `/api/session` | POST | Create session |
| `/api/session/{id}` | GET | Session details |
| `/api/session/{id}/message` | GET | List messages (Phase 2) |
| `/api/session/{id}/prompt` | POST | Send prompt (Phase 2) |
| `/api/session/{id}/abort` | POST | Abort (Phase 2) |
| `/api/session/status` | GET | Live status of all sessions |
| `/api/config` | GET | Active model + agent |
| `/api/event` | GET | SSE event stream (Phase 2) |

## LocalStorage keys

- `opencode-ide:prefs:v1` — `{ cwd, model, agent, recentCwds, sidebarWidth }`
