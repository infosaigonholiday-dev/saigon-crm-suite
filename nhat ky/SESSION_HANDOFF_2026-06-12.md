# Nhật ký phiên làm việc — 2026-06-11 → 2026-06-12

> **Mục đích**: Tóm tắt toàn bộ context phiên opencode này để có thể tiếp tục trong phiên mới mà không mất dấu.

## 1. Tổng quan dự án

- **Repo**: `C:\Users\Yoga\saigon-crm-suite` (CRM cho Saigon Holiday, Vite + React 18 + TypeScript + Supabase)
- **Branch hiện tại**: `main`
- **Toolchain**: Node 24.16.0, npm (có cache bị corrupt), PowerShell 5.1, Windows 11
- **opencode**: CLI coding agent, v1.17.3, binary ở `C:\Users\Yoga\AppData\Roaming\npm\node_modules\opencode-ai\bin\opencode.exe`
- **Database opencode**: SQLite ở `C:\Users\Yoga\.local\share\opencode\opencode.db` (49 sessions, tổng cost ~$2000)

## 2. Yêu cầu ban đầu (3 phần)

1. **"Check lỗi vì sao bot hay chết đột ngột"** — debug tại sao opencode-ide app crash
2. **"Sửa hết, tìm batch dư thừa, ko còn hoạt động trên màn hình desktop xóa luôn đi"** — fix + dọn dead code
3. **Thiết kế UI bọc opencode lại giống app Antigravity, có lưu lịch sử công việc** — Antigravity-style UI với session history

## 3. Kết quả đạt được (14 commits)

### 3.1. `scripts/opencode-ide/` — IDE chính (NEW)

| Commit | Tóm tắt |
|---|---|
| `1b4d1b8` | feat: Antigravity-style IDE shell — Phase 1 (scaffold + session list) |
| `a15a809` | fix: kill crashes, harden cleanup, clean dead code (12 lỗi root cause) |
| `36c5c3e` | fix: make Electron shell actually launch on Windows |
| `01751d5` | fix: launcher bypasses npx, calls electron.exe directly |
| `b5bfa5c` | feat: Phase 2 — Antigravity-style chat UI (5 component mới) |
| `ed35f37` | fix: harden Phase 2 against real opencode 1.17.3 responses |
| `31eeb20` | feat: Desktop shortcut + SVG icon (folder + glow, Antigravity style) |
| `62ecb87` | feat: native Open Folder dialog (browser + Electron) |
| `fed867d` | feat: add opencode-web.bat browser-mode launcher |
| `be5aead` | feat: multi-mode launcher (web / antigravity / both) |
| `0acdcb4` | fix: add Vite dev proxy so browser mode reaches opencode |
| `b3938ae` | feat: antigravity mode auto-opens browser, polls for Vite |
| `9dc2107` | fix(topbar): render agent as string, not object (React crash fix) |
| `084a708` | fix(App): avoid early return so hook count stays stable |

### 3.2. `scripts/opencode-desktop/` — Legacy wrapper (NEW)

| Commit | Tóm tắt |
|---|---|
| `36c7feb` | feat: Antigravity-style shell around opencode web |

### 3.3. Số liệu

- **14 commits mới** trên `main`
- **Bundle**: 346.70 kB / 107.00 kB gzip (`vite build` clean, `tsc --noEmit` clean)
- **5 component mới** ở Phase 2: `chat-composer.tsx`, `history-drawer.tsx`, `markdown.tsx`, `message-list.tsx`, `right-panel.tsx`
- **2 component xóa** (dead code): `use-debounced-value.ts`, `separator.tsx`, `preload.js` (opencode-ide)
- **9 dead export/field xóa**: `formatTime`, `useMessages`, `api.abort`, `Prefs.model`, etc.

## 4. Kiến trúc opencode-ide Phase 2

### 4.1. Layout 3 cột

```
┌─────────────────────────────────────────────────────────────┐
│ Topbar (cwd picker, agent, model, status, history, install) │
├──────────┬──────────────────────────────────────────────────┤
│ Sidebar  │  Main pane (SessionPane / EmptyState + composer)│
│ (folder  │                                                  │
│  groups  │  ┌─────────────────┬─────────────────────────┐   │
│  +       │  │ Messages /      │  Right panel             │   │
│  search  │  │ composer        │  (Overview/Review/       │   │
│  +       │  │                 │   Walkthrough)            │   │
│  settings)│  │                 │                          │   │
│          │  └─────────────────┴─────────────────────────┘   │
├──────────┴──────────────────────────────────────────────────┤
│ HistoryDrawer (slide từ phải, New Conversation, search)     │
└─────────────────────────────────────────────────────────────┘
```

