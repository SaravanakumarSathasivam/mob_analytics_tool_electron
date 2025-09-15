"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("bridge", {
  start: () => electron.ipcRenderer.invoke("start-proxy"),
  stop: () => electron.ipcRenderer.invoke("stop-proxy"),
  getLocalIP: () => electron.ipcRenderer.invoke("get-local-ip"),
  onProxyStatus: (callback) => electron.ipcRenderer.on("proxy-status", (_, status) => callback(status)),
  onProxyLog: (callback) => {
    electron.ipcRenderer.on("proxy-event", (_event, payload) => {
      callback(payload);
    });
  },
  onProxyBatch: (cb) => electron.ipcRenderer.on("events-batch", (_e, b) => cb(b))
  // onEvent: (callback: (event: any) => void) =>
  //   ipcRenderer.on("event", (_e, data) => callback(data)),
});
