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
