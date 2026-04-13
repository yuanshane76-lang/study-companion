import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { getDb, closeDb } from './db'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Handle Vite dev server in development
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

let mainWindow: BrowserWindow | null = null

function createWindow() {
  // Initialize database
  const db = getDb()

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    frame: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Open DevTools in development
  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  closeDb()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Window control IPC
ipcMain.on('window-minimize', () => mainWindow?.minimize())
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})
ipcMain.on('window-close', () => mainWindow?.close())

// Database IPC handlers
ipcMain.handle('db:all', (_event, sql: string, params: unknown[] = []) => {
  const db = getDb()
  return db.prepare(sql).all(...params)
})

ipcMain.handle('db:run', (_event, sql: string, params: unknown[] = []) => {
  const db = getDb()
  return db.prepare(sql).run(...params)
})

ipcMain.handle('db:get', (_event, sql: string, params: unknown[] = []) => {
  const db = getDb()
  return db.prepare(sql).get(...params)
})

// Config IPC handlers
ipcMain.handle('config:get', (_event, key: string) => {
  const db = getDb()
  const row = db.prepare('SELECT value FROM config WHERE key = ?').get(key) as { value: string } | undefined
  return row?.value ?? null
})

ipcMain.handle('config:set', (_event, key: string, value: string) => {
  const db = getDb()
  db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').run(key, value)
})

// PDF handlers
ipcMain.handle('pdf:open', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: '选择 PDF 文件',
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
    properties: ['openFile'],
  })

  if (result.canceled || result.filePaths.length === 0) {
    return null
  }

  const filePath = result.filePaths[0]
  const stats = fs.statSync(filePath)

  if (stats.size > 50 * 1024 * 1024) {
    throw new Error('文件大小超过 50MB 限制')
  }

  const pdfDir = path.join(app.getPath('userData'), 'pdfs')
  if (!fs.existsSync(pdfDir)) {
    fs.mkdirSync(pdfDir, { recursive: true })
  }

  const destPath = path.join(pdfDir, `${Date.now()}_${path.basename(filePath)}`)
  fs.copyFileSync(filePath, destPath)

  return {
    path: destPath,
    name: path.basename(filePath),
    size: stats.size,
  }
})

ipcMain.handle('pdf:parse', async (_event, pdfPath: string) => {
  try {
    const pdfParse = (await import('pdf-parse')).default
    const dataBuffer = fs.readFileSync(pdfPath)
    const data = await pdfParse(dataBuffer)

    return {
      text: data.text,
      pageCount: data.numpages,
    }
  } catch (e) {
    throw new Error(`PDF 解析失败: ${(e as Error).message}`)
  }
})
