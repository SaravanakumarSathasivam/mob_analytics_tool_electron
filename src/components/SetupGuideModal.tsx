import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

type Props = {
  open: boolean;
  onClose: () => void;
  localIp?: string | null;
};

function useLocalStorage(key: string, initial: boolean) {
  const [state, setState] = useState<boolean>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch { /* empty */ }
  }, [key, state]);
  return [state, setState] as const;
}

export default function SetupGuideModal({ open, onClose, localIp }: Props) {
  const certUrl = localIp ? `http://${localIp}:8081` : `http://mitm.it`;
  const [dontShowAgain, setDontShowAgain] = useLocalStorage("setupguide:dontshow", false);

  useEffect(() => {
    if (dontShowAgain && open) {
      // If user toggled "don't show again" while open, close the modal automatically next time.
      // That logic can also be stored & read by parent on mount.
    }
  }, [dontShowAgain, open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-[900px] max-w-full mx-4 bg-gray-900 text-gray-100 rounded-2xl shadow-2xl overflow-auto">
        <div className="p-6 flex gap-6">
          <div className="w-2/3">
            <div className="flex items-start justify-between">
              <h2 className="text-2xl font-semibold">Device Setup Guide</h2>
              <button
                aria-label="Close setup guide"
                onClick={onClose}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <ol className="mt-4 space-y-4 text-sm leading-relaxed list-decimal list-inside">
              <li>
                <strong>Connect</strong> your mobile device to the same Wi-Fi network as this computer.
              </li>
              <li>
                <strong>Start Proxy</strong> in this app. You should see:{" "}
                <span className="font-mono bg-gray-800 px-2 py-0.5 rounded ml-1">{localIp || "..."}</span>
                :<span className="font-mono">8081</span>
                <div className="mt-2 text-xs text-gray-400">
                  Tip: Click the copy icon next to the IP in the main UI to copy host:port.
                </div>
              </li>
              <li>
                <strong>Configure device proxy</strong> — Wi-Fi ▸ Modify network ▸ Advanced ▸ Proxy ▸ Manual.
                Hostname: <span className="font-mono">{localIp || "..."}</span> Port: <span className="font-mono">8081</span>
              </li>
              <li>
                <strong>Install the certificate</strong> — scan the QR or open:&nbsp;
                <a href={certUrl} target="_blank" rel="noreferrer" className="text-blue-400 underline">
                  {certUrl}
                </a>
                <div className="mt-1 text-xs text-gray-400">
                  Android: Settings → Security → Install from storage. <br />
                  iOS: Install profile then enable trust in Settings → General → About → Certificate Trust Settings.
                </div>
              </li>
              <li>
                <strong>Test</strong> — open the mobile app or page. Requests should appear in the desktop logs table.
              </li>
              <li>
                <strong>Finish</strong> — Press <em>Stop Proxy</em> and remove proxy settings on the device when done.
              </li>
            </ol>

            <div className="mt-6 flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="accent-indigo-500"
                />
                Don't show this guide again
              </label>
              <button
                onClick={onClose}
                className="ml-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded"
              >
                Got it — Close
              </button>
            </div>
          </div>

          <div className="w-1/3 flex flex-col items-center">
            <div className="bg-white p-4 rounded">
              <QRCodeSVG value={certUrl} size={200} />
            </div>
            <div className="mt-4 text-center text-sm">
              <div className="font-mono text-xs text-gray-200 break-all">{certUrl}</div>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(certUrl);
                  }}
                  className="px-3 py-2 bg-gray-800 rounded text-sm"
                >
                  Copy Cert URL
                </button>
                <button
                  onClick={() => {
                    // open link on host machine
                    window.open(certUrl, "_blank");
                  }}
                  className="px-3 py-2 bg-blue-600 rounded text-sm"
                >
                  Open
                </button>
              </div>
              <div className="mt-4 text-xs text-gray-400 text-left">
                <strong>Quick notes</strong>
                <ul className="list-disc list-inside mt-1">
                  <li>If device shows "No Internet", ensure proxy host & port are correct and mitmproxy is running.</li>
                  <li>Some apps use certificate pinning and will not be visible.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div> 
    </div>
  );
}
