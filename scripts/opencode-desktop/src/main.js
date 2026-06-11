// opencode-desktop main process
// -----------------------------------------------------------------------------
// Spawns `opencode web` as a child process, captures its port, then embeds
// the web UI inside a styled BrowserWindow.
//
// Hardening notes (Phase 1.1):
//   - `opencode web` is killed with the whole process tree on quit
//     (Windows: `taskkill /T /F`, POSIX: SIGKILL on -pid). This stops the
//     "zombie port" problem on the next launch.
//   - We listen on BOTH stdout and stderr for the "Local …" log line, and
//     only accept ports that appear on lines that look like a startup
//     banner (e.g. "Local: http://127.0.0.1:54021/"). The previous regex
//     matched any URL in any log, which would happily swallow an error
//     message containing a port number.
//   - `--hostname 127.0.0.1` is always passed so the opencode HTTP server
//     never binds to 0.0.0.0 (we're loading it in a local BrowserWindow
//     that uses loopback; exposing it on the LAN would be a security hole).
//   - `opencode web` is auto-restarted once if it dies unexpectedly, with
//     exponential backoff up to 30s. Repeated restarts give up and the
//     window shows an error page.
//   - `--no-serve` flag lets power users start `opencode web` themselves
//     in a separate terminal and have the desktop shell just connect to
//     whatever is already on port 4096.
//   - cwd is validated up front. If the user passes a dead path the shell
//     falls back to the repo root so the user at least gets a working app.

const { app, BrowserWindow, shell, Menu, nativeImage } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const http = require('node:http');

const isDev = process.argv.includes('--dev');
const SCRIPT_DIR = __dirname;
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..', '..');

// ---- argv parsing ----------------------------------------------------------
// opencode-desktop <cwd> [--port N] [--no-serve] [--dev]
//   cwd:        working directory for opencode (default: REPO_ROOT)
//   --port:     port to bind opencode web to (default: 0 = auto)
//   --no-serve: don't auto-spawn opencode (you started it yourself on 4096)
//   --dev:      open DevTools when the window is ready
const argv = process.argv.slice(1);
let cwdArg = REPO_ROOT;
let portArg = 0;
let noServe = false;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--port' && argv[i + 1]) { portArg = parseInt(argv[i + 1], 10); i++; }
  else if (a === '--no-serve') { noServe = true; }
  else if (!a.startsWith('-') && a !== process.execPath) { cwdArg = a; }
}

if (!fs.existsSync(cwdArg)) {
  console.error(`[opencode-desktop] cwd does not exist: ${cwdArg}, falling back to ${REPO_ROOT}`);
  cwdArg = REPO_ROOT;
}

// ---- helpers ---------------------------------------------------------------
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

// Only match ports that appear on Vite/Next-style startup banners, not on
// arbitrary log lines. Accepts:
//   "  ➜  Local:   http://127.0.0.1:54021/"
//   "OpenCode web listening on http://127.0.0.1:54021"
//   "ready in 412ms on port 54021"
//   "Server listening on port 54021"
const PORT_RE = /(?:Local\s*:\s*|listening\s+(?:on|at)\s+(?:https?:\/\/[^\s:]+:)|on\s+port\s+|port\s+)(\d{2,5})/i;

function findPortInLine(line) {
  const m = line.match(PORT_RE);
  return m ? parseInt(m[1], 10) : null;
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
      console.error('[opencode-desktop] taskkill failed:', e);
    }
  } else {
    try { process.kill(-proc.pid, 'SIGKILL'); } catch {}
    try { proc.kill('SIGKILL'); } catch {}
  }
}

// ---- spawn opencode web ----------------------------------------------------
let opencodeProc = null;
let detectedPort = portArg || null;
let restartCount = 0;
const MAX_RESTARTS = 3;
const RESTART_BASE_MS = 1000;
let isQuitting = false;

