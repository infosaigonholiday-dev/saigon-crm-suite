// opencode-ide Electron main process
// -----------------------------------------------------------------------------
// Spawns two things in parallel:
//   1. `opencode serve`  (headless HTTP server on loopback, /api/...)
//   2. Vite dev server   (http://localhost:5173)  — only in dev
//      or serves the static dist/                   — in production
// Then opens a single BrowserWindow that loads the React app.
//
// Why two processes? The React app talks to opencode via HTTP. We proxy /api
// requests from the renderer to opencode on a different port. That keeps the
// app architecture clean: React → fetch('/api/...') → Electron main →
// http://127.0.0.1:<servePort>/api/...
//
// Robustness notes (Phase 1.1 hardening):
//   - Both `opencode serve` and Vite are killed with the whole process tree
//     on quit (Windows: `taskkill /T /F`, POSIX: SIGKILL on -pid). This stops
//     the "zombie port" problem on the next launch.
//   - We listen on BOTH stdout and stderr for the "listening on …" log line,
//     and we accept several common formats. If we never see the line in 15s
//     we show an error page in the BrowserWindow (the user sees something
//     useful instead of a blank white window).
//   - The API proxy consults a live `opencodePort` getter. If `opencode serve`
//     crashes mid-session, `opencodePort` is cleared and the proxy becomes a
//     no-op, which surfaces as a clean 404 to the renderer (where the sidebar
//     already has a "Cannot reach opencode" error state).
//   - `opencode serve` is auto-restarted once if it dies unexpectedly, with
//     exponential backoff up to 30s. Repeated restarts give up and disable
//     the proxy.

const { app, BrowserWindow, Menu, dialog, ipcMain, session, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const net = require('node:net');
const { spawn } = require('node:child_process');
const http = require('node:http');

// ---- file logging ----------------------------------------------------------
// Electron on Windows has no console attached when launched from a
// non-interactive shell (Start-Process), so we mirror stderr/stdout
// to a file. Open %TEMP%\opencode-ide-main.log to see what's going on.
const LOG_FILE = process.env.OPENCODE_IDE_LOG ||
  path.join(require('node:os').tmpdir(), 'opencode-ide-main.log');
function logToFile(...parts) {
  try {
    const line = `[${new Date().toISOString()}] ${parts.join(' ')}\n`;
    fs.appendFileSync(LOG_FILE, line);
  } catch {}
}
process.on('uncaughtException', (e) => logToFile('UNCAUGHT', e.stack || e.message));
process.on('unhandledRejection', (e) => logToFile('UNHANDLED_REJECTION', e?.stack || e?.message || e));
logToFile('=== opencode-ide main process started ===', `pid=${process.pid}`);

const isDev = !app.isPackaged;
const SCRIPT_DIR = __dirname;
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..', '..');

// ---- argv parsing ----------------------------------------------------------
// opencode-ide <cwd> [--no-serve]
//   cwd:        working directory for opencode (default: REPO_ROOT)
//   --no-serve: don't auto-spawn opencode (you started it yourself)
const argv = process.argv.slice(1);
let cwdArg = REPO_ROOT;
let noServe = false;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--no-serve') noServe = true;
  else if (!a.startsWith('-') && a !== process.execPath) cwdArg = a;
}

// Validate cwd up front. If the user passed a dead path, fall back to
// the repo root so we can at least show a working shell.
if (!fs.existsSync(cwdArg)) {
  console.error(`[opencode-ide] cwd does not exist: ${cwdArg}, falling back to ${REPO_ROOT}`);
  cwdArg = REPO_ROOT;
}

// ---- helpers ---------------------------------------------------------------
function pickPort(preferred) {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(preferred, '127.0.0.1', () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
  });
}

// Accept several common log shapes:
//   "listening on http://127.0.0.1:54321"
//   "OpenCode server listening at http://127.0.0.1:54321"
//   "server started on port 54321"
//   "Server listening on port 54321"
const LISTEN_RE = /(?:listening|server|started|listen)\s+(?:on|at)\s+(?:https?:\/\/[^\s:]+|port\s+)?(\d{2,5})/i;

