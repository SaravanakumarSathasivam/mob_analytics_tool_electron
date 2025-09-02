/* eslint-disable @typescript-eslint/no-unused-vars */
// import { app, BrowserWindow } from 'electron'
// import { createRequire } from 'node:module'
// import { fileURLToPath } from 'node:url'
// import path from 'node:path'

// const require = createRequire(import.meta.url)
// const __dirname = path.dirname(fileURLToPath(import.meta.url))

// // The built directory structure
// //
// // ├─┬─┬ dist
// // │ │ └── index.html
// // │ │
// // │ ├─┬ dist-electron
// // │ │ ├── main.js
// // │ │ └── preload.mjs
// // │
// process.env.APP_ROOT = path.join(__dirname, '..')

// // 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
// export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
// export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
// export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

// process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

// let win: BrowserWindow | null

// function createWindow() {
//   win = new BrowserWindow({
//     icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
//     webPreferences: {
//       preload: path.join(__dirname, 'preload.mjs'),
//     },
//   })

//   // Test active push message to Renderer-process.
//   win.webContents.on('did-finish-load', () => {
//     win?.webContents.send('main-process-message', (new Date).toLocaleString())
//   })

//   if (VITE_DEV_SERVER_URL) {
//     win.loadURL(VITE_DEV_SERVER_URL)
//   } else {
//     // win.loadFile('dist/index.html')
//     win.loadFile(path.join(RENDERER_DIST, 'index.html'))
//   }
// }

// // Quit when all windows are closed, except on macOS. There, it's common
// // for applications and their menu bar to stay active until the user quits
// // explicitly with Cmd + Q.
// app.on('window-all-closed', () => {
//   if (process.platform !== 'darwin') {
//     app.quit()
//     win = null
//   }
// })

// app.on('activate', () => {
//   // On OS X it's common to re-create a window in the app when the
//   // dock icon is clicked and there are no other windows open.
//   if (BrowserWindow.getAllWindows().length === 0) {
//     createWindow()
//   }
// })

// app.whenReady().then(createWindow)

import { app, BrowserWindow, ipcMain } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "fs";
import { spawn } from "child_process";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, "..");
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

let win: BrowserWindow | null;
const logFile = path.join(app.getPath("userData"), "app.log");

function logMessage(message: string) {
  const logEntry = `[${new Date().toISOString()}] ${message}\n`;
  console.log(logEntry.trim()); // prints in terminal
  fs.appendFileSync(logFile, logEntry); // saves to file
}

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
    },
  });

  logMessage("Electron app started, creating window...");

  win.webContents.on("did-finish-load", () => {
    logMessage("Renderer loaded successfully");
    win?.webContents.send("main-process-message", new Date().toLocaleString());
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

   mitm.stdout.on('data', data => {
    console.log(`[MITMPROXY] ${data}`)
  })

  mitm.stderr.on('data', data => {
    console.error(`[MITMPROXY ERROR] ${data}`)
  })

  mitm.on('close', code => {
    console.log(`mitmproxy exited with code ${code}`)
  })
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
