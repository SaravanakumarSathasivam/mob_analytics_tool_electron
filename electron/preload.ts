// import { ipcRenderer, contextBridge } from 'electron'

// // --------- Expose some API to the Renderer process ---------
// contextBridge.exposeInMainWorld('ipcRenderer', {
//   on(...args: Parameters<typeof ipcRenderer.on>) {
//     const [channel, listener] = args
//     return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
//   },
//   off(...args: Parameters<typeof ipcRenderer.off>) {
//     const [channel, ...omit] = args
//     return ipcRenderer.off(channel, ...omit)
//   },
//   send(...args: Parameters<typeof ipcRenderer.send>) {
//     const [channel, ...omit] = args
//     return ipcRenderer.send(channel, ...omit)
//   },
//   invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
//     const [channel, ...omit] = args
//     return ipcRenderer.invoke(channel, ...omit)
//   },

//   // You can expose other APTs you need here.
//   // ...
// })

import { ipcRenderer, contextBridge } from 'electron'

contextBridge.exposeInMainWorld('bridge', {
  log: (message: string) => ipcRenderer.send('renderer-log', message),
  onMessage: (callback: (msg: any) => void) => {
    ipcRenderer.on('main-process-message', (_, data) => callback(data))
  },
  start: (arg: string) => ipcRenderer.send('start-proxy', arg),
  stop: () => ipcRenderer.send('stop-proxy'),
})