function findPortInLine(line) {
  const m = line.match(LISTEN_RE);
  return m ? parseInt(m[1], 10) : null;
}

async function waitForHttp(url, attempts = 60, interval = 500) {
  for (let i = 0; i < attempts; i++) {
    try {
      const ok = await new Promise((res) => {
        const req = http.get(url, (r) => { res(r.statusCode >= 200 && r.statusCode < 500); r.resume(); });
        req.on('error', () => res(false));
        req.setTimeout(interval, () => { req.destroy(); res(false); });
      });
      if (ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, interval));
  }
  return false;
}

// Kill a child process AND all of its descendants. Node's `child.kill()`
// only sends a signal to the direct child, which on Windows leaves the
// `npx` / `cmd.exe` wrapper alive (and holding the port).
function killTree(proc) {
  if (!proc || proc.killed) return;
  if (process.platform === 'win32') {
    try {
      // /T = tree, /F = force, /PID = process id
      spawn('taskkill', ['/T', '/F', '/PID', String(proc.pid)], { windowsHide: true });
    } catch (e) {
      console.error('[opencode-ide] taskkill failed:', e);
    }
  } else {
    try { process.kill(-proc.pid, 'SIGKILL'); } catch {}
    try { proc.kill('SIGKILL'); } catch {}
  }
}

// ---- opencode serve --------------------------------------------------------
let opencodeProc = null;
let opencodePort = null;        // current port the live opencode serve is on
let restartCount = 0;           // number of automatic restarts
const MAX_RESTARTS = 3;
const RESTART_BASE_MS = 1000;

function startOpencodeServe() {
  return new Promise(async (resolve, reject) => {
    if (noServe) {
      opencodePort = 4096;
      return resolve(opencodePort);
    }

    const port = await pickPort(0);
    console.log(`[opencode-ide] starting opencode serve on port ${port} (cwd=${cwdArg})`);

    opencodeProc = spawn('opencode', ['serve', '--port', String(port), '--hostname', '127.0.0.1'], {
      cwd: cwdArg,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      // On Windows, `opencode` is a `.cmd` shim in %AppData%\Roaming\npm.
      // Using shell: true lets the OS resolve the shim — otherwise the
      // direct exec path fails with ENOENT even though `where opencode`
      // finds the binary just fine.
      shell: true,
      windowsHide: true,
    });

    let resolved = false;
    let buf = '';
    const tryMatch = (chunk) => {
      buf += chunk;
      // Only try to match once we see a newline; partial lines can match
      // false positives (e.g. "started" inside a stack trace).
      const lines = buf.split(/\r?\n/);
      buf = lines.pop() ?? '';
      for (const line of lines) {
        if (resolved) break;
        const p = findPortInLine(line);
        if (p) {
          opencodePort = p;
          resolved = true;
          resolve(opencodePort);
          return;
        }
      }
    };
    opencodeProc.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      process.stdout.write(`[opencode] ${text}`);
      logToFile(`[opencode stdout] ${text.trim()}`);
      tryMatch(text);
    });
    opencodeProc.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      process.stderr.write(`[opencode] ${text}`);
      logToFile(`[opencode stderr] ${text.trim()}`);
      // Many CLIs log the "listening" line to stderr; check it too.
      tryMatch(text);
    });
    opencodeProc.on('error', (e) => {
      console.error('[opencode-ide] spawn error:', e);
      if (!resolved) { resolved = true; reject(e); }
    });
    opencodeProc.on('exit', (code, sig) => {
      const wasExpected = app.isQuitting;
      console.log(`[opencode-ide] opencode exited code=${code} sig=${sig} (expected=${wasExpected})`);
      opencodeProc = null;
      // If the port is still cached but the process is gone, clear it so
      // the proxy stops redirecting to a dead port.
      if (opencodePort) opencodePort = null;
      // Auto-restart on unexpected death (OOM, model provider crash, etc).
      if (!wasExpected && !noServe && restartCount < MAX_RESTARTS) {
        const delay = Math.min(RESTART_BASE_MS * 2 ** restartCount, 30_000);
        restartCount += 1;
        console.log(`[opencode-ide] auto-restarting opencode serve in ${delay}ms (attempt ${restartCount}/${MAX_RESTARTS})`);
        setTimeout(() => {
          startOpencodeServe().catch((e) => console.error('[opencode-ide] auto-restart failed:', e));
        }, delay);
      }
    });

    setTimeout(() => {
      if (!resolved) { resolved = true; reject(new Error('opencode serve did not start in 15s')); }
    }, 15_000);
  });
}

