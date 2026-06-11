import { Sparkles, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  cwd: string;
  onNewSession: () => void;
};

export function EmptyState({ cwd, onNewSession }: Props) {
  return (
    <div className="flex h-full items-center justify-center bg-bg-base">
      <div className="text-center max-w-md px-6">
        <div className="mx-auto mb-4 h-12 w-12 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center">
          <Sparkles className="h-6 w-6 text-brand" />
        </div>
        <h2 className="text-base font-semibold text-fg mb-1">Ready to code</h2>
        <p className="text-xs text-fg-muted mb-5">
          {cwd ? (
            <>Working in <span className="font-mono text-fg">{cwd}</span></>
          ) : (
            "Select a project to start"
          )}
        </p>
        <Button variant="primary" onClick={onNewSession}>
          <MessageSquare className="h-3.5 w-3.5" /> Start a new session
        </Button>
      </div>
    </div>
  );
}
