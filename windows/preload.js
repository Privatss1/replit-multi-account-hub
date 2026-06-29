const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  openDataFolder: () => ipcRenderer.invoke("open-data-folder"),
  getVersion: () => ipcRenderer.invoke("get-version"),
  platform: process.platform,
});
