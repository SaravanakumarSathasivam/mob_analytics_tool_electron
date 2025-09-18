/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  JSXElementConstructor,
  Key,
  ReactElement,
  ReactNode,
  ReactPortal,
  useEffect,
  // useMemo,
  useState,
} from "react";
// import type { DebugEvent } from "./types";
import SetupGuideModal from "@components/SetupGuideModal";
// import { isAnalyticsEvent } from "@helpers/helper";

declare global {
  interface Window {
    bridge: any;
  }
}

type ProxyStatus = "stopped" | "running" | "connected";

export default function App() {
  // const [events, setEvents] = useState<DebugEvent[]>([]);
  const [query, setQuery] = useState("");
  const [localIP, setLocalIP] = useState("");
  const [logs, setLogs] = useState<any>([]);
  const [status, setStatus] = useState<ProxyStatus>("stopped");
  const [showGuide, setShowGuide] = useState(false);
  const [analyticsOnly, setShowAnalyticsOnly] = useState(true);

  // useEffect(() => {
  //   window.bridge.onProxyStatus(
  //     (status: { running: any; ip: SetStateAction<string> }) => {
  //       if (status.running) {
  //         setLocalIP(status.ip);
  //       } else {
  //         setLocalIP("");
  //       }
  //     }
  //   );
  // }, []);

  // useEffect(() => {
  //   window.bridge.onProxyLog((line: any) => {
  //     console.log(line, "lines");
  //     setLogs((prev: any) => [...prev, line]);
  //   });
  // }, []);

  useEffect(() => {
    console.log("Setting up proxy listener...");

    const handler = (payload: any) => {
      // Normalize: if payload is an array (a batch), use it as-is, otherwise wrap single event
      const items = Array.isArray(payload) ? payload : [payload];

      // Optional: ensure each item is an object in the expected shape
      const normalized = items.map((it: any) => {
        if (typeof it === "string") {
          return { ts: Date.now(), source: "proxy", event: "raw", payload: it };
        }
        // if it's already an event object, return as-is or map fields if necessary
        return it;
      });

      setLogs((prev: any[]) => {
        const merged = [...normalized, ...prev];
        // keep bounded length to avoid memory growth
        return merged.slice(0, 5000);
      });

      // debug
      console.log("Received", normalized.length, "events", normalized);
    };

    // subscribe
    window.bridge.onProxyLog(handler);

    // cleanup on unmount
    return () => {
      if (window.bridge.offProxyLog) {
        window.bridge.offProxyLog(handler);
      } else {
        // fallback: if off isn't available, no-op (but better to implement offProxyLog)
        console.warn(
          "offProxyLog not available on bridge; listener not removed"
        );
      }
    };
  }, []);

  const filteredLogs = analyticsOnly
    ? logs.filter(
        (log: { source: string }) =>
          log.source === "google_analytics" || log.source === "adobe_analytics"
      )
    : logs;

  useEffect(() => {
    (async () => {
      try {
        const ip = await window.bridge.getLocalIP?.(); // your bridge method
        if (ip) {
          setLocalIP(ip);
        }
        // optionally auto-open guide the first time (if dontShow not set)
        const skip = JSON.parse(
          localStorage.getItem("setupguide:dontshow") || "false"
        );
        if (!skip) setShowGuide(true);
      } catch (err) {
        console.warn("getLocalIP failed", err);
      }
    })();
  }, []);

  // useEffect(() => {
  //   if (window.ipcRenderer?.on) {
  //     window.ipcRenderer.on("event", (_e, evt) => {
  //       setEvents((prev) => [evt, ...prev].slice(0, 5000));
  //     });
  //   }
  // }, []);

  // const filtered = useMemo(() => {
  //   const q = query.toLowerCase();
  //   if (!q) return events;
  //   return events.filter(
  //     (e) =>
  //       e.event.toLowerCase().includes(q) ||
  //       e.source.toLowerCase().includes(q) ||
  //       JSON.stringify(e.payload).toLowerCase().includes(q) ||
  //       (e.host || "").toLowerCase().includes(q)
  //   );
  // }, [events, query]);

  console.log(filteredLogs, "filtered");

  return (
    <div className="flex flex-col h-screen w-screen">
      <div className="sticky top-0 z-10 shadow p-2 bg-gray-900 flex items-center justify-between w-full">
        {/* LEFT SECTION */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              window.bridge.start("proxy");
              setStatus("running");
            }}
            className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-500"
          >
            Start Proxy
          </button>
          <button
            onClick={() => {
              window.bridge.stop("proxy");
              setStatus("stopped");
            }}
            className="px-3 py-2 rounded bg-gray-700"
          >
            Stop Proxy
          </button>

          <span
            className={`ml-4 px-3 py-1 rounded text-sm ${
              status === "stopped"
                ? "bg-red-700"
                : status === "running"
                ? "bg-yellow-600"
                : "bg-green-600"
            }`}
          >
            {status.toUpperCase()}
          </span>

          {localIP && status === "running" && (
            <div className="ml-4 text-sm text-gray-400 font-bold">
              Proxy Address:{" "}
              <span className="text-green-400">{localIP}:8081</span>
            </div>
          )}

          <button
            onClick={() => setShowGuide(true)}
            className="px-3 py-2 rounded bg-gray-800"
          >
            Setup Guide
          </button>
        </div>

        {/* RIGHT SECTION */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAnalyticsOnly((prev) => !prev)}
            className="px-3 py-1 rounded bg-gray-300 text-white"
          >
            {analyticsOnly ? "All logs" : "Analytics logs"}
          </button>

          <button
            onClick={() => setLogs([])}
            className="px-3 py-2 rounded bg-gray-300 text-white"
          >
            Clear Logs
          </button>
          <div className="ml-auto">
            <input
              placeholder="Search events..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="px-3 py-2 rounded bg-gray-800 outline-none w-72"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 bg-gray-500">
        <table className="w-full text-sm">
          <thead className="bg-gray-900">
            <tr>
              <th className="text-left p-2 w-40">Time</th>
              <th className="text-left p-2 w-44">Source</th>
              {/* <th className="text-left p-2 w-64">Host/Path</th> */}
              <th className="text-left p-2 w-56">Event</th>
              <th className="text-left p-2">Payload</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map(
              (
                e: {
                  timestamp: string | number | Date;
                  ts: string | number | Date;
                  source:
                    | string
                    | number
                    | boolean
                    | ReactElement<any, string | JSXElementConstructor<any>>
                    | Iterable<ReactNode>
                    | ReactPortal
                    | null
                    | undefined;
                  host: any;
                  path: any;
                  event:
                    | string
                    | number
                    | boolean
                    | ReactElement<any, string | JSXElementConstructor<any>>
                    | Iterable<ReactNode>
                    | ReactPortal
                    | null
                    | undefined;
                  payload: any;
                },
                i: Key | null | undefined
              ) => (
                <tr key={i} className="odd:bg-gray-900/40">
                  {!analyticsOnly ? (
                    <td className="p-2">
                      {new Date(e.ts).toLocaleTimeString()}
                    </td>
                  ) : (
                    <td className="p-2">
                      {new Date(e.timestamp).toLocaleTimeString()}
                    </td>
                  )}
                  <td className="p-2">{e.source}</td>
                  {/* <td className="p-2">
                    {(e.host || "") + (e.path ? ` ${e.path}` : "")}
                  </td> */}
                  <td className="p-2">{e.event}</td>
                  <td className="p-2">
                    <pre className="whitespace-pre-wrap break-all">
                      {JSON.stringify(e.payload, null, 0).slice(0, 500)}
                    </pre>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
      <SetupGuideModal
        open={showGuide}
        onClose={() => setShowGuide(false)}
        localIp={localIP}
      />
    </div>
  );
}
