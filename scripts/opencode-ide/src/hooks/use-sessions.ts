import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type SessionInfo } from "@/lib/api";

export const sessionKeys = {
  list: (cwd: string) => ["sessions", "list", cwd] as const,
  detail: (id: string) => ["sessions", "detail", id] as const,
  status: () => ["sessions", "status"] as const,
};

export function useSessions(cwd: string) {
  return useQuery({
    queryKey: sessionKeys.list(cwd),
    queryFn: async () => {
      const all = await api.listSessions();
      // If a cwd is set, filter to sessions in that directory.
      if (!cwd) return all;
      const norm = (p: string) => p.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
      return all.filter((s) => norm(s.location?.directory ?? "") === norm(cwd));
    },
    refetchInterval: 5000,
    staleTime: 2000,
  });
}

export function useSessionStatus() {
  return useQuery({
    queryKey: sessionKeys.status(),
    queryFn: () => api.getSessionStatus(),
    refetchInterval: 2000,
    staleTime: 1000,
  });
}

export function useSession(id: string | null) {
  return useQuery({
    queryKey: id ? sessionKeys.detail(id) : ["sessions", "detail", "none"],
    queryFn: () => api.getSession(id!),
    enabled: !!id,
  });
}

export function useConfig() {
  return useQuery({ queryKey: ["config"], queryFn: () => api.getConfig() });
}

/**
 * Create-session mutation, shared between the topbar / empty-state button
 * and the sidebar "+" button. Invalidates the per-cwd session list on
 * success; caller decides what to do with the new session (navigate,
 * toast, etc.) via the optional `onCreated` callback.
 */
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

export type { SessionInfo };
