import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process';
import readline from 'node:readline';


let child: ChildProcessWithoutNullStreams | null = null;
let mockTimer: NodeJS.Timeout | null = null;


export async function startIOS(onEvent: (evt:unknown)=>void) {
if (process.platform !== 'darwin') {
// Non-macOS: just mock
if (!mockTimer) {
mockTimer = setInterval(() => {
onEvent({ ts: Date.now(), source: 'ios-syslog', host: 'device', path: '', event: 'log', payload: { line: 'MOCK iOS event (Windows/Linux)' } });
}, 2500);
}
return;
}
if (child || mockTimer) return;
try {
child = spawn('idevicesyslog');
const rl = readline.createInterface({ input: child.stdout });


rl.on('line', (line) => {
const low = line.toLowerCase();
if (low.includes('analytics') || low.includes('firebase') || low.includes('adobe') || low.includes('gtm')) {
onEvent({ ts: Date.now(), source: 'ios-syslog', host: 'device', path: '', event: 'log', payload: { line } });
}
});


child.on('close', () => { child = null; });
} catch (e) {
mockTimer = setInterval(() => {
onEvent({ ts: Date.now(), source: 'ios-syslog', host: 'device', path: '', event: 'log', payload: { line: 'MOCK iOS analytics event' } });
}, 2500);
}
}


export async function stopIOS() {
if (child) { child.kill(); child = null; }
if (mockTimer) { clearInterval(mockTimer); mockTimer = null; }
}