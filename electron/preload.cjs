const { contextBridge, ipcRenderer } = require("electron");

function subscribe(channel, callback) {
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld("adhiArena", {
  network: {
    scan: () => ipcRenderer.invoke("network:scan"),
    connect: (request) => ipcRenderer.invoke("network:connect", request),
    openLocationSettings: () => ipcRenderer.invoke("network:open-location-settings"),
  },
  updates: {
    check: () => ipcRenderer.invoke("updates:check"),
    download: () => ipcRenderer.invoke("updates:download"),
    install: () => ipcRenderer.invoke("updates:install"),
    getVersion: () => ipcRenderer.invoke("updates:version"),
    openAdminReleasePage: () => ipcRenderer.invoke("updates:open-admin-release-page"),
    onStatus: (callback) => subscribe("updates:status", callback),
  },
  exam: {
    setActive: (active) => ipcRenderer.send("exam:set-active", Boolean(active)),
  },
});
