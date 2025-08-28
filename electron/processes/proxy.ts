import http from "http";
import WebSocket, { WebSocketServer } from "ws";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

import { parseGoogleRequest } from "../parsers/google";
import { parseAdobeRequest } from "../parsers/adobe";
import { ParsedEvent } from "../parsers/common";

const SESSION_FILE = path.join(__dirname, "../../data/session.json");
let eventStore: ParsedEvent[] = [];

// Load previous session if exists
if (fs.existsSync(SESSION_FILE)) {
  try {
    eventStore = JSON.parse(fs.readFileSync(SESSION_FILE, "utf-8"));
    console.log(`Loaded ${eventStore.length} events from last session.`);
  } catch (err) {
    console.error("Error loading session:", err);
  }
}

// WebSocket server for live updates to React UI
const server = http.createServer();
const wss = new WebSocketServer({ server });

function broadcast(event: ParsedEvent) {
  wss.clients.forEach(
    (client: { readyState: unknown; send: (arg0: string) => void }) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(event));
      }
    }
  );
}

// Function to save events persistently
function saveSession() {
  fs.writeFileSync(SESSION_FILE, JSON.stringify(eventStore, null, 2));
}

// MITMProxy subprocess
function startProxy() {
  const mitmScript = path.join(__dirname, "mitm_script.py");

  const mitm = spawn("mitmdump", ["-s", mitmScript, "--listen-port", "8081"]);

  function isJSON(str: string) {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }

  mitm.stdout.on("data", (data) => {
    const text = data.toString().trim();
    if (!isJSON(text)) return;

    try {
      const req = JSON.parse(text);

      const parsed: ParsedEvent | null =
        parseGoogleRequest(req) || parseAdobeRequest(req);

      if (parsed) {
        eventStore.push(parsed);
        broadcast(parsed);
        saveSession();
      }
    } catch (err) {
      console.error("Parse error:", err);
    }
  });

  mitm.stderr.on("data", (data) => {
    console.error("MITMProxy error:", data.toString());
  });

  mitm.on("close", (code) => {
    console.log(`MITMProxy stopped with code ${code}`);
  });
}

server.listen(5000, () => {
  console.log("WebSocket server running on ws://localhost:5000");
  startProxy();
});
