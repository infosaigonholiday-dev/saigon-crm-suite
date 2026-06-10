import { useState } from "react";
import { FolderSearch, ArrowRight, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type Props = {
  current: string;
  recents: string[];
  onPick: (cwd: string) => void;
};

// In a real app, "Browse…" would open a folder picker. Since opencode-ide is
// web-based and uses the loopback API, we fall back to a typed path. Common
// dev locations are suggested as quick picks.
const QUICK_PICKS = [
  "C:\\Users\\Yoga\\saigon-crm-suite",
  "C:\\Users\\Yoga",
  "C:\\dev",
  "C:\\projects",
];

export function CwdPicker({ current, recents, onPick }: Props) {
  const [draft, setDraft] = useState(current);

  return (
    <div className="flex h-full flex-col items-center justify-center bg-bg-base p-8">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 h-10 w-10 rounded-md bg-brand/10 border border-brand/20 flex items-center justify-center">
            <FolderSearch className="h-5 w-5 text-brand" />
          </div>
          <h1 className="text-lg font-semibold text-fg">Open a project</h1>
          <p className="text-xs text-fg-muted mt-1">
            Choose a folder on this machine. OpenCode will scan it and start a new session.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.trim()) onPick(draft.trim());
          }}
          className="flex gap-2"
        >
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="C:\path\to\project"
            className="flex-1 font-mono"
            autoFocus
          />
          <Button variant="primary" type="submit" disabled={!draft.trim()}>
            Open <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </form>

        {recents.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-fg-subtle mb-2">
              <History className="h-3 w-3" /> Recent
            </div>
            <ScrollArea className="max-h-32">
              <div className="space-y-0.5">
                {recents.map((r) => (
                  <button
                    key={r}
                    onClick={() => onPick(r)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-fg-muted hover:bg-bg-hover hover:text-fg font-mono"
                    )}
                  >
                    <FolderSearch className="h-3 w-3 text-fg-subtle" />
                    <span className="truncate">{r}</span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        <div className="mt-6">
          <div className="text-[10px] uppercase tracking-wider text-fg-subtle mb-2">Quick picks</div>
          <div className="grid grid-cols-2 gap-1.5">
            {QUICK_PICKS.map((p) => (
              <button
                key={p}
                onClick={() => onPick(p)}
                className="text-left text-xs font-mono text-fg-muted hover:text-fg hover:bg-bg-hover rounded-md px-2 py-1.5 truncate"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
