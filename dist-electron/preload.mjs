"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("bridge", {
  start: (target) => electron.ipcRenderer.send("start", target),
  stop: (target) => electron.ipcRenderer.send("stop", target),
  getLocalIP: () => electron.ipcRenderer.invoke("get-local-ip"),
  onProxyStatus: (callback) => electron.ipcRenderer.on("proxy-status", (_, status) => callback(status)),
  onEvent: (callback) => electron.ipcRenderer.on("event", (_e, data) => callback(data))
});
