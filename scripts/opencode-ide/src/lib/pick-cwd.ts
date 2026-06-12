// Cross-environment "pick a folder" helper.
//
// In Electron (window.opencodeIDE.pickCwd is exposed via preload),
// we delegate to the native dialog. In a regular browser we fall
// back to a hidden <input type="file" webkitdirectory> — the user
// gets a real native folder picker, but only for folders the
// browser is allowed to see (Documents, Desktop, Downloads, etc.
// on the volumes the browser can read).

export type PickedCwd = {
  // Absolute path the IDE should open. In Electron this is the real
  // OS path. In browser mode this is a "file://" URL pointing at the
  // chosen directory; we coerce it to a path-like string the rest of
  // the app already handles.
  path: string;
  // Display name (last path component).
  name: string;
};

declare global {
  interface Window {
    opencodeIDE?: {
      pickCwd?: () => Promise<string | null>;
      getInfo?: () => Promise<unknown>;
    };
  }
}

export async function pickCwd(): Promise<PickedCwd | null> {
  // 1) Electron path — fast, full-filesystem access.
  if (typeof window !== "undefined" && window.opencodeIDE?.pickCwd) {
    const path = await window.opencodeIDE.pickCwd();
    if (!path) return null;
    return { path, name: path.replace(/\\/g, "/").split("/").filter(Boolean).pop() ?? path };
  }

  // 2) Browser fallback — <input type="file" webkitdirectory>.
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    // webkitdirectory / directory are non-standard but universally
    // supported in Chromium. The TS DOM lib doesn't have them typed
    // on HTMLInputElement, so we cast.
    (input as HTMLInputElement & { webkitdirectory: boolean }).webkitdirectory = true;
    (input as HTMLInputElement & { directory: boolean }).directory = true;
    input.multiple = false;
    input.style.position = "fixed";
    input.style.top = "-1000px";
    input.style.left = "-1000px";
    input.style.opacity = "0";
    document.body.appendChild(input);

    let settled = false;
    const cleanup = () => {
      if (!settled) {
        settled = true;
        if (input.parentNode) input.parentNode.removeChild(input);
      }
    };

    input.addEventListener("change", () => {
      if (settled) return;
      settled = true;
      const file = input.files?.[0];
      if (input.parentNode) input.parentNode.removeChild(input);
      if (!file) {
        resolve(null);
        return;
      }
      // In webkitdirectory mode, file.name is the relative path
      // inside the chosen directory. Combined with a `path` exposed
      // by the FileSystemFileHandle API (where available) or, more
      // reliably, the file.webkitRelativePath we can reconstruct
      // the directory. Modern Chromium exposes the full path through
      // the FileSystemDirectoryHandle API but that's opt-in; the
      // simplest portable thing is to use the directory label from
      // the file's name and accept that the renderer will show
      // whatever path the user actually sees in the OS picker.
      const dir = (file as File & { path?: string }).path ?? "";
      // In modern Chromium there's no `path`; instead the file's
      // webkitRelativePath starts with the directory name.
      const relative = file.webkitRelativePath || file.name;
      // Heuristic: webkitRelativePath looks like "MyProject/sub/".
      // We expose that as the displayed path. It's not a real OS
      // path but it's enough to identify the project in the UI.
      const fakePath = dir || relative.split("/")[0] || file.name;
      resolve({ path: fakePath, name: file.name.split("/")[0] || "project" });
    });

    // The user dismissed the picker without choosing.
    window.addEventListener(
      "focus",
      () => {
        setTimeout(() => {
          if (!settled) {
            cleanup();
            resolve(null);
          }
        }, 600);
      },
      { once: true }
    );

    input.click();
  });
}
