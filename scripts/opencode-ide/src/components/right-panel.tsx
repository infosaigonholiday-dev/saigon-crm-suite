import { useState } from "react";
import { ChevronDown, ChevronRight, FileText, Image as ImageIcon, ListTree, Activity } from "lucide-react";
import { useMessages, useSession } from "@/hooks/use-sessions";
import { Badge } from "@/components/ui/badge";

type Props = { sessionId: string };

/**
 * Right panel: Overview / Review / Walkthrough. The first phase only
 * fills in "Overview" with a couple of useful readouts (tool call
 * counts, session metadata). The other tabs are placeholders.
 */
export function RightPanel({ sessionId }: Props) {
  const [tab, setTab] = useState<"overview" | "review" | "walkthrough">("overview");
  const session = useSession(sessionId);
  const { data: messagesResp } = useMessages(sessionId);
  const messages = messagesResp?.data ?? [];

  const toolCounts = countTools(messages);

  return (
    <aside className="w-80 shrink-0 border-l border-border bg-bg-surface flex flex-col min-h-0">
      <div className="flex items-center gap-1 px-2 pt-2 border-b border-border">
        {(["overview", "review", "walkthrough"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              "px-3 py-2 text-[11px] uppercase tracking-wider font-medium transition-colors " +
              (tab === t
                ? "text-fg border-b-2 border-brand"
                : "text-fg-muted hover:text-fg border-b-2 border-transparent")
            }
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <Section
            title="Subagents"
            count={0}
            icon={<Activity className="h-3 w-3" />}
            empty="No subagents running."
          />
          <Section
            title="Files Changed"
            count={toolCounts.edit + toolCounts.write}
            icon={<FileText className="h-3 w-3" />}
            empty="No files changed yet."
          />
          <Section
            title="Artifacts"
            count={toolCounts.snapshot}
            icon={<ImageIcon className="h-3 w-3" />}
            empty="No artifacts produced."
          />
          <Section
            title="Background Tasks"
            count={toolCounts.bash + toolCounts.shell}
            icon={<ListTree className="h-3 w-3" />}
            empty="No background tasks."
          />

          {session && (
            <div className="mt-4 rounded-md border border-border bg-bg-base p-3 text-[11px] font-mono text-fg-muted space-y-1">
              <Row k="id" v={session.id} />
              <Row k="agent" v={session.agent ?? "build"} />
              <Row k="model" v={session.model ? `${session.model.providerID}/${session.model.id}` : "—"} />
              <Row k="cost" v={`$${(session.cost ?? 0).toFixed(4)}`} />
              <Row k="tokens" v={String((session.tokens?.input ?? 0) + (session.tokens?.output ?? 0))} />
            </div>
          )}
        </div>
      )}

      {tab !== "overview" && (
        <div className="flex-1 flex items-center justify-center p-6 text-center text-fg-subtle text-xs">
          {tab === "review" ? "Review" : "Walkthrough"} — coming in a later release.
        </div>
      )}
    </aside>
  );
}

function Section({
  title,
  count,
  icon,
  empty,
}: {
  title: string;
  count: number;
  icon: React.ReactNode;
  empty: string;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-md border border-border bg-bg-base">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-bg-hover transition-colors"
      >
        {open ? <ChevronDown className="h-3 w-3 text-fg-muted" /> : <ChevronRight className="h-3 w-3 text-fg-muted" />}
        <span className="text-fg-muted">{icon}</span>
        <span className="text-xs font-medium text-fg flex-1">{title}</span>
        <Badge variant="default" className="text-[10px]">{count}</Badge>
      </button>
      {open && (
        <div className="px-3 pb-3 text-[11px] text-fg-subtle">
          {empty}
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-fg-subtle">{k}</span>
      <span className="text-fg truncate max-w-[180px]" title={v}>{v}</span>
    </div>
  );
}

type ToolKey = "edit" | "write" | "snapshot" | "bash" | "shell";
function countTools(messages: { type: string; content?: unknown[] }[]): Record<ToolKey, number> {
  const out: Record<ToolKey, number> = { edit: 0, write: 0, snapshot: 0, bash: 0, shell: 0 };
  for (const m of messages) {
    if (m.type !== "assistant" || !Array.isArray(m.content)) continue;
    for (const c of m.content) {
      if (!c || typeof c !== "object") continue;
      const item = c as { type?: string; tool?: string };
      if (item.type !== "tool") continue;
      const name = String(item.tool ?? "").toLowerCase();
      if (name in out) out[name as ToolKey] += 1;
    }
  }
  return out;
}
