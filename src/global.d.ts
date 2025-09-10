export {};

declare global {
  interface Window {
    bridge: {
      start: (target: string) => void;
      stop: (target: string) => void;
      onEvent: (callback: (event: any) => void) => void;
    };
  }
}
