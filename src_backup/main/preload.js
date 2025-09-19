const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Backend management
  checkBackend: () => ipcRenderer.invoke('check-backend'),
  startAgent: (config) => ipcRenderer.invoke('start-agent', config),
  stopAgent: () => ipcRenderer.invoke('stop-agent'),
  getAppStatus: () => ipcRenderer.invoke('get-app-status'),

  // Ad-related operations
  showRewardedAd: (action) => ipcRenderer.invoke('show-rewarded-ad', action),
  saveConfigWithAdCheck: (configData, action) => ipcRenderer.invoke('save-config-with-ad-check', configData, action),
  forceReanalysisWithAd: () => ipcRenderer.invoke('force-reanalysis-with-ad'),
  adCompleted: (watched) => ipcRenderer.send('ad-completed', watched),
  onSetAdContext: (callback) => ipcRenderer.on('set-ad-context', callback),

  // Auto-updater
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),

  // Event listeners
  onBackendConnected: (callback) => ipcRenderer.on('backend-connected', callback),
  onBackendDisconnected: (callback) => ipcRenderer.on('backend-disconnected', callback),
  onBackendError: (callback) => ipcRenderer.on('backend-error', callback),
  onBotStarted: (callback) => ipcRenderer.on('bot-started', callback),
  onBotStopped: (callback) => ipcRenderer.on('bot-stopped', callback),
  onAgentError: (callback) => ipcRenderer.on('agent-error', callback),
  onMenuAction: (callback) => ipcRenderer.on('menu-action', callback),
  onAnalyticsUpdate: (callback) => ipcRenderer.on('analytics-update', callback),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
  onUpdateDownloading: (callback) => ipcRenderer.on('update-downloading', callback),
  onUpdateReady: (callback) => ipcRenderer.on('update-ready', callback),

  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),

  // File dialog
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog')
});