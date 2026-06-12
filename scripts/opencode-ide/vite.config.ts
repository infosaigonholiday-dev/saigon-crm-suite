import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";

// opencode serve runs on a random loopback port picked at startup.
// In browser mode the renderer can't reach it directly, so we proxy
// every /api/*, /config, and /session/* request through Vite.
//
// The launcher (opencode-ide.bat antigravity) writes the chosen
// port to a small file we read here; the Electron main process
// sets up its own webRequest proxy instead and doesn't need this.
import fs from "node:fs";
import os from "node:os";

// Resolve which port to proxy to. Priority:
//   1. OPENCODE_SERVE_PORT env (Electron main sets this when it spawns serve)
//   2. %TEMP%\opencode-ide-port.txt (the .bat launcher writes this)
//   3. 4096 (the convention; matches opencode's default)
function readProxyTarget(): string {
  if (process.env.OPENCODE_SERVE_PORT) {
    return `http://127.0.0.1:${process.env.OPENCODE_SERVE_PORT}`;
  }
  try {
    const f = path.join(os.tmpdir(), "opencode-ide-port.txt");
    if (fs.existsSync(f)) {
      const p = fs.readFileSync(f, "utf-8").trim();
      if (p) return `http://127.0.0.1:${p}`;
    }
  } catch {}
  return "http://127.0.0.1:4096";
}

const proxyTarget = readProxyTarget();

export default defineConfig({
  root: ".",
  base: "./",
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // Projected v2 API (the one our renderer talks to).
      "/api": { target: proxyTarget, changeOrigin: true, secure: false },
      // v1 endpoints that don't have the /api/ prefix.
      "/config": { target: proxyTarget, changeOrigin: true, secure: false },
      "/session": { target: proxyTarget, changeOrigin: true, secure: false },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  plugins: [react()],
});

