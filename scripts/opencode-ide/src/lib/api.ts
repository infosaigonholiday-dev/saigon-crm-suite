// OpenCode HTTP API client (v1.17.3).
// The local `opencode serve` process exposes endpoints under /api/*
// and a small number of "v1" endpoints without the /api prefix
// (e.g. /config, /session/status). The Electron main process proxies
// /api/* from the renderer to the opencode port via session.webRequest.
//
// Path summary (verified against /doc on 1.17.3):
//   GET    /api/session                 list sessions (v2.projected)
//   POST   /session                     create session (v1, no /api/ prefix)
//   GET    /api/session/{id}/message    list projected messages
//   POST   /api/session/{id}/prompt     send prompt (async, fire-and-forget)
//   GET    /config                      global config (model, agent, providers)
//   GET    /session/status              live status for all sessions
//   GET    /api/event                   SSE stream of all events
//   GET    /api/health                  health check
//
// Note: there is NO abort endpoint in 1.17.3. To cancel a running turn,
// you send another prompt with `delivery: "steer"` or close the SSE
// stream so the agent loop times out. We expose an abortSession stub
// for now; it surfaces as a "not supported" toast.

// ---- Sessions --------------------------------------------------------------
// The session list response is paginated; we use the `data` array and
// ignore cursor (Phase 1 is small). Each session carries its own
// `directory` (project root) so we can group by project on the client.

export type Model = {
  id: string;
  providerID: string;
  variant?: string | null;
};

export type Tokens = {
  input: number;
  output: number;
  reasoning: number;
  cache: { read: number; write: number };
};

export type SessionInfo = {
  id: string;
  projectID: string;
  parentID?: string;
  agent?: string | null;
  model?: Model | null;
  cost: number;
  tokens: Tokens;
  time: { created: number; updated: number; archived?: number | null };
  title: string;
  // The 1.17.3 server returns BOTH .location.directory (v1) and
  // .directory (v2 spec). We accept either via this union; v1 is
  // observed in the wild from /api/session.
  location?: { directory: string; workspaceID?: string | null };
  directory?: string;
  subpath?: string | null;
  slug?: string;
  path?: { cwd: string; root: string };
};

// ---- Projected messages ----------------------------------------------------
// `/api/session/{id}/message` returns "SessionMessage" — a small
// wrapper that splits into user / assistant variants. Assistant
// messages carry the rendered content (text + reasoning + tool calls)
// directly, no separate "parts" fetch required.

export type ContentText = { type: "text"; text: string };
export type ContentReasoning = { type: "reasoning"; text: string };
// opencode tool entries vary by tool; we render them as opaque cards.
export type ContentTool = {
  type: "tool";
  // The exact shape comes from SessionMessageAssistantTool; we accept
  // arbitrary fields and render a JSON dump in the UI.
  [k: string]: unknown;
};
export type ContentItem = ContentText | ContentReasoning | ContentTool;

export type AssistantMessage = {
  id: string;
  type: "assistant";
  time: { created: number; completed?: number };
  agent: string;
  model: Model;
  content: ContentItem[];
  finish?: string;
  cost: number;
  tokens: Tokens;
  error?: { name: string; data?: { message: string } };
};

export type UserMessage = {
  id: string;
  type: "user";
  time: { created: number };
  text: string;
};

export type SessionMessage = AssistantMessage | UserMessage;

export type SessionMessagesResponse = {
  data: SessionMessage[];
  cursor: { previous?: string | null; next?: string | null };
};

// ---- Status ---------------------------------------------------------------
// `/session/status` returns a flat map of session ID -> status.

export type SessionStatus = {
  [sessionId: string]: {
    type: "idle" | "busy" | "retry";
    attempt?: number;
    message?: string;
  };
};

// ---- Config ---------------------------------------------------------------
// `/config` is wide; we read only the fields we display.

export type Config = {
  model?: Model;
  agent?: string;
  // …many other fields exist (provider, theme, etc.); we just read
  // what we display.
};

