import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("bridge", {
  start: (target: string) => ipcRenderer.send("start", target),
  stop: (target: string) => ipcRenderer.send("stop", target),
  getLocalIP: () => ipcRenderer.invoke("get-local-ip"),
  onProxyStatus: (callback: (arg0: any) => void) =>
    ipcRenderer.on("proxy-status", (_, status) => callback(status)),
  onEvent: (callback: (event: any) => void) =>
    ipcRenderer.on("event", (_e, data) => callback(data)),
});