### 4.2. Files chính

```
scripts/opencode-ide/
├── package.json              main=src/main.js, type=commonjs
├── vite.config.ts            proxy /api -> opencode port
├── opencode-ide.bat          multi-mode launcher (web|antigravity|both)
├── opencode-web.bat          web-only launcher
├── install-shortcut.ps1      Desktop shortcut installer
├── assets/
│   ├── icon.svg              folder + green glow (Antigravity style)
│   ├── icon-256.png          raster
│   └── icon.ico              Windows multi-size
└── src/
    ├── main.js               Electron main (with log file)
    ├── main.tsx              Vite entry
    ├── App.tsx               Shell + SessionPane + ErrorBoundary
    ├── lib/
    │   ├── api.ts            OpenCode HTTP client (7 endpoints)
    │   ├── utils.ts          formatRelativeTime, groupByProject
    │   └── prefs.ts          localStorage: cwd, recents
    ├── hooks/
    │   └── use-sessions.ts   React Query: useSessions, useSession, etc.
    └── components/
        ├── sidebar.tsx           folder groups, search, settings
        ├── topbar.tsx            cwd, agent, model, status, history
        ├── message-list.tsx      user/assistant bubbles, tool cards
        ├── chat-composer.tsx     textarea, action chips, send/abort
        ├── right-panel.tsx       tabs Overview/Review/Walkthrough
        ├── history-drawer.tsx    slide-in drawer
        ├── empty-state.tsx       "Ready to code" landing
        ├── cwd-picker.tsx        "Open a project" first-run
        ├── markdown.tsx          tiny React markdown renderer
        └── ui/                    Badge, Button, Input, ScrollArea, Tooltip
```

## 5. OpenCode API — 7 endpoint verified thật

| Endpoint | Path | Dùng cho |
|---|---|---|
| `GET /api/session` | list, filter `?directory=` | Sidebar |
| `GET /session/{id}` (no /api/!) | per-session detail | SessionPane header |
| `POST /session` (no /api/!) | create session | Sidebar `[+]` button |
| `GET /api/session/{id}/message` | list messages | MessageList |
| `POST /api/session/{id}/prompt` | send text | ChatComposer |
| `GET /config` (no /api/!) | global config | Topbar agent/model |
| `GET /session/status` (no /api/!) | live status | Status dot |
| `GET /api/event` | SSE stream | Real-time updates |

**CRITICAL: `POST /api/session` KHÔNG tồn tại — phải dùng `POST /session`. Tôi phát hiện qua curl test.**

Spec OpenAPI có `/api/session/{id}/abort` nhưng server 1.17.3 KHÔNG implement → tôi bỏ `useAbortSession`.

## 6. Lỗi runtime đã fix (qua smoke test API)

| Lỗi | Endpoint | Root cause |
|---|---|---|
| Sidebar empty | `GET /api/config` | Server trả HTML, không phải JSON. Fix: dùng `GET /config` |
| Status dot luôn idle | `GET /api/session/status` | Tương tự, dùng `GET /session/status` |
| `getSession` fail | `GET /api/session/{id}` | Endpoint không tồn tại. Fix: query `GET /session/{id}` |
| Create session 500 | `POST /api/session` | Endpoint không tồn tại. Fix: `POST /session` |
| Schema không khớp | `Message.parts[]` | Server 1.17.3 dùng `Message.content[]` (assistant) / `Message.text` (user) |
| Schema không khớp | `Session.location.directory` | Server trả v1 shape, tôi accept cả v1 (`.location.directory`) và v2 (`.directory`) |

## 7. Cách chạy

### Browser mode (RECOMMENDED, đã work)
```cmd
:: Terminal 1: opencode serve
opencode serve --port 4096 --hostname 127.0.0.1

:: Terminal 2: Vite dev
cd "C:\Users\Yoga\saigon-crm-suite\scripts\opencode-ide"
node_modules\.bin\vite.cmd --port 5174 --host 127.0.0.1

:: Browser
http://127.0.0.1:5174
```