// ---- Prompt body ----------------------------------------------------------
// `POST /api/session/{id}/prompt` accepts a single `prompt` object
// with `text` (required), `files`, and `agents` (both optional).
// The `id` field on the envelope is an optional client-supplied
// message id (e.g. for optimistic UI); we let the server assign it.

export type PromptFileAttachment = {
  mime: string;
  filename?: string;
  url: string;
};

export type Prompt = {
  text: string;
  files?: PromptFileAttachment[];
  agents?: { name: string }[];
};

export type PromptBody = {
  id?: string;
  prompt: Prompt;
  delivery?: "queue" | "steer";
  resume?: boolean;
};

// ---- SSE event types (subset) --------------------------------------------
// opencode emits 30+ event types; we narrow to the ones the UI cares
// about. `message.part.updated` carries the part payload (text/tool/
// reasoning/etc.) and is the primary way we stream assistant output.

export type SseEvent =
  | { type: "message.updated"; sessionID: string; info: SessionMessage }
  | { type: "message.removed"; sessionID: string; messageID: string }
  | {
      type: "message.part.updated";
      sessionID: string;
      part: { id: string; messageID: string; type: string; [k: string]: unknown };
      time: number;
    }
  | {
      type: "message.part.delta";
      sessionID: string;
      messageID: string;
      partID: string;
      field: string;
      delta: string;
    }
  | { type: "message.part.removed"; sessionID: string; messageID: string; partID: string }
  | { type: "session.updated"; sessionID: string; info: SessionInfo }
  | { type: "session.deleted"; sessionID: string }
  | { type: "session.status"; sessionID: string; status: SessionStatus[string] }
  | { type: "session.idle"; sessionID: string }
  | { type: "session.error"; sessionID: string; error: { name: string; data?: { message: string } } };

const baseUrl = () => {
  // Same origin always. The Electron main process rewrites /api/* to
  // the opencode serve port via webRequest.onBeforeRequest. The few
  // non-/api endpoints (e.g. /config, /session/status) are not
  // rewritten but the renderer is served from the same loopback, so
  // the browser follows the redirects to opencode's port (CORS is
  // allowed because opencode allows same-origin / loopback by default).
  return window.location.origin;
};

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    // If opencode is serving the SPA shell here, the body is HTML —
    // mention that explicitly so debugging is easier.
    const hint = body.startsWith("<!") ? " (got HTML — wrong path?)" : "";
    throw new Error(`HTTP ${res.status} ${path}${hint}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // ---- Sessions ----------------------------------------------------------
  listSessions: () =>
    http<{ data: SessionInfo[]; cursor?: { next?: string | null } }>("/api/session")
      .then((r) => r.data),
  // The 1.17.3 create endpoint is /session (no /api/ prefix) — it
  // returns the v1 Session shape (id, slug, directory, version) which
  // is a superset of our SessionInfo, so we cast.
  createSession: (body?: { title?: string; agent?: string; model?: string }) =>
    http<SessionInfo>("/session", { method: "POST", body: JSON.stringify(body ?? {}) }),
  // Single-session lookup. /session/{id} (no /api/) returns the v1
  // shape (id, slug, directory, version) which we coerce.
  getSession: (id: string) => http<SessionInfo>(`/session/${id}`),

  // ---- Messages ----------------------------------------------------------
  listMessages: (id: string) => http<SessionMessagesResponse>(`/api/session/${id}/message`),
  sendPrompt: (id: string, body: PromptBody) =>
    http<unknown>(`/api/session/${id}/prompt`, { method: "POST", body: JSON.stringify(body) }),

  // ---- Status / config ---------------------------------------------------
  getSessionStatus: () => http<SessionStatus>("/session/status"),
  getConfig: () => http<Config>("/config"),

  // ---- SSE event stream --------------------------------------------------
  // Opens a long-lived GET. Caller is responsible for closing the
  // stream (e.g. by calling es.close() when the component unmounts).
  openEventStream(): EventSource {
    return new EventSource(`${baseUrl()}/api/event`);
  },
};
