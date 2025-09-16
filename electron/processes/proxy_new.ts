/* eslint-disable @typescript-eslint/no-unused-vars */
// add exports at top-level
import http from "http";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import { resolveMitmScriptFilename } from "../resolve_mitm_script";
import { parseGoogleRequest } from "../parsers/google";
import { parseAdobeRequest } from "../parsers/adobe";
import { BrowserWindow } from "electron";

let mitmProcess: ChildProcessWithoutNullStreams | null = null;
const server = http.createServer();
// const wss = new WebSocketServer({ server });

let stdoutBuffer = "";
let firstEventSeen = false;
let batch: any[] = [];
let batchTimer: NodeJS.Timeout | null = null;
const BATCH_MS = 150; // flush interval

async function sendToRenderer(
  channel: string,
  payload: any,
  mainWindow: BrowserWindow | null
) {
  try {
    // prefer mainWindow if passed, else broadcast to all windows
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel, payload);
    } else {
      // fallback: broadcast to all windows

      const { BrowserWindow } = await import("electron");
      BrowserWindow.getAllWindows().forEach((w) =>
        w.webContents.send(channel, payload)
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
      // sendToRenderer("events-batch", batch);
      // optional: update persistent store here
      batch = [];
    }
    if (batchTimer) {
      clearTimeout(batchTimer);
      batchTimer = null;
    }
  }, BATCH_MS);
}

// move server.listen into startProxy and export both
export async function startProxy(
  window: BrowserWindow | null,
  opts?: {
    mitmdumpPath?: string;
    mitmPort?: number;
    webSocketPort?: number;
  }
) {
  const mitmdumpPath =
    opts?.mitmdumpPath || process.env.MITMDUMP_PATH || "mitmdump";
  const mitmPort = opts?.mitmPort ?? 8081;
  const mitmScript = await resolveMitmScriptFilename();

  if (!mitmScript) {
    console.error("Cannot start proxy: mitm_script.py not found");
    // notify UI via IPC so user gets an explanation
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
    mitmScript,
  ]);

  // console.log("[proxy] spawned mitmdump pid=", mitmProcess.pid);
  //   console.log("[proxy] spawning:", mitmdumpPath);
  //   console.log("[proxy] spawning:", mitmProcess);

  mitmProcess.stdout.on("data", (d) => {
    const text = d.toString();
    // debug raw output (optional)
    // console.debug("[mitm stdout raw]", text);

    // accumulate partial chunks and split by newline
    stdoutBuffer += text;
    const lines = stdoutBuffer.split(/\r?\n/);
    stdoutBuffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // try JSON first (recommended if your mitm addon emits JSON)
      let obj: any = null;
      try {
        obj = JSON.parse(trimmed);
      } catch {
        obj = null;
      }

      // console.log(obj);

      let event: any = null;

      if (obj) {
        // If your mitm_script prints a structured object: parse adapters (google/adobe)
        event = parseGoogleRequest(obj) || parseAdobeRequest(obj);
        if (!event) {
          event = {
            ts: obj.timestamp || Date.now(),
            source: "mitm",
            requestUrl: obj.url || obj.request || "",
            method: obj.method || "",
            payload: obj.body,
          };
        }
      } else {
        // fallback: try to parse common "METHOD URL STATUS" text lines or treat as raw
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
            host: urlObj ? urlObj.host : undefined,
            path: urlObj ? urlObj.pathname : undefined,
            event: match[1],
            requestUrl: url,
            payload: { status: status ?? null },
          };
        } else {
          // raw line fallback
          event = {
            ts: Date.now(),
            source: "proxy",
            event: "raw",
            requestUrl: trimmed.slice(0, 300),
            payload: { raw: trimmed },
          };
        }
      }

      // console.log(event, "event");

      // mark first-device-connected and notify renderer via proxy-status
      if (!firstEventSeen) {
        firstEventSeen = true;
        sendToRenderer(
          "proxy-status",
          {
            running: true,
            connected: true,
          },
          window
        );
      }

      console.log(event, 'eve')
      // push into batch and schedule flush
      batch.push(event);
      if (batch.length <= 200) {
        // immediate flush if large
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

  mitmProcess.stderr.on("data", (d) =>
    console.error("[mitm stderr]", d.toString())
  );

  mitmProcess.on("close", (code, signal) => {
    console.log(`[proxy] mitmdump closed (code=${code} signal=${signal})`);
    mitmProcess = null;
  });

  mitmProcess.on("exit", (code, signal) => {
    console.log(`[proxy] mitmdump exited (code=${code} signal=${signal})`);
    mitmProcess = null;
  });

  // start websocket/http server if not already listening
  if (!server.listening)
    server.listen(5000, () => console.log("[proxy] wss listening on :5000"));
}

export function stopProxy() {
  if (mitmProcess) {
    mitmProcess.kill();
    mitmProcess = null;
  }
  try {
    if (server.listening) server.close();
  } catch {
    /* empty */
  }
  console.log("[proxy] stopped");
}
