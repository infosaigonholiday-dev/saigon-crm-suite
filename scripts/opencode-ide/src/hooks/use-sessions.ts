import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  api,
  type SessionInfo,
  type SessionMessage,
  type SessionStatus,
  type SseEvent,
} from "@/lib/api";

export const sessionKeys = {
  list: (cwd: string) => ["sessions", "list", cwd] as const,
  // We don't have a getSession endpoint in opencode 1.17.3, so we
  // use the list cache to look up session metadata by id. A dedicated
  // query for "one session" is just a selector over the list.
  byId: (id: string) => ["sessions", "byId", id] as const,
  status: () => ["sessions", "status"] as const,
  messages: (id: string) => ["sessions", "messages", id] as const,
};

export function useSessions(cwd: string) {
  return useQuery({
    queryKey: sessionKeys.list(cwd),
    queryFn: async () => {
      const all = await api.listSessions();
      if (!cwd) return all;
      const norm = (p: string) => p.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
      return all.filter((s) => norm(s.directory ?? "") === norm(cwd));
    },
    refetchInterval: 5000,
    staleTime: 2000,
  });
}

export function useSessionStatus() {
  return useQuery({
    queryKey: sessionKeys.status(),
    queryFn: () => api.getSessionStatus(),
    // Treat 200 with empty body as "no status to report". The endpoint
    // can return `{}` when no session is busy, so default to {}.
    refetchInterval: 2000,
    staleTime: 1000,
  });
}

/**
 * Look up a single session from the list cache. There's no get-by-id
 * endpoint in opencode 1.17.3, so we reuse the list. Returns null
 * while the list is loading or the id isn't in the list.
 */
export function useSession(id: string | null): SessionInfo | null {
  const { data } = useSessions("");
  if (!id || !data) return null;
  return data.find((s) => s.id === id) ?? null;
}

export function useConfig() {
  return useQuery({ queryKey: ["config"], queryFn: () => api.getConfig() });
}

export function useMessages(sessionId: string | null) {
  return useQuery({
    queryKey: sessionId ? sessionKeys.messages(sessionId) : ["messages", "none"],
    queryFn: () => api.listMessages(sessionId!),
    enabled: !!sessionId,
    refetchInterval: 1500,
    staleTime: 500,
  });
}

export function useCreateSession(cwd: string, onCreated?: (id: string) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.createSession({}),
    onSuccess: (s) => {
      qc.invalidateQueries({ queryKey: sessionKeys.list(cwd) });
      onCreated?.(s.id);
    },
  });
}

export function useSendPrompt(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (text: string) =>
      api.sendPrompt(sessionId, { prompt: { text } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sessionKeys.messages(sessionId) });
      qc.invalidateQueries({ queryKey: sessionKeys.list("") });
    },
  });
}

/**
 * Subscribe to the opencode SSE event stream. We use native
 * EventSource (not fetch + ReadableStream) because opencode's
 * `event:` field uses named events we filter on, and EventSource
 * handles reconnection automatically.
 *
 * This hook is firehose-style: it just exposes the latest event for
 * the active session so consumers can react. Cache invalidations are
 * pushed in-band so the UI updates without polling.
 */
export function useSessionEvents(enabled: boolean) {
  const qc = useQueryClient();
  const [lastEvent, setLastEvent] = useState<SseEvent | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const es = api.openEventStream();
    esRef.current = es;
    const onMessage = (e: MessageEvent) => {
      try {
        const ev = JSON.parse(e.data) as SseEvent;
        setLastEvent(ev);
        // Push invalidations for the bits we cache.
        switch (ev.type) {
          case "message.updated":
            qc.invalidateQueries({ queryKey: sessionKeys.messages(ev.sessionID) });
            break;
          case "message.removed":
            qc.invalidateQueries({ queryKey: sessionKeys.messages(ev.sessionID) });
            break;
          case "message.part.updated":
          case "message.part.delta":
            // Streaming updates don't move the data shape; the next
            // listMessages poll (or message.updated) will pick them up.
            qc.invalidateQueries({ queryKey: sessionKeys.messages(ev.sessionID) });
            break;
          case "session.updated":
            qc.invalidateQueries({ queryKey: sessionKeys.list("") });
            break;
          case "session.idle":
            qc.invalidateQueries({ queryKey: sessionKeys.status() });
            break;
          case "session.status":
            qc.invalidateQueries({ queryKey: sessionKeys.status() });
            break;
        }
      } catch {
        // Ignore malformed payloads; the stream stays open.
      }
    };
    es.addEventListener("message", onMessage);
    return () => {
      es.removeEventListener("message", onMessage);
      es.close();
      esRef.current = null;
    };
  }, [enabled, qc]);

  return lastEvent;
}

export type { SessionInfo, SessionMessage, SessionStatus, SseEvent };
