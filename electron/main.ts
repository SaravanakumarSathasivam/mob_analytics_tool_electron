// /* eslint-disable @typescript-eslint/no-var-requires */
// import { app, BrowserWindow, ipcMain } from "electron";
// import path from "path";
// import { fileURLToPath } from "url";
// import os from "os";
// import { createRequire } from "node:module";

// const require = createRequire(import.meta.url)
// const __dirname = path.dirname(fileURLToPath(import.meta.url));
// let win: BrowserWindow | null = null;
// let proxyProcess: any = null;

// app.disableHardwareAcceleration();

// function createWindow() {
//   win = new BrowserWindow({
//     width: 1200,
//     height: 800,
//     webPreferences: {
//       preload: path.join(__dirname, "preload.mjs"),
//       contextIsolation: true,
//       nodeIntegration: false,
//     },
//   });

//   if (process.env.VITE_DEV_SERVER_URL) {
//     win.loadURL(process.env.VITE_DEV_SERVER_URL);
//   } else {
//     win.loadFile(path.join(__dirname, "../dist/index.html"));
//   }
// }

// function getLocalIP(): string | null {
//   const interfaces = os.networkInterfaces();
//   for (const name of Object.keys(interfaces)) {
//     for (const iface of interfaces[name] || []) {
//       if (iface.family === "IPv4" && !iface.internal) {
//         return iface.address;
//       }
//     }
//   }
//   return null;
// }

// ipcMain.on("start", (_e, target) => {
//   console.log(`Starting ${target}...`);
//   // TODO: spawn proxy/adb/ios script
//   const ip = getLocalIP();

//   const { spawn } = require("child_process");
//   if (!proxyProcess) {
//     proxyProcess = spawn("mitmproxy", ["--listen-port", "8081"]);
//   }

//   // proxyProcess.stdout.on("data", (data: { toString: () => any }) => {
//   //   win?.webContents.send("proxy-log", data.toString());
//   // });

//   proxyProcess.stdout.on("data", (data: { toString: () => string; }) => {
//     const line = data.toString().trim()

//     // Example parser: assume line looks like "GET http://example.com 200"
//     const match = line.match(/(GET|POST|PUT|DELETE)\s+(https?:\/\/[^ ]+)\s+(\d+)/)

//     const event = {
//       ts: Date.now(),
//       source: "proxy",
//       host: match ? new URL(match[2]).host : undefined,
//       path: match ? new URL(match[2]).pathname : undefined,
//       event: match ? match[1] : "raw",
//       payload: match ? { status: match[3] } : line,
//     }

//     BrowserWindow.getAllWindows().forEach((win) => {
//       win.webContents.send("event", event)
//     })
//   })

//   proxyProcess.stderr.on("data", (data: { toString: () => string }) => {
//     win?.webContents.send("proxy-log", "[ERR] " + data.toString());
//   });
//   // Start your proxy logic here...
//   win?.webContents.send("proxy-status", { running: true, ip });
//   return true;
// });

// ipcMain.on("stop", (_e, target) => {
//   console.log(`Stopping ${target}...`);

//   if (proxyProcess) {
//     proxyProcess.kill();
//     proxyProcess = null;
//   }

//   win?.webContents.send("proxy-status", { running: false, ip: null });
//   return true;
// });

// ipcMain.handle("get-local-ip", () => {
//   return getLocalIP();
// });

// app.whenReady().then(createWindow);

import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import os from "os";
import { startProxy, stopProxy } from "./processes/proxy_new.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// adjust path to where proxy compiled file lives

let win: BrowserWindow | null = null;

app.disableHardwareAcceleration();

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

ipcMain.handle("start-proxy", async (_e, opts) => {
  startProxy(win, opts);
  return true;
});

ipcMain.handle("stop-proxy", async () => {
  stopProxy();
  return true;
});

ipcMain.handle("get-local-ip", () => {
  return getLocalIP();
});

function getLocalIP(): string | null {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === "IPv4" && !iface.internal) {
          return iface.address;
        }
      }
    }
    return null;
  }

app.whenReady().then(createWindow);
