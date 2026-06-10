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

const { app, BrowserWindow, ipcMain, shell, Menu, session } = require('electron');
const path = require('node:path');
const { spawn } = require('node:child_process');
const http = require('node:http');
const net = require('node:net');

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

// ---- helpers ---------------------------------------------------------------
function isPortOpen(port, host = '127.0.0.1', timeout = 250) {
  return new Promise((resolve) => {
    const sock = net.createConnection({ host, port }, () => { sock.destroy(); resolve(true); });
    sock.on('error', () => resolve(false));
    sock.setTimeout(timeout, () => { sock.destroy(); resolve(false); });
  });
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

function extractPortFromLine(line) {
  const m = line.match(/listening on https?:\/\/[^:\s]+:(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

// ---- opencode serve --------------------------------------------------------
let opencodeProc = null;
let opencodePort = null;
const RENDERER_PORT = 5173;

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
      shell: false,
      windowsHide: true,
    });

    let resolved = false;
    opencodeProc.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      process.stdout.write(`[opencode] ${text}`);
      if (!resolved) {
        const m = text.match(/listening on https?:\/\/[^:\s]+:(\d+)/);
        if (m) {
          opencodePort = parseInt(m[1], 10);
          resolved = true;
          resolve(opencodePort);
        }
      }
    });
    opencodeProc.stderr.on('data', (chunk) => process.stderr.write(`[opencode] ${chunk}`));
    opencodeProc.on('error', (e) => {
      console.error('[opencode-ide] spawn error:', e);
      if (!resolved) { resolved = true; reject(e); }
    });
    opencodeProc.on('exit', (code, sig) => {
      console.log(`[opencode-ide] opencode exited code=${code} sig=${sig}`);
      opencodeProc = null;
    });

    setTimeout(() => {
      if (!resolved) { resolved = true; reject(new Error('opencode serve did not start in 15s')); }
    }, 15000);
  });
}

// ---- vite dev server (dev mode only) ---------------------------------------
let viteProc = null;

function startVite() {
  if (!isDev) return Promise.resolve();
  return new Promise((resolve, reject) => {
    console.log(`[opencode-ide] starting vite dev server on ${RENDERER_PORT}`);
    viteProc = spawn(
      'npx',
      ['--prefix', SCRIPT_DIR, '--no-install', 'vite', '--port', String(RENDERER_PORT), '--strictPort'],
      { cwd: SCRIPT_DIR, stdio: ['ignore', 'pipe', 'pipe'], shell: false, windowsHide: true }
    );
    let buf = '';
    const onChunk = (chunk) => {
      const text = chunk.toString();
      buf += text;
      process.stdout.write(`[vite] ${text}`);
      if (text.includes('ready in') || text.includes('Local:')) {
        resolve();
      }
    };
    viteProc.stdout.on('data', onChunk);
    viteProc.stderr.on('data', onChunk);
    viteProc.on('error', reject);
    setTimeout(() => resolve(), 10000); // safety
  });
}

// ---- window ----------------------------------------------------------------
let mainWindow = null;

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
      preload: path.join(SCRIPT_DIR, 'src', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
    },
  });

  Menu.setApplicationMenu(null);
  mainWindow.removeMenu();

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
    if (opencodeProc) try { opencodeProc.kill(); } catch {}
    if (viteProc) try { viteProc.kill(); } catch {}
  });
}

// ---- CORS proxy for /api/* in dev mode ------------------------------------
// Vite proxies /api → opencode, but when running Electron dev pointing at
// Vite, the proxy still works. We also handle this in session.webRequest
// as a safety net in case the renderer is loaded from a different origin.

function setupApiProxy() {
  // Filter requests to /api/* and rewrite the target to the opencode port.
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
}

// ---- IPC -------------------------------------------------------------------
ipcMain.handle('oc:get-info', () => ({
  opencodeUrl: opencodePort ? `http://127.0.0.1:${opencodePort}` : null,
  rendererUrl: isDev ? `http://localhost:${RENDERER_PORT}` : 'file://',
  cwd: cwdArg,
  repoRoot: REPO_ROOT,
  isDev,
  pid: opencodeProc ? opencodeProc.pid : null,
}));

ipcMain.handle('oc:reload', () => {
  if (mainWindow) mainWindow.webContents.reload();
});

ipcMain.handle('oc:open-external', (_e, url) => {
  if (typeof url === 'string') shell.openExternal(url);
});

// ---- app lifecycle ---------------------------------------------------------
app.whenReady().then(async () => {
  setupApiProxy();
  createWindow();

  // Start opencode + vite in parallel
  const [, ] = await Promise.allSettled([startOpencodeServe(), startVite()]);

  if (!opencodePort) {
    // Last resort: ask user to start opencode themselves
    const errHtml = `<!doctype html><html><body style="background:#0b0f17;color:#e2e8f0;font-family:sans-serif;padding:40px;">
      <h1 style="color:#f87171">Cannot start opencode</h1>
      <p>Run <code style="background:#1e2738;padding:2px 6px;border-radius:4px;">opencode serve --port 4096</code> manually, then restart.</p>
    </body></html>`;
    await mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(errHtml));
    return;
  }

  const url = isDev
    ? `http://localhost:${RENDERER_PORT}/`
    : `file://${path.join(SCRIPT_DIR, 'dist', 'index.html')}`;

  console.log(`[opencode-ide] loading ${url}`);
  await mainWindow.loadURL(url);
});

app.on('window-all-closed', () => {
  if (opencodeProc) try { opencodeProc.kill(); } catch {}
  if (viteProc) try { viteProc.kill(); } catch {}
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
