// OpenCode HTTP API client.
// The local `opencode serve` process exposes endpoints under /api.
// Docs come from the OpenAPI spec at /doc.
//
// We talk to it over loopback. CORS is configured by the Electron shell
// (--cors http://localhost:5173) so dev mode works.

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

export type MessagePart =
  | { type: "text"; text: string }
  | { type: "reasoning"; text: string }
  | { type: "tool"; id: string; name: string; input: unknown; output?: string; state?: string }
  | { type: "file"; mime: string; filename?: string; url: string }
  | { type: "step-start" }
  | { type: "step-finish" }
  | { type: "snapshot"; snapshot: string };

export type Message = {
  id: string;
  sessionID: string;
  role: "user" | "assistant";
  parentID?: string;
  parts: MessagePart[];
  createdAt: number;
};

const baseUrl = () => {
  // Vite dev: hardcoded 5173, matches our --strictPort config.
  // Production: same origin (Electron loads built file://).
  return import.meta.env.DEV ? "http://127.0.0.1:4096" : window.location.origin;
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
  listMessages: (id: string) => http<{ data: Message[] }>(`/api/session/${id}/message`).then((r) => r.data),
  getSessionStatus: () => http<SessionStatus>("/api/session/status"),
  getConfig: () => http<Config>("/api/config"),
  abort: (id: string) => http(`/api/session/${id}/abort`, { method: "POST" }),
};
