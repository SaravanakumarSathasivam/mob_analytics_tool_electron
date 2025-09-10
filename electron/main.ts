import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import os from "os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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

ipcMain.on("start", (_e, target) => {
  console.log(`Starting ${target}...`);
  // TODO: spawn proxy/adb/ios script
  const ip = getLocalIP();
  // Start your proxy logic here...
  win?.webContents.send("proxy-status", { running: true, ip });
  return true;
});

ipcMain.on("stop", (_e, target) => {
  console.log(`Stopping ${target}...`);
  win?.webContents.send("proxy-status", { running: false, ip: null });
  return true;
});

ipcMain.handle("get-local-ip", () => {
  return getLocalIP();
});

app.whenReady().then(createWindow);
