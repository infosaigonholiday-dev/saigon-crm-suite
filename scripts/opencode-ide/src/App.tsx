import { useState, useEffect, useCallback } from "react";
import { QueryClient, QueryClientProvider, useMutation, useQueryClient } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { CwdPicker } from "@/components/cwd-picker";
import { EmptyState } from "@/components/empty-state";
import { loadPrefs, savePrefs, addRecentCwd } from "@/lib/prefs";
import { api } from "@/lib/api";
import { sessionKeys, useSession } from "@/hooks/use-sessions";
import { toast, Toaster } from "sonner";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Shell() {
  const [cwd, setCwd] = useState<string>(() => loadPrefs().cwd);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const qc = useQueryClient();
  const prefs = loadPrefs();

  // When cwd changes, refresh session list and clear active selection
  useEffect(() => {
    setActiveId(null);
    qc.invalidateQueries({ queryKey: ["sessions"] });
  }, [cwd, qc]);

  // When sidebar session is selected, mark as recent cwd
  useEffect(() => {
    if (cwd) addRecentCwd(cwd);
  }, [cwd]);

  // Create-session mutation (used by EmptyState button)
  const create = useMutation({
    mutationFn: () => api.createSession({}),
    onSuccess: (s) => {
      qc.invalidateQueries({ queryKey: sessionKeys.list(cwd) });
      setActiveId(s.id);
      toast.success("Session created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleNewSession = useCallback(() => {
    if (!cwd) {
      setPickerOpen(true);
      return;
    }
    create.mutate();
  }, [cwd, create]);

  // First launch: force open picker if no cwd
  useEffect(() => {
    if (!cwd) setPickerOpen(true);
  }, [cwd]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-base text-fg">
      {pickerOpen || !cwd ? (
        <CwdPicker
          current={cwd}
          recents={prefs.recentCwds}
          onPick={(p) => {
            setCwd(p);
            savePrefs({ cwd: p });
            setPickerOpen(false);
          }}
        />
      ) : (
        <>
          <aside className="w-72 shrink-0">
            <Sidebar
              cwd={cwd}
              activeId={activeId}
              onSelect={setActiveId}
              onChangeCwd={() => setPickerOpen(true)}
            />
          </aside>
          <main className="flex flex-1 flex-col min-w-0">
            <Topbar
              cwd={cwd}
              onChangeCwd={() => setPickerOpen(true)}
              activeSessionId={activeId}
              onOpenSettings={() => toast.info("Settings coming in Phase 3")}
            />
            <div className="flex-1 min-h-0">
              {activeId ? (
                <SessionView sessionId={activeId} />
              ) : (
                <EmptyState cwd={cwd} onNewSession={handleNewSession} />
              )}
            </div>
          </main>
        </>
      )}
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: "var(--bg-raised, #131a2a)",
            border: "1px solid var(--border, #1e2738)",
            color: "var(--fg, #e2e8f0)",
          },
        }}
      />
    </div>
  );
}

// Phase 1 placeholder for the message view. Phase 2 fills this in.
function SessionView({ sessionId }: { sessionId: string }) {
  const { data: session } = useSession(sessionId);
  return (
    <div className="h-full flex flex-col items-center justify-center bg-bg-base text-fg-muted">
      <div className="text-xs font-mono">{sessionId}</div>
      <div className="text-sm mt-2">{session?.title || "(loading…)"}</div>
      <div className="text-[10px] text-fg-subtle mt-3 max-w-md text-center">
        Phase 1: session selected. Chat composer streams in next iteration.
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300}>
        <Shell />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
