import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),

  // Database access
  dbAll: (sql: string, params?: unknown[]) => ipcRenderer.invoke('db:all', sql, params),
  dbRun: (sql: string, params?: unknown[]) => ipcRenderer.invoke('db:run', sql, params),
  dbGet: (sql: string, params?: unknown[]) => ipcRenderer.invoke('db:get', sql, params),

  // Config
  configGet: (key: string) => ipcRenderer.invoke('config:get', key),
  configSet: (key: string, value: string) => ipcRenderer.invoke('config:set', key, value),

  // PDF
  pdfOpen: () => ipcRenderer.invoke('pdf:open'),
  pdfParse: (pdfPath: string) => ipcRenderer.invoke('pdf:parse', pdfPath),
})

export type ElectronAPI = typeof window.electronAPI
