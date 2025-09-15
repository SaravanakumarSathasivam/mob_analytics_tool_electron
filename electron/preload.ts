import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("bridge", {
  start: () => ipcRenderer.invoke("start-proxy"),
  stop: () => ipcRenderer.invoke("stop-proxy"),
  getLocalIP: () => ipcRenderer.invoke("get-local-ip"),
  onProxyStatus: (callback: (arg0: any) => void) =>
    ipcRenderer.on("proxy-status", (_, status) => callback(status)),
  onProxyLog: (callback: (event: any) => void) => {
    ipcRenderer.on("proxy-event", (_event, payload) => {
      callback(payload);
    });
  },
  onProxyBatch: (cb: (b: any[]) => void) =>
    ipcRenderer.on("events-batch", (_e, b) => cb(b)),

  // onEvent: (callback: (event: any) => void) =>
  //   ipcRenderer.on("event", (_e, data) => callback(data)),
});
