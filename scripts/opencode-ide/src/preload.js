// Preload: expose a small IPC surface to the renderer.
//
// We expose *only* what's actually used. The renderer detects
// `window.opencodeIDE` and prefers the native dialog over the
// <input webkitdirectory> fallback. If preload isn't loaded (browser
// mode) the renderer falls back to the webkit input automatically.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('opencodeIDE', {
  /**
   * Open the native folder picker. Returns the chosen absolute path
   * (Windows-style backslashes preserved) or null if cancelled.
   */
  pickCwd: () => ipcRenderer.invoke('oc:pick-cwd'),
});
