import { useEffect, useRef } from "react";
import { Loader2, User, Bot } from "lucide-react";
import { Markdown } from "./markdown";
import { cn } from "@/lib/utils";
import type { ContentItem, SessionMessage, UserMessage, AssistantMessage } from "@/lib/api";

type Props = {
  messages: SessionMessage[];
  busy: boolean;
};

/**
 * Renders the conversation transcript. Auto-scrolls to the bottom
 * when new content arrives, but only if the user is already near the
 * bottom — this way a user reading older messages isn't yanked down
 * every time the assistant types a token.
 */
export function MessageList({ messages, busy }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const stuckToBottom = useRef(true);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
      stuckToBottom.current = dist < 80;
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!stuckToBottom.current) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  if (messages.length === 0 && !busy) {
    return (
      <div className="flex h-full items-center justify-center text-fg-subtle text-sm">
        Send a prompt to get started.
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-3xl space-y-6">
        {messages.map((m) => (
          <MessageRow key={m.id} message={m} />
        ))}
        {busy && <TypingIndicator />}
      </div>
    </div>
  );
}

function MessageRow({ message }: { message: SessionMessage }) {
  if (message.type === "user") {
    return <UserRow message={message} />;
  }
  return <AssistantRow message={message} />;
}

function UserRow({ message }: { message: UserMessage }) {
  return (
    <div className="flex gap-3 justify-end">
      <div className="min-w-0 max-w-[80%] rounded-2xl px-4 py-3 bg-brand/10 border border-brand/20 text-fg">
        <Markdown source={message.text} />
      </div>
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-fg-dim/20 text-fg-muted">
        <User className="h-3.5 w-3.5" />
      </div>
    </div>
  );
}

function AssistantRow({ message }: { message: AssistantMessage }) {
  const hasError = !!message.error;
  return (
    <div className="flex gap-3 justify-start">
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand/10 border border-brand/20 text-brand">
        <Bot className="h-3.5 w-3.5" />
      </div>
      <div
        className={cn(
          "min-w-0 max-w-[80%] rounded-2xl px-4 py-3",
          hasError
            ? "bg-accent-red/10 border border-accent-red/30"
            : "bg-bg-surface border border-border"
        )}
      >
        {message.content.length === 0 ? (
          <div className="text-fg-subtle text-sm italic">…</div>
        ) : (
          message.content.map((c, i) => <ContentView key={i} item={c} />)
        )}
        {hasError && (
          <div className="mt-2 text-[11px] text-accent-red">
            {message.error?.data?.message ?? message.error?.name ?? "Unknown error"}
          </div>
        )}
        {message.finish && message.finish !== "stop" && (
          <div className="mt-2 text-[10px] uppercase tracking-wider text-fg-subtle">
            finish: {message.finish}
          </div>
        )}
      </div>
    </div>
  );
}

function ContentView({ item }: { item: ContentItem }) {
  switch (item.type) {
    case "text":
      return <Markdown source={item.text} />;
    case "reasoning":
      return (
        <div className="text-[12px] text-fg-muted italic border-l-2 border-border pl-3 my-1">
          {item.text}
        </div>
      );
    case "tool":
      return <ToolCard tool={item} />;
    default: {
      // Fallback for any future tool types we don't render explicitly:
      // show a small JSON dump so the user still sees something.
      const _exhaustive: never = item;
      void _exhaustive;
      return null;
    }
  }
}

function ToolCard({ tool }: { tool: { [k: string]: unknown } & { type: string } }) {
  // Best-effort display. opencode's tool content shape varies wildly
  // (bash, edit, read, fetch, websearch, ...). We surface the most
  // useful bits and a JSON dump of the rest.
  const name = (tool.tool as string) ?? (tool.name as string) ?? "tool";
  const state = (tool.state as string) ?? undefined;
  const args =
    (tool.input as unknown) ??
    (tool.args as unknown) ??
    (tool.parameters as unknown) ??
    null;
  const result =
    (tool.output as string) ??
    (tool.result as string) ??
    (tool.content as string) ??
    undefined;

  return (
    <div className="my-2 rounded-md border border-border bg-bg-base px-3 py-2 text-[12px]">
      <div className="flex items-center gap-2 font-mono text-fg-muted">
        <span className="rounded bg-brand/10 text-brand px-1.5">tool</span>
        <span className="text-fg">{name}</span>
        {state && (
          <span className="ml-auto text-[10px] uppercase tracking-wider text-fg-subtle">
            {state}
          </span>
        )}
      </div>
      {args != null && (
        <pre className="mt-1 overflow-x-auto font-mono text-[11px] text-fg-muted">
          {JSON.stringify(args, null, 2)}
        </pre>
      )}
      {result && (
        <pre className="mt-1 overflow-x-auto font-mono text-[11px] text-fg-muted border-t border-border pt-1 max-h-48 overflow-y-auto">
          {String(result).slice(0, 1500)}
          {String(result).length > 1500 ? "…" : ""}
        </pre>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand/10 border border-brand/20 text-brand">
        <Bot className="h-3.5 w-3.5" />
      </div>
      <div className="rounded-2xl border border-border bg-bg-surface px-4 py-3 text-fg-muted">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      </div>
    </div>
  );
}
