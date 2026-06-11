import { useState } from "react";
import { Search, X, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  cn,
  formatPathTail,
  formatRelativeTime,
  groupByProject,
} from "@/lib/utils";
import { useSessions } from "@/hooks/use-sessions";

type Props = {
  open: boolean;
  onClose: () => void;
  cwd: string;
  activeId: string | null;
  onSelect: (id: string) => void;
};

/**
 * Conversation History drawer (Antigravity-style). Slides in from the
 * right; lists every session across all projects, grouped by project
 * directory. Sessions are persisted to opencode's SQLite, so this
 * drawer is a browser — closing the app doesn't lose anything.
 */
export function HistoryDrawer({ open, onClose, cwd, activeId, onSelect }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative ml-auto h-full w-[540px] max-w-[85vw] bg-bg-surface border-l border-border shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <Body cwd={cwd} activeId={activeId} onSelect={onSelect} onClose={onClose} />
      </div>
    </div>
  );
}

function Body({
  cwd,
  activeId,
  onSelect,
  onClose,
}: {
  cwd: string;
  activeId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const { data, isLoading } = useSessions("");

  const filtered = (data ?? []).filter((s) => {
    if (!q.trim()) return true;
    const needle = q.toLowerCase();
    return (
      (s.title || "").toLowerCase().includes(needle) ||
      (s.directory || "").toLowerCase().includes(needle)
    );
  });
  const grouped = groupByProject(filtered);

  return (
    <>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <div className="text-sm font-semibold text-fg flex-1">Conversation History</div>
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-fg-muted">
          <Trash2 className="h-3.5 w-3.5" />
          <span className="text-[11px]">Clear all</span>
        </Button>
        <button
          onClick={onClose}
          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-fg-muted hover:text-fg hover:bg-bg-hover"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="px-4 py-3 border-b border-border space-y-2">
        <Button variant="primary" size="sm" className="w-full gap-1.5">
          <Plus className="h-3.5 w-3.5" /> New Conversation
        </Button>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-fg-subtle pointer-events-none" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by title or path…"
            className="h-8 pl-7 text-xs"
          />
        </div>
        <div className="text-[10px] text-fg-subtle">
          Current project: <span className="font-mono text-fg-muted">{formatPathTail(cwd) || cwd || "—"}</span>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        {isLoading && <div className="text-xs text-fg-subtle p-4">Loading…</div>}
        {grouped.map(([dir, items]) => (
          <div key={dir} className="pt-2">
            <div className="px-4 pb-1 text-[10px] uppercase tracking-wider text-fg-subtle font-semibold flex items-center justify-between">
              <span className="truncate" title={dir}>{formatPathTail(dir) || dir}</span>
              <span>{items.length}</span>
            </div>
            {items.map((s) => (
              <button
                key={s.id}
                onClick={() => onSelect(s.id)}
                className={cn(
                  "w-full text-left px-4 py-2 hover:bg-bg-hover transition-colors",
                  s.id === activeId ? "bg-brand/10 border-l-2 border-brand" : "border-l-2 border-transparent"
                )}
              >
                <div className="text-xs text-fg truncate">{s.title || "(untitled)"}</div>
                <div className="text-[10px] text-fg-subtle font-mono mt-0.5">
                  {formatRelativeTime(s.time.updated)} · {s.agent}
                </div>
              </button>
            ))}
          </div>
        ))}
        {!isLoading && grouped.length === 0 && (
          <div className="text-xs text-fg-subtle p-4">No sessions match.</div>
        )}
      </ScrollArea>
    </>
  );
}
