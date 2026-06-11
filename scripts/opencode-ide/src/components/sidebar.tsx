import { useMemo, useState } from "react";
import { Plus, Search, MessageSquare, Loader2, AlertCircle, FolderOpen, ChevronDown, ChevronRight, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn, formatRelativeTime, groupByProject, formatPathTail } from "@/lib/utils";
import { useSessions, useSessionStatus, useCreateSession } from "@/hooks/use-sessions";
import type { SessionInfo } from "@/lib/api";

type Props = {
  cwd: string;
  activeId: string | null;
  onSelect: (id: string) => void;
  onChangeCwd: () => void;
};

/**
 * Antigravity-style sidebar. Top: brand + new session. Then a list of
 * sessions grouped by project (the `location.directory` of each
 * session). Groups are collapsible. We don't filter the data by cwd
 * here — the parent passes an empty filter, the user can see all
 * projects at once, and the active project's sessions get a subtle
 * highlight.
 */
export function Sidebar({ cwd, activeId, onSelect, onChangeCwd }: Props) {
  const [q, setQ] = useState("");
  const { data, isLoading, error, refetch } = useSessions("");
  const { data: status } = useSessionStatus();
  const create = useCreateSession(cwd, onSelect);

  const filtered = useMemo<SessionInfo[]>(() => {
    const all = data ?? [];
    if (!q.trim()) return all;
    const needle = q.toLowerCase();
    return all.filter((s) =>
      (s.title || "(untitled)").toLowerCase().includes(needle) ||
      (s.directory || "").toLowerCase().includes(needle)
    );
  }, [data, q]);

  const grouped = useMemo(() => groupByProject(filtered), [filtered]);

  return (
    <div className="flex h-full flex-col bg-bg-surface border-r border-border min-h-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-border">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="h-2 w-2 rounded-full bg-accent-green shadow-[0_0_8px_currentColor] text-accent-green" />
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

      {/* Project header (current cwd) */}
      <button
        onClick={onChangeCwd}
        className="group flex items-center gap-2 px-3 py-2 border-b border-border hover:bg-bg-hover transition-colors text-left"
      >
        <FolderOpen className="h-3.5 w-3.5 text-fg-muted shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-fg-subtle">Project</div>
          <div className="text-xs text-fg truncate font-mono">{formatPathTail(cwd) || "— select folder —"}</div>
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
            placeholder="Search…"
            className="h-7 pl-7 text-xs"
          />
        </div>
      </div>

      {/* Session groups */}
      <ScrollArea className="flex-1 min-h-0">
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
          {grouped.map(([dir, items]) => (
            <ProjectGroup
              key={dir}
              dir={dir}
              isCurrent={dir.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase() ===
                cwd.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase()}
              items={items}
              statusMap={status ?? {}}
              activeId={activeId}
              onSelect={onSelect}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Settings at bottom */}
      <div className="border-t border-border p-2">
        <button
          className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-fg-muted hover:text-fg hover:bg-bg-hover transition-colors"
        >
          <Settings className="h-3.5 w-3.5" />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
}

function ProjectGroup({
  dir,
  isCurrent,
  items,
  statusMap,
  activeId,
  onSelect,
}: {
  dir: string;
  isCurrent: boolean;
  items: SessionInfo[];
  statusMap: { [id: string]: { type: "idle" | "busy" | "retry" } };
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="pt-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-1.5 px-3 py-1.5 text-left hover:bg-bg-hover transition-colors"
      >
        {open ? <ChevronDown className="h-3 w-3 text-fg-subtle" /> : <ChevronRight className="h-3 w-3 text-fg-subtle" />}
        <span
          className={cn(
            "text-[10px] uppercase tracking-wider font-semibold flex-1 truncate",
            isCurrent ? "text-brand" : "text-fg-subtle"
          )}
          title={dir}
        >
          {formatPathTail(dir) || dir}
        </span>
        <Badge variant="default" className="text-[9px]">{items.length}</Badge>
      </button>
      {open && (
        <div>
          {items.map((s) => {
            const st = statusMap[s.id]?.type ?? "idle";
            const isActive = activeId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => onSelect(s.id)}
                className={cn(
                  "group flex w-full items-start gap-2 pl-7 pr-3 py-1.5 text-left transition-colors",
                  isActive
                    ? "bg-brand/10 border-l-2 border-brand"
                    : "hover:bg-bg-hover border-l-2 border-transparent"
                )}
              >
                <StatusDot state={st} />
                <div className="flex-1 min-w-0">
                  <div
                    className={cn(
                      "text-xs truncate",
                      isActive ? "text-fg" : "text-fg-muted group-hover:text-fg"
                    )}
                    title={s.title || "(untitled)"}
                  >
                    {s.title || "(untitled)"}
                  </div>
                  <div className="text-[10px] text-fg-subtle font-mono">
                    {formatRelativeTime(s.time.updated)}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
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
