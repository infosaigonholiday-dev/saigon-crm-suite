import { ChevronDown, Folder, Cpu, Bot, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useConfig, useSessionStatus } from "@/hooks/use-sessions";

type Props = {
  cwd: string;
  onChangeCwd: () => void;
  activeSessionId: string | null;
  onOpenSettings: () => void;
};

export function Topbar({ cwd, onChangeCwd, activeSessionId, onOpenSettings }: Props) {
  const { data: cfg } = useConfig();
  const { data: status } = useSessionStatus();
  const st = activeSessionId ? status?.[activeSessionId]?.type ?? "idle" : "idle";

  return (
    <div className="flex h-10 items-center gap-2 border-b border-border bg-bg-surface px-3">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onChangeCwd}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-fg-muted hover:bg-bg-hover hover:text-fg transition-colors"
          >
            <Folder className="h-3.5 w-3.5" />
            <span className="font-mono max-w-[280px] truncate">{cwd || "no project"}</span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Switch project</TooltipContent>
      </Tooltip>

      <div className="h-4 w-px bg-border mx-1" />

      <div className="flex items-center gap-1.5 text-xs text-fg-muted">
        <Bot className="h-3.5 w-3.5" />
        <span>{cfg?.agent ?? "build"}</span>
      </div>
      <div className="h-4 w-px bg-border mx-1" />
      <div className="flex items-center gap-1.5 text-xs text-fg-muted">
        <Cpu className="h-3.5 w-3.5" />
        <span className="font-mono">{cfg?.model ?? "—"}</span>
      </div>

      <div className="flex-1" />

      <Badge variant={st === "busy" ? "warning" : st === "retry" ? "danger" : "default"} className="text-[10px]">
        <span className={st === "busy" ? "animate-pulse-dot mr-1" : "mr-1"}>●</span>
        {st}
      </Badge>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" onClick={onOpenSettings} aria-label="Settings">
            <Settings2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Settings</TooltipContent>
      </Tooltip>
    </div>
  );
}