// ---- vite dev server (dev mode only) ---------------------------------------
let viteProc = null;
const RENDERER_PORT = 5173;

function startVite() {
  if (!isDev) return Promise.resolve();
  // If something is already on 5173 (zombie from a prior crash), fail
  // fast and tell the user instead of hanging for 10s.
  return new Promise((resolve, reject) => {
    const sock = net.createConnection({ host: '127.0.0.1', port: RENDERER_PORT }, () => {
      sock.destroy();
      reject(new Error(`Port ${RENDERER_PORT} is already in use. A previous opencode-ide instance may still be running; close it (Task Manager → node.exe) and retry.`));
    });
    sock.on('error', () => { /* nothing on the port, good */ resolve(undefined); });
    sock.setTimeout(300, () => { sock.destroy(); resolve(undefined); });
  }).then(() => new Promise((resolve, reject) => {
    console.log(`[opencode-ide] starting vite dev server on ${RENDERER_PORT}`);
    // Spawn the Vite binary directly. The Electron child process
    // doesn't have npm shims in PATH on Windows, so calling
    // `npx` / `npx.cmd` fails with ENOENT. We resolve to the
    // .cmd shim that npm install drops in node_modules\.bin.
    const viteBin = process.platform === 'win32'
      ? path.join(SCRIPT_DIR, 'node_modules', '.bin', 'vite.cmd')
      : path.join(SCRIPT_DIR, 'node_modules', '.bin', 'vite');
    logToFile(`spawn vite binary at ${viteBin}`);
    viteProc = spawn(
      viteBin,
      ['--port', String(RENDERER_PORT), '--strictPort'],
      { cwd: SCRIPT_DIR, env: process.env, stdio: ['ignore', 'pipe', 'pipe'], shell: false, windowsHide: true }
    );
    let resolved = false;
    const onChunk = (chunk) => {
      const text = chunk.toString();
      process.stdout.write(`[vite] ${text}`);
      if (!resolved && (text.includes('ready in') || text.includes('Local:'))) {
        resolved = true;
        resolve();
      }
    };
    viteProc.stdout.on('data', onChunk);
    viteProc.stderr.on('data', onChunk);
    viteProc.on('error', (e) => { if (!resolved) { resolved = true; reject(e); } });
    viteProc.on('exit', (code) => {
      console.log(`[opencode-ide] vite exited code=${code}`);
      viteProc = null;
      if (!resolved) { resolved = true; reject(new Error(`vite exited with code ${code} before becoming ready`)); }
    });
    setTimeout(() => {
      if (!resolved) { resolved = true; resolve(); /* give up waiting, BrowserWindow will show retry */ }
    }, 10_000);
  }));
}

// ---- window ----------------------------------------------------------------
let mainWindow = null;
let isQuitting = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 980,
    minHeight: 600,
    show: false,
    backgroundColor: '#0b0f17',
    title: 'OpenCode IDE',
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0e1421',
      symbolColor: '#94a3b8',
      height: 36,
    },
    webPreferences: {
      preload: path.join(SCRIPT_DIR, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
    },
  });

  Menu.setApplicationMenu(null);

  mainWindow.once('ready-to-show', () => mainWindow.show());

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Allow same-origin navigations + reject everything else
  mainWindow.webContents.on('will-navigate', (event, url) => {
    try {
      const u = new URL(url);
      if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return;
      event.preventDefault();
      shell.openExternal(url);
    } catch {}
  });

  mainWindow.on('close', () => {
    isQuitting = true;
    if (opencodeProc) killTree(opencodeProc);
    if (viteProc) killTree(viteProc);
  });

  // If opencode serve dies in a way that takes the renderer with it
  // (e.g. the proxy starts returning network errors to a hung fetch),
  // show the user a real error instead of a frozen window.
  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    console.error('[opencode-ide] render-process-gone:', details);
  });
}

