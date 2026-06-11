// OpenCode HTTP API client.
// The local `opencode serve` process exposes endpoints under /api.
// Docs come from the OpenAPI spec at /doc.
//
// The Electron main process proxies /api/* from the renderer to the
// opencode port via session.webRequest. That means the renderer can
// always use a same-origin fetch (window.location.origin in dev too,
// because Vite serves on http://localhost:5173 and the proxy rewrites
// the host). This avoids CORS preflight and "wrong port" surprises.

export type SessionInfo = {
  id: string;
  projectID: string;
  parentID?: string;
  agent: string;
  model: { id: string; providerID: string; variant?: string | null };
  cost: number;
  tokens: { input: number; output: number; reasoning: number; cache: { read: number; write: number } };
  time: { created: number; updated: number; archived?: number | null };
  title: string;
  location: { directory: string; workspaceID?: string | null };
  subpath?: string | null;
};

export type SessionStatus = {
  [sessionId: string]: {
    type: "idle" | "busy" | "retry";
    attempt?: number;
    message?: string;
  };
};

export type Config = {
  model?: string;
  agent?: string;
  // …truncated; we only use what we display
};

const baseUrl = () => {
  // Same origin always. The Electron main process rewrites /api/* to
  // the opencode serve port via webRequest.onBeforeRequest, so the
  // renderer never needs to know the opencode port.
  return window.location.origin;
};

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${path}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  listSessions: () => http<{ data: SessionInfo[] }>("/api/session").then((r) => r.data),
  createSession: (body?: { title?: string; agent?: string; model?: string }) =>
    http<SessionInfo>("/api/session", { method: "POST", body: JSON.stringify(body ?? {}) }),
  getSession: (id: string) => http<SessionInfo>(`/api/session/${id}`),
  getSessionStatus: () => http<SessionStatus>("/api/session/status"),
  getConfig: () => http<Config>("/api/config"),
};
