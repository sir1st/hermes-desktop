import { contextBridge, ipcRenderer } from 'electron'

// Expose minimal API to the renderer for cooperating with the bundled Web UI.
// The Web UI itself manages auth via its own mechanisms — we just provide the
// token so an early bootstrap script can store it before the UI fetches anything.
contextBridge.exposeInMainWorld('hermesDesktop', {
  getToken: (): Promise<string> => ipcRenderer.invoke('hermes-desktop:get-token'),
  platform: process.platform,
  isDesktop: true,
})

// Best-effort token bootstrap: as soon as the document is parsed, drop the token
// into localStorage where the Web UI client expects it. Key name is chosen to
// match hermes-web-ui's conventional auth storage; if the UI uses a different
// key we surface the token via the IPC bridge above as a fallback.
window.addEventListener('DOMContentLoaded', async () => {
  try {
    const token = await ipcRenderer.invoke('hermes-desktop:get-token')
    if (token) {
      try { localStorage.setItem('AUTH_TOKEN', token) } catch { /* */ }
      try { localStorage.setItem('hermes_auth_token', token) } catch { /* */ }
    }
  } catch {
    /* ignore */
  }
})
