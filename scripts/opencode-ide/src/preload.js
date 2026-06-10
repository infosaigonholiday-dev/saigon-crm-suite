// Preload: expose a small IPC surface to the renderer.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('opencodeIDE', {
  getInfo: () => ipcRenderer.invoke('oc:get-info'),
  reload: () => ipcRenderer.invoke('oc:reload'),
  openExternal: (url) => ipcRenderer.invoke('oc:open-external', url),
});
