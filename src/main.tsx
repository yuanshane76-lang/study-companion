import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './styles/global.css'

// Mock electronAPI for browser development
if (!window.electronAPI) {
  window.electronAPI = {
    windowMinimize: () => console.log('[mock] windowMinimize'),
    windowMaximize: () => console.log('[mock] windowMaximize'),
    windowClose: () => console.log('[mock] windowClose'),
    dbAll: async () => [] as unknown[],
    dbRun: async () => ({ changes: 0, lastInsertRowid: 0n }),
    dbGet: async () => null,
    configGet: async () => null,
    configSet: async () => {},
    pdfOpen: async () => null,
    pdfParse: async () => ({ text: '', pageCount: 0 }),
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
)
