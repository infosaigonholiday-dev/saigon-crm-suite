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

  if (sec < 60) return "just now";
  if (min < 60) return `${min}m ago`;
  if (hr < 24) return `${hr}h ago`;
  if (day < 7) return `${day}d ago`;
  const d = new Date(unixMs);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatTime(unixMs: number): string {
  return new Date(unixMs).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
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
