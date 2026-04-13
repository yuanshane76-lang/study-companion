declare global {
  interface Window {
    electronAPI: {
      windowMinimize: () => void
      windowMaximize: () => void
      windowClose: () => void
      dbAll: (sql: string, params?: unknown[]) => Promise<unknown[]>
      dbRun: (sql: string, params?: unknown[]) => Promise<{ changes: number; lastInsertRowid: number | bigint }>
      dbGet: (sql: string, params?: unknown[]) => Promise<unknown>
      configGet: (key: string) => Promise<string | null>
      configSet: (key: string, value: string) => Promise<void>
      pdfOpen: () => Promise<{ path: string; name: string; size: number } | null>
      pdfParse: (pdfPath: string) => Promise<{ text: string; pageCount: number }>
    }
  }
}

export {}
