import { useState } from "react";
import { ChevronDown, Cpu, Bot, History, Download, MoreHorizontal } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useConfig, useSessionStatus, useSession } from "@/hooks/use-sessions";
import { formatPathTail } from "@/lib/utils";

type Props = {
  cwd: string;
  onChangeCwd: () => void;
  activeSessionId: string | null;
  onOpenHistory?: () => void;
  onInstallIDE?: () => void;
};

/**
 * Topbar mimics the Antigravity look: project breadcrumb (clickable,
 * opens cwd picker), agent + model chips on the left, status dot on
 * the right. We add a "History" button so the user can open the
 * Conversation History drawer without scrolling the sidebar.
 */
export function Topbar({ cwd, onChangeCwd, activeSessionId, onOpenHistory, onInstallIDE }: Props) {
  const { data: cfg } = useConfig();
  const { data: status } = useSessionStatus();
  const session = useSession(activeSessionId);
  const [menuOpen, setMenuOpen] = useState(false);
  const st = activeSessionId ? status?.[activeSessionId]?.type ?? "idle" : "idle";

  return (
    <div className="flex h-11 items-center gap-2 border-b border-border bg-bg-base px-3">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onChangeCwd}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-fg-muted hover:bg-bg-hover hover:text-fg transition-colors"
          >
            <Bot className="h-3.5 w-3.5 text-brand" />
            <span className="font-mono max-w-[300px] truncate">
              {formatPathTail(cwd) || "no project"}
            </span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </button>
        </TooltipTrigger>
        <TooltipContent>{cwd || "Switch project"}</TooltipContent>
      </Tooltip>

      <div className="h-4 w-px bg-border mx-1" />

      <div className="flex items-center gap-1.5 text-[11px] text-fg-muted">
        <span>{cfg?.agent ?? "build"}</span>
      </div>
      <div className="h-4 w-px bg-border mx-1" />
      <div className="flex items-center gap-1.5 text-[11px] text-fg-muted">
        <Cpu className="h-3 w-3" />
        <span className="font-mono">{cfg?.model?.id ?? "—"}</span>
      </div>

      <div className="flex-1" />

      {session && (
        <div className="text-[11px] text-fg-muted max-w-[280px] truncate" title={session.title}>
          {session.title}
        </div>
      )}

      <div className="h-4 w-px bg-border mx-1" />

      <Badge
        variant={st === "busy" ? "warning" : st === "retry" ? "danger" : "default"}
        className="text-[10px]"
      >
        <span className={st === "busy" ? "animate-pulse-dot mr-1" : "mr-1"}>●</span>
        {st}
      </Badge>

      {onOpenHistory && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onOpenHistory}
              className="ml-1 flex h-7 w-7 items-center justify-center rounded-md text-fg-muted hover:bg-bg-hover hover:text-fg transition-colors"
              aria-label="Conversation History"
            >
              <History className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Conversation History</TooltipContent>
        </Tooltip>
      )}

      {onInstallIDE && (
        <button
          onClick={onInstallIDE}
          className="ml-1 inline-flex items-center gap-1.5 rounded-md bg-bg-surface border border-border px-2.5 py-1 text-[11px] text-fg hover:bg-bg-hover transition-colors"
        >
          <Download className="h-3 w-3" />
          <span>Install IDE</span>
        </button>
      )}

      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="ml-1 flex h-7 w-7 items-center justify-center rounded-md text-fg-muted hover:bg-bg-hover hover:text-fg transition-colors"
          aria-label="More"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
        {menuOpen && (
          <div
            className="absolute right-0 mt-1 w-44 rounded-md border border-border bg-bg-raised shadow-lg p-1 z-50"
            onMouseLeave={() => setMenuOpen(false)}
          >
            {["New Conversation", "Conversation History", "Scheduled Tasks", "Settings"].map((label) => (
              <button
                key={label}
                className="w-full text-left px-2 py-1.5 text-xs text-fg-muted hover:text-fg hover:bg-bg-hover rounded"
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