function startOpencodeWeb() {
  return new Promise(async (resolve, reject) => {
    if (noServe) {
      detectedPort = 4096;
      return resolve(detectedPort);
    }

    const args = ['web', '--hostname', '127.0.0.1'];
    if (portArg) args.push('--port', String(portArg));
    else         args.push('--port', '0');   // ask opencode to pick a free port

    console.log(`[opencode-desktop] spawn: opencode ${args.join(' ')} (cwd=${cwdArg})`);
    opencodeProc = spawn('opencode', args, {
      cwd: cwdArg,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
      windowsHide: true,
    });

    let resolved = false;
    let buf = '';
    const tryMatch = (chunk) => {
      buf += chunk;
      // Only try to match once we see a newline; partial lines can match
      // false positives (e.g. "listening" inside a stack trace).
      const lines = buf.split(/\r?\n/);
      buf = lines.pop() ?? '';
      for (const line of lines) {
        if (resolved) break;
        const p = findPortInLine(line);
        if (p) {
          detectedPort = p;
          resolved = true;
          resolve(detectedPort);
          return;
        }
      }
    };

    opencodeProc.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      process.stdout.write(`[opencode] ${text}`);
      tryMatch(text);
    });
    opencodeProc.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      process.stderr.write(`[opencode] ${text}`);
      tryMatch(text);
    });

    opencodeProc.on('error', (e) => {
      console.error('[opencode-desktop] spawn error:', e);
      if (!resolved) { resolved = true; reject(e); }
    });

    opencodeProc.on('exit', (code, sig) => {
      const wasExpected = isQuitting;
      console.log(`[opencode-desktop] opencode exited code=${code} sig=${sig} (expected=${wasExpected})`);
      opencodeProc = null;
      if (detectedPort && !wasExpected) detectedPort = null;
      if (!wasExpected && !noServe && restartCount < MAX_RESTARTS) {
        const delay = Math.min(RESTART_BASE_MS * 2 ** restartCount, 30_000);
        restartCount += 1;
        console.log(`[opencode-desktop] auto-restarting opencode web in ${delay}ms (attempt ${restartCount}/${MAX_RESTARTS})`);
        setTimeout(() => {
          startOpencodeWeb().catch((e) => console.error('[opencode-desktop] auto-restart failed:', e));
        }, delay);
      }
    });

    setTimeout(() => {
      if (!resolved) { resolved = true; reject(new Error('opencode web did not print a port in 15s')); }
    }, 15_000);
  });
}

// ---- window ----------------------------------------------------------------
let mainWindow = null;

function createWindow() {
  const iconPath = path.join(SCRIPT_DIR, 'assets', 'icon.png');
  const icon = nativeImage.createFromPath(iconPath);
  const useIcon = !icon.isEmpty();

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 980,
    minHeight: 600,
    show: false,
    backgroundColor: '#0b0f17',
    title: 'OpenCode',
    autoHideMenuBar: true,
    icon: useIcon ? icon : undefined,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
    },
  });

  Menu.setApplicationMenu(null);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Block navigations to anywhere other than the detected opencode port
  mainWindow.webContents.on('will-navigate', (event, url) => {
    try {
      const u = new URL(url);
      if (u.hostname === '127.0.0.1' && u.port === String(detectedPort)) return;
      if (u.protocol === 'http:' || u.protocol === 'https:') {
        event.preventDefault();
        shell.openExternal(url);
      }
    } catch {}
  });

  mainWindow.on('close', () => {
    isQuitting = true;
    if (opencodeProc) killTree(opencodeProc);
  });

  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    console.error('[opencode-desktop] render-process-gone:', details);
  });
}

function showErrorPage(title, message, hints = []) {
  if (!mainWindow) return;
  const safe = (s) => String(s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const hintHtml = hints.map((h) => `<div class="hint"><code>${safe(h)}</code></div>`).join('');
  const errHtml = `<!doctype html><html><head><meta charset="utf-8">
    <title>OpenCode error</title>
    <style>
      body{margin:0;height:100vh;display:flex;align-items:center;justify-content:center;
           background:#0b0f17;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
           -webkit-font-smoothing:antialiased;}
      .card{max-width:560px;padding:32px;background:#0e1421;border:1px solid #1e2738;border-radius:12px;}
      h1{color:#f87171;margin:0 0 12px;font-size:18px;}
      p{color:#94a3b8;line-height:1.6;margin:8px 0;}
      code{background:#1e2738;padding:2px 6px;border-radius:4px;color:#a5b4fc;font-size:12px;}
      .hint{margin-top:6px;padding:8px 10px;background:#1e2738;border-radius:6px;font-size:12px;color:#94a3b8;}
    </style></head><body>
    <div class="card">
      <h1>${safe(title)}</h1>
      <p>${safe(message)}</p>
      ${hintHtml}
    </div>
    </body></html>`;
  mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(errHtml));
}

