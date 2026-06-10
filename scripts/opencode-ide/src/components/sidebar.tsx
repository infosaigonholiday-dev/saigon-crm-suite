import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, MessageSquare, Loader2, AlertCircle, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn, formatRelativeTime, groupByDate } from "@/lib/utils";
import { useSessions, useSessionStatus, sessionKeys } from "@/hooks/use-sessions";
import { api } from "@/lib/api";
import type { SessionInfo } from "@/lib/api";

type Props = {
  cwd: string;
  activeId: string | null;
  onSelect: (id: string) => void;
  onChangeCwd: () => void;
};

export function Sidebar({ cwd, activeId, onSelect, onChangeCwd }: Props) {
  const [q, setQ] = useState("");
  const { data, isLoading, error, refetch } = useSessions(cwd);
  const { data: status } = useSessionStatus();
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: () => api.createSession({}),
    onSuccess: (s) => {
      qc.invalidateQueries({ queryKey: sessionKeys.list(cwd) });
      onSelect(s.id);
    },
  });

  const filtered = useMemo<SessionInfo[]>(() => {
    const all = data ?? [];
    if (!q.trim()) return all;
    const needle = q.toLowerCase();
    return all.filter((s) => (s.title || "(untitled)").toLowerCase().includes(needle));
  }, [data, q]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  return (
    <div className="flex h-full flex-col bg-bg-surface border-r border-border">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-border">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="h-2 w-2 rounded-full bg-brand-glow shadow-[0_0_8px_var(--brand-glow,#22c55e)]" />
          <span className="text-sm font-semibold text-fg tracking-wide">OpenCode</span>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="primary"
              size="icon"
              onClick={() => create.mutate()}
              disabled={create.isPending}
              aria-label="New session"
            >
              {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>New session</TooltipContent>
        </Tooltip>
      </div>

      {/* Project */}
      <button
        onClick={onChangeCwd}
        className="group flex items-center gap-2 px-3 py-2 border-b border-border hover:bg-bg-hover transition-colors text-left"
      >
        <FolderOpen className="h-3.5 w-3.5 text-fg-muted shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-fg-subtle">Project</div>
          <div className="text-xs text-fg truncate font-mono">{cwd || "— select folder —"}</div>
        </div>
        <Badge variant="default" className="text-[9px]">{(data ?? []).length}</Badge>
      </button>

      {/* Search */}
      <div className="px-3 py-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-fg-subtle pointer-events-none" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search sessions…"
            className="h-7 pl-7 text-xs"
          />
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        {isLoading && (
          <div className="flex items-center justify-center py-8 text-fg-subtle">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
          </div>
        )}
        {error && (
          <div className="m-3 p-3 rounded-md border border-accent-red/30 bg-accent-red/10 text-xs text-accent-red">
            <div className="flex items-center gap-2 font-semibold mb-1">
              <AlertCircle className="h-3.5 w-3.5" /> Cannot reach opencode
            </div>
            <div className="text-fg-muted">{(error as Error).message}</div>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2 w-full">
              Retry
            </Button>
          </div>
        )}
        {!isLoading && !error && grouped.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-fg-subtle">
            <MessageSquare className="h-8 w-8 mb-2 opacity-40" />
            <div className="text-xs">{q ? "No matches" : "No sessions yet"}</div>
            {!q && (
              <Button variant="primary" size="sm" className="mt-3" onClick={() => create.mutate()}>
                <Plus className="h-3.5 w-3.5" /> New session
              </Button>
            )}
          </div>
        )}
        <div className="pb-2">
          {grouped.map(([label, items]) => (
            <div key={label} className="pt-2">
              <div className="px-3 pb-1 text-[10px] uppercase tracking-wider text-fg-subtle font-semibold">
                {label}
              </div>
              {items.map((s) => {
                const st = status?.[s.id]?.type ?? "idle";
                const isActive = activeId === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => onSelect(s.id)}
                    className={cn(
                      "group flex w-full items-start gap-2 px-3 py-2 text-left transition-colors",
                      isActive
                        ? "bg-brand/10 border-l-2 border-brand"
                        : "hover:bg-bg-hover border-l-2 border-transparent"
                    )}
                  >
                    <StatusDot state={st} />
                    <div className="flex-1 min-w-0">
                      <div className={cn("text-xs truncate", isActive ? "text-fg" : "text-fg-muted group-hover:text-fg")}>
                        {s.title || "(untitled)"}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-fg-subtle font-mono">
                          {formatRelativeTime(s.time.updated)}
                        </span>
                        <span className="text-[10px] text-fg-dim">·</span>
                        <span className="text-[10px] text-fg-subtle">{s.agent}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function StatusDot({ state }: { state: "idle" | "busy" | "retry" }) {
  if (state === "busy") {
    return (
      <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent-amber animate-pulse-dot shadow-[0_0_6px_currentColor] text-accent-amber" />
    );
  }
  if (state === "retry") {
    return <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent-red" />;
  }
  return <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-fg-dim/50" />;
}
