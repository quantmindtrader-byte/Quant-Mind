const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Backend management
  startBackend: () => ipcRenderer.invoke('start-backend'),
  startAgent: (config) => ipcRenderer.invoke('start-agent', config),
  stopAgent: () => ipcRenderer.invoke('stop-agent'),
  getAppStatus: () => ipcRenderer.invoke('get-app-status'),

  // MT5 Bridge management
  startBridge: () => ipcRenderer.invoke('start-bridge'),
  stopBridge: () => ipcRenderer.invoke('stop-bridge'),
  checkBridge: () => ipcRenderer.invoke('check-bridge'),
  bridgeRequest: (endpoint, options) => ipcRenderer.invoke('bridge-request', endpoint, options),

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
  onBridgeConnected: (callback) => ipcRenderer.on('bridge-connected', callback),
  onBridgeDisconnected: (callback) => ipcRenderer.on('bridge-disconnected', callback),
  onBridgeError: (callback) => ipcRenderer.on('bridge-error', callback),

  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),

  // WebSocket connection helper
  createWebSocket: (port) => {
    return new WebSocket(`ws://127.0.0.1:${port}`);
  },

  // File dialog
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),

  // HTTP requests (bypass Electron security)
  httpRequest: (url, options) => ipcRenderer.invoke('http-request', url, options),

  // User management
  setUserId: (userId) => ipcRenderer.invoke('set-user-id', userId),

  // Notifications
  showNotification: (options) => ipcRenderer.invoke('show-notification', options),
  
  // Log file reading
  readLogFile: (userId) => ipcRenderer.invoke('read-log-file', userId),
  
  // MT5 Config management
  saveMT5Config: (configData) => ipcRenderer.invoke('save-mt5-config', configData),
  fetchMT5Config: () => ipcRenderer.invoke('fetch-mt5-config'),
  addMT5Account: (accountData) => ipcRenderer.invoke('add-mt5-account', accountData),
  updateMT5Account: (accountData) => ipcRenderer.invoke('update-mt5-account', accountData),
  removeMT5Account: (configName) => ipcRenderer.invoke('remove-mt5-account', configName),

  // Auto-update
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
  onUpdateDownloadProgress: (callback) => ipcRenderer.on('update-download-progress', callback),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback)
});
