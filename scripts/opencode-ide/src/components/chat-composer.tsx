import { useEffect, useRef, useState } from "react";
import { ArrowUp, Plus, Mic, ChevronDown, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSendPrompt, useConfig } from "@/hooks/use-sessions";

type Props = {
  sessionId: string;
  disabled?: boolean;
  placeholder?: string;
};

/**
 * Chat composer. The textarea auto-grows up to 6 lines. Enter sends,
 * Shift+Enter inserts a newline. The send button is disabled while
 * the prompt mutation is in flight.
 *
 * Note: opencode 1.17.3 has no abort endpoint. To "cancel" a running
 * turn, the user can simply close the session / switch to another
 * one — the SSE stream will keep emitting but the UI just shows the
 * new state.
 */
export function ChatComposer({ sessionId, disabled, placeholder }: Props) {
  const [text, setText] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);
  const send = useSendPrompt(sessionId);
  const { data: cfg } = useConfig();

  // Reset the textarea after a successful send.
  useEffect(() => {
    if (send.isSuccess) {
      setText("");
      taRef.current?.focus();
    }
  }, [send.isSuccess]);

  // Auto-grow up to ~6 lines.
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, [text]);

  const canSend = text.trim().length > 0 && !send.isPending && !disabled;

  const onSend = () => {
    const t = text.trim();
    if (!t) return;
    send.mutate(t);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="px-4 pb-4 pt-2">
      <div className="mx-auto max-w-3xl">
        <div
          className={cn(
            "rounded-2xl border bg-bg-surface shadow-sm",
            "border-border focus-within:border-brand/60 focus-within:shadow-[0_0_0_3px_rgba(165,180,252,0.08)]",
            "transition-colors"
          )}
        >
          <textarea
            ref={taRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder ?? "Ask anything. @ to mention, / for actions"}
            disabled={disabled}
            rows={1}
            className={cn(
              "w-full resize-none bg-transparent px-4 pt-3 pb-2 text-sm text-fg placeholder:text-fg-subtle",
              "focus:outline-none disabled:opacity-50"
            )}
          />
          <div className="flex items-center gap-1 px-2 pb-2">
            <Button variant="ghost" size="icon" aria-label="Add attachment" className="h-7 w-7">
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-fg-muted"
              aria-label="Worktree"
            >
              <GitBranch className="h-3 w-3" />
              <span className="text-[11px]">Worktree</span>
            </Button>

            <div className="flex-1" />

            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-fg-muted" aria-label="Model">
              <span className="text-[11px] font-mono">{cfg?.model?.id ?? "default"}</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Dictate" className="h-7 w-7">
              <Mic className="h-3.5 w-3.5" />
            </Button>

            {send.isPending ? (
              <Button
                variant="primary"
                size="icon"
                disabled
                aria-label="Sending"
                className="h-8 w-8"
              >
                <ArrowUp className="h-4 w-4 animate-pulse" />
              </Button>
            ) : (
              <Button
                variant="primary"
                size="icon"
                onClick={onSend}
                disabled={!canSend}
                aria-label="Send"
                className="h-8 w-8"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        {send.isError && (
          <div className="mt-2 text-[11px] text-accent-red">
            Failed to send: {(send.error as Error).message}
          </div>
        )}
      </div>
    </div>
  );
}