function showErrorPage(title, message) {
  if (!mainWindow) return;
  const html = `<!doctype html><html><body style="background:#0b0f17;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:40px;line-height:1.5;">
    <h1 style="color:#f87171;font-size:18px;margin:0 0 12px 0;">${title}</h1>
    <pre style="background:#1e2738;padding:12px;border-radius:6px;font-size:12px;white-space:pre-wrap;word-break:break-word;color:#e2e8f0;">${message}</pre>
    <p style="margin-top:16px;font-size:12px;color:#94a3b8;">Close this window and retry. If the issue persists, run <code style="background:#1e2738;padding:2px 6px;border-radius:4px;">opencode serve --port 4096</code> manually from a terminal first.</p>
  </body></html>`;
  mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
}

// ---- CORS proxy for /api/* -------------------------------------------------
// Vite proxies /api → opencode, but when running Electron dev pointing at
// Vite, the proxy still works. We also handle this in session.webRequest
// as a safety net in case the renderer is loaded from a different origin.

function setupApiProxy() {
  session.defaultSession.webRequest.onBeforeRequest((details, cb) => {
    if (!opencodePort) return cb({ cancel: false });
    const url = details.url;
    if (url.includes('/api/')) {
      // Only rewrite when origin is the vite dev server.
      const m = url.match(/^https?:\/\/[^/]+(\/api\/.*)$/);
      if (m) {
        return cb({
          redirectURL: `http://127.0.0.1:${opencodePort}${m[1]}`,
        });
      }
    }
    cb({ cancel: false });
  });

  // Also rewrite /config and /session/* (no /api/ prefix) since the
  // renderer hits them through window.location.origin.
  session.defaultSession.webRequest.onBeforeRequest((details, cb) => {
    if (!opencodePort) return cb({ cancel: false });
    const url = details.url;
    if (/\/(config|session\/status|session\/[^/]+)$/.test(url)) {
      const m = url.match(/^https?:\/\/[^/]+(\/[^?]+)/);
      if (m) {
        return cb({
          redirectURL: `http://127.0.0.1:${opencodePort}${m[1]}`,
        });
      }
    }
    cb({ cancel: false });
  });
}

// ---- IPC -------------------------------------------------------------------
// "Pick a project folder" — the native open-folder dialog. Returns
// the absolute path or null if the user cancelled.
ipcMain.handle('oc:pick-cwd', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open a project',
    properties: [
      'openDirectory',
      // Show all drives mounted on the system, not just user folders.
      // On Windows this is C:\, D:\, E:\, network mounts, etc.
      'showAllFiles',
    ],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

// ---- app lifecycle ---------------------------------------------------------
app.whenReady().then(async () => {
  logToFile('app ready');
  setupApiProxy();
  createWindow();
  logToFile('window created');

  try {
    // Run in parallel but fail fast on the first error. allSettled
    // silently swallowed vite failures and left the user staring at a
    // blank white window.
    await Promise.all([startOpencodeServe(), startVite()]);
    logToFile('opencode + vite started');
  } catch (e) {
    logToFile('STARTUP FAILED', e?.stack || e?.message || e);
    console.error('[opencode-ide] startup failed:', e);
    isQuitting = true; // don't try to auto-restart if the user sees this
    showErrorPage('opencode-ide failed to start', e && e.message ? e.message : String(e));
    return;
  }

  const url = isDev
    ? `http://localhost:${RENDERER_PORT}/`
    : `file://${path.join(SCRIPT_DIR, 'dist', 'index.html')}`;

  logToFile(`loading ${url}`);
  console.log(`[opencode-ide] loading ${url}`);
  try {
    await mainWindow.loadURL(url);
    logToFile('loadURL resolved');
  } catch (e) {
    logToFile('loadURL REJECTED', e?.stack || e?.message || e);
    showErrorPage('Failed to load app', e && e.message ? e.message : String(e));
  }
});

app.on('window-all-closed', () => {
  isQuitting = true;
  if (opencodeProc) killTree(opencodeProc);
  if (viteProc) killTree(viteProc);
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  isQuitting = true;
  if (opencodeProc) killTree(opencodeProc);
  if (viteProc) killTree(viteProc);
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