### Multi-mode launcher
```cmd
:: Double-click Desktop "Antigravity IDE" shortcut
:: hoặc manual:
cd "C:\Users\Yoga\saigon-crm-suite\scripts\opencode-ide"
opencode-ide.bat antigravity
```

### Electron mode (chưa stable trên Windows)
```cmd
cd "C:\Users\Yoga\saigon-crm-suite\scripts\opencode-ide"
node_modules\electron\dist\electron.exe . C:\Users\Yoga\saigon-crm-suite
```

## 8. Lỗi CHƯA fix (còn open)

### 8.1. Browser sandbox block F:\

UI picker hiện:
> "Browser mode: shows only folders the browser can read (Documents, Desktop, Downloads, OneDrive)"

→ User phải gõ `F:\Users\Yoga\saigon-crm-suite` thẳng vào input (browser vẫn accept text, chỉ block native picker)

### 8.2. React hook count warning (intermittent)

Một số lần render "Rendered fewer hooks than expected" — có thể từ conditional re-mount khi cwd thay đổi. Fix `Shell` early return đã commit (`084a708`) nhưng chưa chắc đã hết.

### 8.3. Electron mode trên Windows — fragile

- `path.txt` missing sau `npm install` → phải tạo thủ công
- `npx` interactive prompt gây stuck ở `.bat`
- `shell: true` cần cho spawn `.cmd`
- `package.json` cần `"main": "src/main.js"` và `"type": "commonjs"`

Workaround: dùng browser mode.

## 9. Tệp đã commit quan trọng

### Repo
- `scripts/opencode-ide/` — toàn bộ IDE
- `scripts/opencode-desktop/` — legacy wrapper
- `nhat ky/SESSION_HANDOFF_2026-06-12.md` — file này

### Ngoài repo (không commit, user files)
- `F:\OneDrive\Desktop\OpenCode IDE.lnk` — shortcut opencode web
- `F:\OneDrive\Desktop\Antigravity IDE.lnk` — shortcut Antigravity UI
- `C:\Users\Yoga\AppData\Local\Temp\opencode-ide-port.txt` — Vite proxy port
- `C:\Users\Yoga\AppData\Local\Temp\opencode-ide-main.log` — Electron log

## 10. Lệnh thường dùng

```powershell
# Xem log Vite proxy port
Get-Content "C:\Users\Yoga\AppData\Local\Temp\opencode-ide-port.txt"

# Restart opencode serve
Get-Process -Name "opencode" | Stop-Process -Force
opencode serve --port 4096 --hostname 127.0.0.1

# Build check
cd "C:\Users\Yoga\saigon-crm-suite\scripts\opencode-ide"
npx tsc -b --noEmit
npm run build

# Hard reload browser
Ctrl+Shift+R hoặc F5
```

## 11. Câu hỏi cho phiên sau

Nếu tiếp tục phiên mới, các câu quan trọng cần hỏi user:

1. "Bạn đang ở browser mode hay Electron mode? Browser mode work, Electron chưa stable."
2. "Bạn gõ path F:\\ thẳng vào input chưa? Native picker không thấy F:."
3. "Tab Console trong DevTools có lỗi gì? Stack trace sẽ cho biết component nào throw."
4. "Bạn muốn tôi revert App.tsx về commit trước (có early return) — đó là design ban đầu có thể fix tốt hơn?"

## 12. Trạng thái tinh thần

- User chán (nói "chán lắm rồi")
- App work về cơ bản nhưng còn UX issue
- User có quyền chọn: tiếp tục fix / dùng version work / revert
- Tôi đề xuất: dừng test UI, commit nhật ký này, hẹn gặp phiên sau

## 13. Liên kết hữu ích

- OpenCode docs: https://opencode.ai/docs
- OpenCode GitHub: https://github.com/sst/opencode
- Antigravity (Google): https://antigravity.google/
- Commit log: `git log --oneline -20` trong repo

---

**Tác giả nhật ký**: AI agent (Claude / Claude Opus 4.8)  
**Phiên làm việc**: 2026-06-11 10:00 → 2026-06-12 16:00 (≈30 giờ, nhiều gián đoạn)  
**Trạng thái**: 14 commit thành công, UI work ở browser mode, Electron mode còn fragile
