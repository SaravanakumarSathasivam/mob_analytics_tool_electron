/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import type { DebugEvent } from "./types";
declare global {
  interface Window {
    bridge: any;
  }
}

export default function App() {
  const [events, setEvents] = useState<DebugEvent[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (window.ipcRenderer?.on) {
      window.ipcRenderer.on("event", (_e, evt) => {
        setEvents((prev) => [evt, ...prev].slice(0, 5000));
      });
    }
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return events;
    return events.filter(
      (e) =>
        e.event.toLowerCase().includes(q) ||
        e.source.toLowerCase().includes(q) ||
        JSON.stringify(e.payload).toLowerCase().includes(q) ||
        (e.host || "").toLowerCase().includes(q)
    );
  }, [events, query]);

  return (
    <div className="h-screen w-screen p-4 bg-gray-950 text-gray-100">
      <div className="flex gap-2 mb-4 text-black">
        <button
          onClick={() => window.bridge.start("proxy")}
          className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-500"
        >
          Start Proxy
        </button>
        <button
          onClick={() => window.bridge.stop("proxy")}
          className="px-3 py-2 rounded bg-gray-700"
        >
          Stop Proxy
        </button>
        <button
          onClick={() => window.bridge.start("android")}
          className="px-3 py-2 rounded bg-green-600 hover:bg-green-500"
        >
          Start Android
        </button>
        <button
          onClick={() => window.bridge.stop("android")}
          className="px-3 py-2 rounded bg-gray-700"
        >
          Stop Android
        </button>
        <button
          onClick={() => window.bridge.start("ios")}
          className="px-3 py-2 rounded bg-purple-600 hover:bg-purple-500"
        >
          Start iOS (macOS)
        </button>
        <button
          onClick={() => window.bridge.stop("ios")}
          className="px-3 py-2 rounded bg-gray-700"
        >
          Stop iOS
        </button>
        <input
          placeholder="Search events..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="ml-auto px-3 py-2 rounded bg-gray-800 outline-none w-72 text-gray-100"
        />
      </div>
      <div className="border border-gray-800 rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-900">
            <tr>
              <th className="text-left p-2 w-40">Time</th>
              <th className="text-left p-2 w-44">Source</th>
              <th className="text-left p-2 w-64">Host/Path</th>
              <th className="text-left p-2 w-56">Event</th>
              <th className="text-left p-2">Payload</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e, i) => (
              <tr key={i} className="odd:bg-gray-900/40">
                <td className="p-2">{new Date(e.ts).toLocaleTimeString()}</td>
                <td className="p-2">{e.source}</td>
                <td className="p-2">
                  {(e.host || "") + (e.path ? ` ${e.path}` : "")}
                </td>
                <td className="p-2">{e.event}</td>
                <td className="p-2">
                  <pre className="whitespace-pre-wrap break-all">
                    {JSON.stringify(e.payload, null, 0).slice(0, 500)}
                  </pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
