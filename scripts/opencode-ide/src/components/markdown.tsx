// Minimal markdown renderer — handles the subset opencode produces
// in assistant messages: paragraphs, bold/italic, inline code, code
// blocks, unordered/ordered lists, and task-list checkboxes (which
// Antigravity uses for todo items).
//
// We avoid pulling in `react-markdown` / `marked` (~30-50KB) because
// the IDE cares about bundle size. The output is React elements, not
// HTML strings, so XSS is impossible by construction.

import * as React from "react";

type Node = React.ReactNode;

function renderInline(text: string, keyPrefix: string): Node[] {
  const out: Node[] = [];
  let i = 0;
  let buf = "";
  let counter = 0;
  const key = () => `${keyPrefix}-${counter++}`;

  const flush = () => {
    if (buf) {
      out.push(buf);
      buf = "";
    }
  };

  while (i < text.length) {
    // inline code: `...`
    if (text[i] === "`") {
      const end = text.indexOf("`", i + 1);
      if (end > i) {
        flush();
        out.push(
          <code
            key={key()}
            className="rounded bg-bg-raised border border-border px-1 py-0.5 text-[0.85em] font-mono text-fg"
          >
            {text.slice(i + 1, end)}
          </code>
        );
        i = end + 1;
        continue;
      }
    }
    // bold: **...**
    if (text.startsWith("**", i)) {
      const end = text.indexOf("**", i + 2);
      if (end > i + 2) {
        flush();
        out.push(
          <strong key={key()} className="font-semibold text-fg">
            {renderInline(text.slice(i + 2, end), key() + "-b")}
          </strong>
        );
        i = end + 2;
        continue;
      }
    }
    // italic: *...*  (single asterisk, but not if part of **)
    if (text[i] === "*" && text[i + 1] !== "*") {
      const end = text.indexOf("*", i + 1);
      if (end > i) {
        flush();
        out.push(
          <em key={key()} className="italic">
            {renderInline(text.slice(i + 1, end), key() + "-i")}
          </em>
        );
        i = end + 1;
        continue;
      }
    }
    buf += text[i];
    i++;
  }
  flush();
  return out;
}

type Block =
  | { kind: "p"; lines: string[] }
  | { kind: "code"; lang: string; body: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "todo"; items: { done: boolean; text: string }[] };

function parseBlocks(src: string): Block[] {
  const lines = src.split(/\r?\n/);
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Code fence
    if (/^```/.test(line)) {
      const m = line.match(/^```(\w*)/);
      const lang = m?.[1] ?? "";
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        body.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      blocks.push({ kind: "code", lang, body: body.join("\n") });
      continue;
    }

    // Task list (- [ ] or - [x])
    if (/^[-*]\s+\[[ x]\]/i.test(line)) {
      const items: { done: boolean; text: string }[] = [];
      while (i < lines.length && /^[-*]\s+\[[ x]\]/i.test(lines[i])) {
        const m = lines[i].match(/^[-*]\s+\[([ x])\]\s*(.*)$/i);
        if (m) items.push({ done: m[1].toLowerCase() === "x", text: m[2] });
        i++;
      }
      blocks.push({ kind: "todo", items });
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ""));
        i++;
      }
      blocks.push({ kind: "ul", items });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ kind: "ol", items });
      continue;
    }

    // Blank line -> paragraph break
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph (collect consecutive non-blank, non-list lines)
    const para: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^```/.test(lines[i]) &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push({ kind: "p", lines: para });
  }
  return blocks;
}

export function Markdown({ source }: { source: string }) {
  const blocks = parseBlocks(source);
  return (
    <div className="space-y-2 text-sm leading-relaxed text-fg">
      {blocks.map((b, idx) => {
        const k = `b-${idx}`;
        switch (b.kind) {
          case "p":
            return (
              <p key={k}>
                {b.lines.flatMap((ln, j) => [
                  ...renderInline(ln, `${k}-p${j}`),
                  j < b.lines.length - 1 ? <br key={`${k}-br${j}`} /> : null,
                ])}
              </p>
            );
          case "code":
            return (
              <pre
                key={k}
                className="rounded-md border border-border bg-bg-base px-3 py-2 overflow-x-auto text-[12px] font-mono text-fg"
              >
                <code>{b.body}</code>
              </pre>
            );
          case "ul":
            return (
              <ul key={k} className="list-disc pl-5 space-y-1">
                {b.items.map((it, j) => (
                  <li key={j}>{renderInline(it, `${k}-u${j}`)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={k} className="list-decimal pl-5 space-y-1">
                {b.items.map((it, j) => (
                  <li key={j}>{renderInline(it, `${k}-o${j}`)}</li>
                ))}
              </ol>
            );
          case "todo":
            return (
              <ul key={k} className="space-y-1">
                {b.items.map((it, j) => (
                  <li key={j} className="flex items-start gap-2">
                    <span
                      className={
                        "mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border " +
                        (it.done
                          ? "border-accent-green/50 bg-accent-green/20 text-accent-green"
                          : "border-border bg-bg-surface text-transparent")
                      }
                    >
                      {it.done ? "✓" : ""}
                    </span>
                    <span className={it.done ? "text-fg-muted line-through" : "text-fg"}>
                      {renderInline(it.text, `${k}-t${j}`)}
                    </span>
                  </li>
                ))}
              </ul>
            );
        }
      })}
    </div>
  );
}
