/* eslint-disable @typescript-eslint/no-explicit-any */
export type DebugEvent = {
  ts: number;
  source: 'network'|'android-logcat'|'ios-syslog';
  host: string;
  path: string;
  event: string;
  payload: any;
};
