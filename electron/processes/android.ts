import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process';
import readline from 'node:readline';


let child: ChildProcessWithoutNullStreams | null = null;
let mockTimer: NodeJS.Timeout | null = null;


export async function startAndroid(onEvent: (evt:unknown)=>void) {
if (child || mockTimer) return;
try {
child = spawn('adb', ['logcat', '-v', 'time']);
const rl = readline.createInterface({ input: child.stdout });


rl.on('line', (line) => {
const low = line.toLowerCase();
if (low.includes('analytics') || low.includes('firebase') || low.includes('adobe') || low.includes('gtm')) {
onEvent({
ts: Date.now(),
source: 'android-logcat',
host: 'device',
path: '',
event: 'log',
payload: { line }
});
}
});


child.on('close', () => { child = null; });
} catch (e) {
mockTimer = setInterval(() => {
onEvent({
ts: Date.now(), source: 'android-logcat', host: 'device', path: '', event: 'log',
payload: { line: 'MOCK Android analytics event ' + Math.random().toString(36).slice(2) }
});
}, 2000);
}
}


export async function stopAndroid() {
if (child) { child.kill(); child = null; }
if (mockTimer) { clearInterval(mockTimer); mockTimer = null; }
}