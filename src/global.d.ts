/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    bridge: {
      start: (arg: string) => void;
      stop: () => void;
    };
    ipcRenderer: {
      on: (channel: string, listener: (...args: any[]) => void) => void;
      off: (channel: string, listener: (...args: any[]) => void) => void;
      send: (channel: string, ...args: any[]) => void;
      invoke: (channel: string, ...args: any[]) => Promise<any>;
    };
  }
}
export {};
