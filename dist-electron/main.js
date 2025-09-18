import { app, dialog, ipcMain, BrowserWindow } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import os from "os";
import http from "http";
import { spawn } from "child_process";
import fs from "fs";
const __filename$1 = fileURLToPath(import.meta.url);
const __dirname$1 = path.dirname(__filename$1);
async function resolveMitmScriptFilename(allowPrompt = true) {
  const envPath = process.env.MITM_SCRIPT_PATH;
  if (envPath) {
    const abs = path.resolve(envPath);
    if (fs.existsSync(abs)) {
      console.log("[resolveMitmScript] using MITM_SCRIPT_PATH:", abs);
      return abs;
    } else {
      console.warn("[resolveMitmScript] MITM_SCRIPT_PATH set but file missing:", abs);
    }
  }
  const moduleCandidate = path.join(__dirname$1, "mitm_script.py");
  if (fs.existsSync(moduleCandidate)) {
    console.log("[resolveMitmScript] using module-relative candidate:", moduleCandidate);
    return moduleCandidate;
  }
  const projectRootCandidate1 = path.join(process.cwd(), "electron", "processes", "mitm_script.py");
  const projectRootCandidate2 = path.join(process.cwd(), "src", "electron", "processes", "mitm_script.py");
  for (const cand of [projectRootCandidate1, projectRootCandidate2]) {
    if (fs.existsSync(cand)) {
      console.log("[resolveMitmScript] using project-root candidate:", cand);
      return cand;
    }
  }
  if (app && app.isPackaged) {
    const packagedCandidate = path.join(process.resourcesPath, "mitm_script.py");
    if (fs.existsSync(packagedCandidate)) {
      console.log("[resolveMitmScript] using packaged resourcesPath candidate:", packagedCandidate);
      return packagedCandidate;
    }
  }
  console.warn("[resolveMitmScript] mitm_script.py not found automatically. Checked:", {
    moduleCandidate,
    projectRootCandidate1,
    projectRootCandidate2,
    packaged: app && app.isPackaged ? path.join(process.resourcesPath, "mitm_script.py") : null
  });
  if (allowPrompt && app) {
    const res = await dialog.showOpenDialog({
      title: "Locate mitm_script.py",
      properties: ["openFile"],
      filters: [{ name: "Python", extensions: ["py"] }]
    });
    if (!res.canceled && res.filePaths && res.filePaths[0]) {
      console.log("[resolveMitmScript] user selected:", res.filePaths[0]);
      return res.filePaths[0];
    }
  }
  return null;
}
function parseKeyValueString(data) {
  const cleaned = data.replace(/c\.\&a\.\&/g, "").replace(/\.c\&/g, "&").replace(/\.a\&/g, "&");
  const params = new URLSearchParams(cleaned);
  const obj = {};
  params.forEach((value, key) => {
    const decodedKey = decodeURIComponent(key);
    const decodedValue = decodeURIComponent(value);
    obj[decodedKey] = decodedValue;
  });
  return obj;
}
function parseQueryParams(url) {
  try {
    const parsedUrl = new URL(url, "http://dummy");
    return parseKeyValueString(parsedUrl.search);
  } catch {
    return {};
  }
}
function parseBodyParams(body, contentType) {
  if (!body) return {};
  try {
    if (contentType == null ? void 0 : contentType.includes("application/json")) {
      return JSON.parse(body);
    }
    if (contentType == null ? void 0 : contentType.includes("application/x-www-form-urlencoded")) {
      return parseKeyValueString(body);
    }
  } catch {
    return {};
  }
  return {};
}
function normalizeHeaders(headers) {
  const normalized = {};
  for (const [key, value] of Object.entries(headers)) {
    normalized[key.toLowerCase()] = Array.isArray(value) ? value.join(", ") : value;
  }
  return normalized;
}
function createParsedEvent(source, type, payload, method, requestUrl, headers, statusCode, timestamp) {
  return {
    timestamp: timestamp || (/* @__PURE__ */ new Date()).toISOString(),
    type,
    source,
    requestUrl,
    method,
    statusCode,
    headers,
    payload
  };
}
function isGoogleRequest(url) {
  if (!url) return false;
  return url.includes("google-analytics.com") || url.includes("analytics.google.com") || url.includes("/collect") || // GA Measurement Protocol
  url.includes("gtag/js");
}
function parseGoogleRequest(request) {
  var _a;
  if (!isGoogleRequest(request.url)) return null;
  const queryParams = parseQueryParams(request.url);
  const bodyParams = typeof request.body === "string" ? parseBodyParams(request.body, (_a = request.headers) == null ? void 0 : _a["content-type"]) : request.body || {};
  const headers = normalizeHeaders(request.headers);
  const eventName = queryParams.en || queryParams.t || "google_event";
  const payload = { ...queryParams, ...bodyParams };
  return createParsedEvent(
    "google_analytics",
    eventName,
    payload,
    request.method,
    request.url,
    headers,
    request.timestamp
  );
}
function isAdobeRequest(url) {
  if (!url) return false;
  return url.includes("omtrdc.net") || url.includes("adobedc.net") || url.includes("sc.omtrdc.net") || url.includes("/b/ss/");
}
function parseAdobeRequest(request) {
  var _a, _b;
  if (!isAdobeRequest(request.url)) return null;
  const queryParams = parseQueryParams(request.url);
  const contentType = ((_a = request.headers) == null ? void 0 : _a["Content-Type"]) || ((_b = request.headers) == null ? void 0 : _b["content-type"]);
  const bodyParams = parseBodyParams(request.body, contentType);
  const headers = normalizeHeaders(request.headers);
  const eventName = queryParams.pev2 || queryParams.pe || queryParams.pageName || "adobe_event";
  const payload = { ...queryParams, ...bodyParams };
  return createParsedEvent(
    "adobe_analytics",
    eventName,
    payload,
    request.method,
    request.url,
    headers,
    request.timestamp
  );
}
let mitmProcess = null;
const server = http.createServer();
let stdoutBuffer = "";
let firstEventSeen = false;
let batch = [];
let batchTimer = null;
const BATCH_MS = 150;
async function sendToRenderer(channel, payload, mainWindow) {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel, payload);
    } else {
      const { BrowserWindow: BrowserWindow2 } = await import("electron");
      BrowserWindow2.getAllWindows().forEach(
        (w) => w.webContents.send(channel, payload)
      );
    }
  } catch (err) {
    console.error("[proxy] sendToRenderer error:", err);
  }
}
function scheduleBatchFlush() {
  if (batchTimer) return;
  batchTimer = setTimeout(() => {
    if (batch.length > 0) {
      batch = [];
    }
    if (batchTimer) {
      clearTimeout(batchTimer);
      batchTimer = null;
    }
  }, BATCH_MS);
}
async function startProxy(window, opts) {
  const mitmdumpPath = (opts == null ? void 0 : opts.mitmdumpPath) || process.env.MITMDUMP_PATH || "mitmdump";
  const mitmPort = (opts == null ? void 0 : opts.mitmPort) ?? 8081;
  const mitmScript = await resolveMitmScriptFilename();
  if (!mitmScript) {
    console.error("Cannot start proxy: mitm_script.py not found");
    return;
  }
  if (mitmProcess) {
    console.log("[proxy] already running");
    return;
  }
  mitmProcess = spawn(mitmdumpPath, [
    "--listen-host",
    "0.0.0.0",
    "--listen-port",
    String(mitmPort),
    "-s",
    mitmScript
  ]);
  mitmProcess.stdout.on("data", (d) => {
    const text = d.toString();
    stdoutBuffer += text;
    const lines = stdoutBuffer.split(/\r?\n/);
    stdoutBuffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let obj = null;
      try {
        obj = JSON.parse(trimmed);
      } catch {
        obj = null;
      }
      let event = null;
      if (obj) {
        event = parseGoogleRequest(obj) || parseAdobeRequest(obj);
        if (!event) {
          event = {
            ts: obj.timestamp || Date.now(),
            source: "mitm",
            requestUrl: obj.url || obj.request || "",
            method: obj.method || "",
            payload: obj.body
          };
        }
      } else {
        const match = trimmed.match(
          /(GET|POST|PUT|DELETE|PATCH)\s+(https?:\/\/\S+)\s+(\d{2,3})?/i
        );
        if (match) {
          const url = match[2];
          const status = match[3];
          const urlObj = (() => {
            try {
              return new URL(url);
            } catch {
              return null;
            }
          })();
          event = {
            ts: Date.now(),
            source: "proxy",
            host: urlObj ? urlObj.host : void 0,
            path: urlObj ? urlObj.pathname : void 0,
            event: match[1],
            requestUrl: url,
            payload: { status: status ?? null }
          };
        } else {
          event = {
            ts: Date.now(),
            source: "proxy",
            event: "raw",
            requestUrl: trimmed.slice(0, 300),
            payload: { raw: trimmed }
          };
        }
      }
      if (!firstEventSeen) {
        firstEventSeen = true;
        sendToRenderer(
          "proxy-status",
          {
            running: true,
            connected: true
          },
          window
        );
      }
      console.log(event, "eve");
      batch.push(event);
      if (batch.length <= 200) {
        sendToRenderer("proxy-event", batch, window);
        batch = [];
        if (batchTimer) {
          clearTimeout(batchTimer);
          batchTimer = null;
        }
      } else {
        scheduleBatchFlush();
      }
    }
  });
  mitmProcess.stderr.on(
    "data",
    (d) => console.error("[mitm stderr]", d.toString())
  );
  mitmProcess.on("close", (code, signal) => {
    console.log(`[proxy] mitmdump closed (code=${code} signal=${signal})`);
    mitmProcess = null;
  });
  mitmProcess.on("exit", (code, signal) => {
    console.log(`[proxy] mitmdump exited (code=${code} signal=${signal})`);
    mitmProcess = null;
  });
  if (!server.listening)
    server.listen(5e3, () => console.log("[proxy] wss listening on :5000"));
}
function stopProxy() {
  if (mitmProcess) {
    mitmProcess.kill();
    mitmProcess = null;
  }
  try {
    if (server.listening) server.close();
  } catch {
  }
  console.log("[proxy] stopped");
}
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let win = null;
app.disableHardwareAcceleration();
function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
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
function getLocalIP() {
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
