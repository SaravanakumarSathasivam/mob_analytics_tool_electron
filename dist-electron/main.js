import { app, ipcMain, BrowserWindow } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "fs";
import { spawn } from "child_process";
createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
const logFile = path.join(app.getPath("userData"), "app.log");
function logMessage(message) {
  const logEntry = `[${(/* @__PURE__ */ new Date()).toISOString()}] ${message}
`;
  console.log(logEntry.trim());
  fs.appendFileSync(logFile, logEntry);
}
function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname, "../preload.js")
    }
  });
  logMessage("Electron app started, creating window...");
  win.webContents.on("did-finish-load", () => {
    logMessage("Renderer loaded successfully");
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
ipcMain.on("renderer-log", (_, message) => {
  logMessage(`Renderer Log: ${message}`);
});
ipcMain.on("start-proxy", (_event, _args) => {
  const mitm = spawn("mitmproxy", ["--listen-port", "8081"]);
  mitm.stdout.on("data", (data) => {
    console.log(`[MITMPROXY] ${data}`);
  });
  mitm.stderr.on("data", (data) => {
    console.error(`[MITMPROXY ERROR] ${data}`);
  });
  mitm.on("close", (code) => {
    console.log(`mitmproxy exited with code ${code}`);
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    logMessage("All windows closed, quitting app");
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(() => {
  logMessage("App is ready");
  createWindow();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
