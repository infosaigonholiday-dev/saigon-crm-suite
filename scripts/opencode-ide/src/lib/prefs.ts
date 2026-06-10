// Persist user preferences in localStorage. Survives reloads.

const KEY = "opencode-ide:prefs:v1";

export type Prefs = {
  cwd: string;
  model: string;
  agent: string;
  recentCwds: string[];
  sidebarWidth: number;
};

const defaults: Prefs = {
  cwd: "",
  model: "",
  agent: "build",
  recentCwds: [],
  sidebarWidth: 288,
};

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaults };
    return { ...defaults, ...(JSON.parse(raw) as Partial<Prefs>) };
  } catch {
    return { ...defaults };
  }
}

export function savePrefs(p: Partial<Prefs>) {
  const current = loadPrefs();
  const next = { ...current, ...p };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function addRecentCwd(cwd: string) {
  if (!cwd) return;
  const p = loadPrefs();
  const recent = [cwd, ...p.recentCwds.filter((c) => c !== cwd)].slice(0, 8);
  savePrefs({ recentCwds: recent, cwd });
}
