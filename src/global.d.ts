export {};

declare global {
  interface Window {
    bridge: {
      start: (target: string) => Promise<void>;   // since ipcRenderer.invoke returns a Promise
      stop: (target: string) => Promise<void>;
      getLocalIP: () => Promise<string>;
      onProxyStatus: (callback: (status: any) => void) => void;
      onProxyLog: (callback: (event: any) => void) => void;
      onProxyBatch: (callback: (batch: any[]) => void) => void;
      
      // commented fn
      // onEvent: (callback: (event: any) => void) => void;
    };
  }
}

