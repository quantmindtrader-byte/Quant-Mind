const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Backend management
  startBackend: () => ipcRenderer.invoke('start-backend'),
  startAgent: (config) => ipcRenderer.invoke('start-agent', config),
  stopAgent: () => ipcRenderer.invoke('stop-agent'),
  getAppStatus: () => ipcRenderer.invoke('get-app-status'),

  // Ad-related operations
  showRewardedAd: (action) => ipcRenderer.invoke('show-rewarded-ad', action),
  saveConfigWithAdCheck: (configData, action) => ipcRenderer.invoke('save-config-with-ad-check', configData, action),
  forceReanalysisWithAd: () => ipcRenderer.invoke('force-reanalysis-with-ad'),
  adCompleted: (watched) => ipcRenderer.send('ad-completed', watched),
  onSetAdContext: (callback) => ipcRenderer.on('set-ad-context', callback),

  // Event listeners
  onBackendLog: (callback) => ipcRenderer.on('backend-log', callback),
  onBackendError: (callback) => ipcRenderer.on('backend-error', callback),
  onAgentLog: (callback) => ipcRenderer.on('agent-log', callback),
  onAgentError: (callback) => ipcRenderer.on('agent-error', callback),
  onMenuAction: (callback) => ipcRenderer.on('menu-action', callback),
  onResetConfigAfterAdCancel: (callback) => ipcRenderer.on('reset-config-after-ad-cancel', callback),

  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),

  // WebSocket connection helper
  createWebSocket: (port) => {
    return new WebSocket(`ws://localhost:${port}`);
  },

  // File dialog
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),

  // Auto-updater
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
  onUpdateDownloading: (callback) => ipcRenderer.on('update-downloading', callback),
  onUpdateReady: (callback) => ipcRenderer.on('update-ready', callback)
});