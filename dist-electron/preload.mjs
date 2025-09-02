"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("bridge", {
  log: (message) => electron.ipcRenderer.send("renderer-log", message),
  onMessage: (callback) => {
    electron.ipcRenderer.on("main-process-message", (_, data) => callback(data));
  },
  start: (arg) => electron.ipcRenderer.send("start-proxy", arg),
  stop: () => electron.ipcRenderer.send("stop-proxy")
});
