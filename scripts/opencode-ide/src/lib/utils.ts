import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(unixMs: number): string {
  const now = Date.now();
  const diff = now - unixMs;
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  const month = Math.floor(day / 30);

  if (sec < 60) return "just now";
  if (min < 60) return `${min}m`;
  if (hr < 24) return `${hr}h`;
  if (day < 7) return `${day}d`;
  if (month < 1) {
    const w = Math.floor(day / 7);
    return `${w}w`;
  }
  if (month < 12) return `${month}mo`;
  return `${Math.floor(month / 12)}y`;
}

export function formatDateLabel(unixMs: number): string {
  const d = new Date(unixMs);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);
  if (d > weekAgo) return d.toLocaleDateString("en-US", { weekday: "long" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function groupByDate<T extends { time: { updated: number } }>(items: T[]) {
  const groups: Record<string, T[]> = {};
  for (const item of items) {
    const label = formatDateLabel(item.time.updated);
    if (!groups[label]) groups[label] = [];
    groups[label].push(item);
  }
  return Object.entries(groups);
}

/**
 * Tail the last 2 path components. "C:\\Users\\me\\projects\\app"
 * -> "projects/app". "C:\\Users" -> "Users". Used to render project
 * names in the sidebar without a full path taking too much room.
 */
export function formatPathTail(p: string): string {
  if (!p) return "";
  const norm = p.replace(/\\/g, "/").replace(/\/+$/, "");
  const parts = norm.split("/").filter(Boolean);
  if (parts.length <= 2) return parts.join("/") || norm;
  return parts.slice(-2).join("/");
}

/**
 * Group sessions by their project directory. opencode 1.17.3 returns
 * the path under .location.directory (v1) and .directory (v2 spec);
 * we accept either and bucket accordingly. Sessions without a path
 * go to "(unknown)".
 */
export function getSessionDir<T extends { directory?: string; location?: { directory?: string } }>(
  item: T
): string {
  return item.directory || item.location?.directory || "(unknown)";
}

export function groupByProject<
  T extends {
    directory?: string;
    location?: { directory?: string };
    time: { updated: number };
  }
>(items: T[]) {
  const groups: Record<string, T[]> = {};
  for (const item of items) {
    const key = getSessionDir(item);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  for (const k of Object.keys(groups)) {
    groups[k].sort((a, b) => b.time.updated - a.time.updated);
  }
  return Object.entries(groups).sort(
    (a, b) => b[1][0].time.updated - a[1][0].time.updated
  ) as [string, T[]][];
}
