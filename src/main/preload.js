const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Backend management
  startBackend: () => ipcRenderer.invoke('start-backend'),
  startAgent: (config) => ipcRenderer.invoke('start-agent', config),
  stopAgent: () => ipcRenderer.invoke('stop-agent'),
  getAppStatus: () => ipcRenderer.invoke('get-app-status'),



  // Event listeners
  onBackendLog: (callback) => ipcRenderer.on('backend-log', callback),
  onBackendError: (callback) => ipcRenderer.on('backend-error', callback),
  onAgentLog: (callback) => ipcRenderer.on('agent-log', callback),
  onAgentError: (callback) => ipcRenderer.on('agent-error', callback),
  onMenuAction: (callback) => ipcRenderer.on('menu-action', callback),


  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),

  // WebSocket connection helper
  createWebSocket: (port) => {
    return new WebSocket(`ws://127.0.0.1:${port}`);
  },

  // File dialog
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),

  // Auto-updater methods
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  restartAndUpdate: () => ipcRenderer.invoke('restart-and-update'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // Auto-updater event listeners
  onUpdateChecking: (callback) => ipcRenderer.on('update-checking', callback),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (event, info) => callback(info)),
  onUpdateNotAvailable: (callback) => ipcRenderer.on('update-not-available', (event, info) => callback(info)),
  onUpdateDownloadProgress: (callback) => ipcRenderer.on('update-download-progress', (event, progress) => callback(progress)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (event, info) => callback(info)),
  onUpdateError: (callback) => ipcRenderer.on('update-error', (event, error) => callback(error)),
  removeAllUpdateListeners: () => {
    ipcRenderer.removeAllListeners('update-checking');
    ipcRenderer.removeAllListeners('update-available');
    ipcRenderer.removeAllListeners('update-not-available');
    ipcRenderer.removeAllListeners('update-download-progress');
    ipcRenderer.removeAllListeners('update-downloaded');
    ipcRenderer.removeAllListeners('update-error');
  }
});