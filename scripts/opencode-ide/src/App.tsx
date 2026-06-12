import * as React from "react";
import { useEffect, useState } from "react";
import { QueryCache, MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { CwdPicker } from "@/components/cwd-picker";
import { EmptyState } from "@/components/empty-state";
import { MessageList } from "@/components/message-list";
import { ChatComposer } from "@/components/chat-composer";
import { RightPanel } from "@/components/right-panel";
import { HistoryDrawer } from "@/components/history-drawer";
import { loadPrefs, savePrefs, addRecentCwd } from "@/lib/prefs";
import {
  sessionKeys,
  useCreateSession,
  useMessages,
  useSession,
  useSessionEvents,
  useSessionStatus,
} from "@/hooks/use-sessions";
import { toast, Toaster } from "sonner";

const queryClient = new QueryClient({
  // Surface fetch errors in the console so we can see why a query
  // stopped working instead of staring at a silent empty sidebar.
  queryCache: new QueryCache({ onError: (err) => console.error("[query]", err) }),
  mutationCache: new MutationCache({ onError: (err) => console.error("[mutation]", err) }),
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Shell() {
  // Read prefs once, lazily. Cwd and the recents list never change
  // identity during a single mount unless the user picks a new folder.
  const [prefs] = useState(() => loadPrefs());
  const [cwd, setCwd] = useState<string>(prefs.cwd);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Single source of truth for the "new session" mutation. Sidebar uses
  // its own copy with a different onCreated (just selects it).
  const create = useCreateSession(cwd, (id) => {
    setActiveId(id);
    toast.success("Session created");
  });

  // SSE stream — always-on so the sidebar count + right panel stay
  // fresh even when no session is selected.
  useSessionEvents(true);

  // When cwd changes, clear the active session and re-fetch the list
  // for the new directory. Use the proper per-cwd key so we don't
  // invalidate unrelated queries (e.g. status polling).
  useEffect(() => {
    setActiveId(null);
    queryClient.invalidateQueries({ queryKey: sessionKeys.list(cwd) });
  }, [cwd]);

  // Mark the cwd as recent whenever it changes. addRecentCwd is
  // idempotent and dedupes, so it's safe to call here.
  useEffect(() => {
    if (cwd) addRecentCwd(cwd);
  }, [cwd]);

  // First launch: force open picker if no cwd is stored.
  useEffect(() => {
    if (!cwd) setPickerOpen(true);
  }, [cwd]);

  const handleNewSession = () => {
    if (!cwd) {
      setPickerOpen(true);
      return;
    }
    create.mutate();
  };

  // No early return before hooks. We render either the IDE shell OR
  // the CWD picker at the bottom; hooks above always run so React's
  // hook count stays stable across renders.
  const showPicker = pickerOpen || !cwd;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-base text-fg">
      {showPicker ? (
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
          <aside className="w-64 shrink-0">
            <Sidebar
              cwd={cwd}
              activeId={activeId}
              onSelect={setActiveId}
              onChangeCwd={() => setPickerOpen(true)}
            />
          </aside>
          <main className="flex flex-1 flex-col min-w-0 min-h-0">
            <Topbar
              cwd={cwd}
              onChangeCwd={() => setPickerOpen(true)}
              activeSessionId={activeId}
              onOpenHistory={() => setHistoryOpen(true)}
            />
            <div className="flex flex-1 min-h-0">
              <div className="flex flex-1 flex-col min-h-0 min-w-0">
                {activeId ? (
                  <>
                    <SessionPane sessionId={activeId} />
                    <ChatComposer sessionId={activeId} />
                  </>
                ) : (
                  <EmptyState cwd={cwd} onNewSession={handleNewSession} />
                )}
              </div>
              {activeId && <RightPanel sessionId={activeId} />}
            </div>
          </main>
          <HistoryDrawer
            open={historyOpen}
            onClose={() => setHistoryOpen(false)}
            cwd={cwd}
            activeId={activeId}
            onSelect={(id) => {
              setActiveId(id);
              setHistoryOpen(false);
            }}
          />
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

/**
 * Message transcript for a single session. Polls for new messages
 * while the session is busy; the SSE stream pushes invalidations too
 * so the polling can back off once the assistant finishes.
 */
function SessionPane({ sessionId }: { sessionId: string }) {
  const session = useSession(sessionId);
  const { data: messages } = useMessages(sessionId);
  const { data: status } = useSessionStatus();
  const busy = status?.[sessionId]?.type === "busy";

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="px-4 py-3 border-b border-border bg-bg-base">
        <div className="mx-auto max-w-3xl">
          <div className="text-xs text-fg-muted">
            {session?.title || "Untitled session"}
          </div>
        </div>
      </div>
      <MessageList messages={messages?.data ?? []} busy={busy} />
    </div>
  );
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[error-boundary]", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex h-screen w-screen items-center justify-center bg-bg-base text-fg p-8">
          <div className="max-w-lg text-center">
            <h1 className="text-lg font-semibold text-accent-red mb-2">IDE crashed</h1>
            <pre className="text-[10px] text-fg-muted text-left whitespace-pre-wrap break-all p-3 rounded-md bg-bg-surface border border-border">
              {this.state.error.message}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-3 py-1.5 text-xs rounded-md bg-brand text-bg-base hover:bg-brand-strong"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={300}>
          <Shell />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