async function loadOpencodeUI(port) {
  const url = `http://127.0.0.1:${port}/`;
  console.log(`[opencode-desktop] waiting for ${url} ...`);
  const ready = await waitForHttp(url);
  if (!ready) throw new Error(`opencode web did not respond at ${url}`);

  await mainWindow.loadURL(url);
  console.log(`[opencode-desktop] loaded ${url}`);

  // Inject custom chrome (titlebar overlay) once the page finishes loading
  mainWindow.webContents.on('did-finish-load', async () => {
    try {
      await mainWindow.webContents.executeJavaScript(`
        (function() {
          const html = document.documentElement;
          html.style.cssText += '; --oc-titlebar-h:36px;';
          document.body.style.paddingTop = 'var(--oc-titlebar-h)';
          if (!document.getElementById('__oc_titlebar__')) {
            const tb = document.createElement('div');
            tb.id = '__oc_titlebar__';
            tb.style.cssText = \`
              position: fixed; top: 0; left: 0; right: 0; height: 36px;
              background: linear-gradient(180deg, #0b0f17 0%, #0e1421 100%);
              border-bottom: 1px solid #1e2738;
              display: flex; align-items: center; padding: 0 14px;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              font-size: 12px; color: #94a3b8; z-index: 99999;
              -webkit-app-region: drag; user-select: none;
            \`;
            tb.innerHTML = \`
              <div style="display:flex;align-items:center;gap:8px;">
                <div style="width:8px;height:8px;border-radius:50%;background:#22c55e;box-shadow:0 0 8px #22c55e;"></div>
                <span style="font-weight:600;color:#e2e8f0;letter-spacing:0.3px;">OpenCode</span>
                <span style="color:#475569;">·</span>
                <span style="color:#64748b;">\${document.title || 'AI Coding Assistant'}</span>
              </div>
              <div style="flex:1;"></div>
              <div style="display:flex;gap:6px;-webkit-app-region:no-drag;">
                <a href="javascript:history.length>1?history.back():void 0" style="color:#64748b;text-decoration:none;padding:4px 10px;border-radius:4px;font-size:11px;" onmouseover="this.style.background='#1e2738'" onmouseout="this.style.background='transparent'">Back</a>
                <a href="javascript:location.reload()" style="color:#64748b;text-decoration:none;padding:4px 10px;border-radius:4px;font-size:11px;" onmouseover="this.style.background='#1e2738'" onmouseout="this.style.background='transparent'">Reload</a>
              </div>
            \`;
            document.body.appendChild(tb);
          }
        })();
      `);
    } catch (e) {
      console.error('[opencode-desktop] chrome inject failed:', e);
    }
  });
}

// ---- app lifecycle ---------------------------------------------------------
app.whenReady().then(async () => {
  createWindow();
  try {
    const port = await startOpencodeWeb();
    console.log(`[opencode-desktop] opencode web ready on port ${port}`);
    await loadOpencodeUI(port);
  } catch (e) {
    console.error('[opencode-desktop] failed to start:', e);
    isQuitting = true; // don't try to auto-restart on user-visible startup error
    showErrorPage(
      "Không khởi động được opencode web",
      e && e.message ? e.message : String(e),
      [
        'opencode --version',
        '.\\scripts\\opencode.ps1 web',
        '.\\scripts\\opencode.ps1 sessions',
        '.\\scripts\\opencode.ps1 continue',
      ]
    );
  }
});

app.on('window-all-closed', () => {
  isQuitting = true;
  if (opencodeProc) killTree(opencodeProc);
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  isQuitting = true;
  if (opencodeProc) killTree(opencodeProc);
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
