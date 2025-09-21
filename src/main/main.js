const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

const { io } = require('socket.io-client');

class TradingAppManager {
  constructor() {
    this.mainWindow = null;
    this.backendUrl = 'http://127.0.0.1:5000';
    this.socketUrl = 'http://127.0.0.1:5000';
    this.updateRequired = false;
    this.setupAutoUpdater();
  }

  setupAutoUpdater() {
    autoUpdater.on('checking-for-update', () => {
      console.log('Checking for update...');
      this.sendToRenderer('update-checking');
    });
    
    autoUpdater.on('update-available', (info) => {
      console.log('Update available:', info);
      this.updateRequired = true;
      this.sendToRenderer('update-available', info);
    });
    
    autoUpdater.on('update-not-available', (info) => {
      console.log('Update not available:', info);
      this.sendToRenderer('update-not-available', info);
    });
    
    autoUpdater.on('error', (err) => {
      console.error('Update error:', err);
      this.sendToRenderer('update-error', { message: err.message });
    });
    
    autoUpdater.on('download-progress', (progressObj) => {
      console.log('Download progress:', progressObj);
      this.sendToRenderer('update-download-progress', progressObj);
    });
    
    autoUpdater.on('update-downloaded', (info) => {
      console.log('Update downloaded:', info);
      this.sendToRenderer('update-downloaded', info);
    });
  }

  async createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1200,
      minHeight: 700,
      icon: path.join(__dirname, '../../assets/icon.ico'),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
        webSecurity: false // Allow external resources
      },
      titleBarStyle: 'hiddenInset',
      show: false
    });

    // Load the React app
    const tryLoadApp = async () => {
      try {
        await this.mainWindow.loadURL('http://127.0.0.1:5173');
        console.log('Connected to React app on port 5173');
        this.mainWindow.webContents.openDevTools();
        return;
      } catch (error) {
        console.log('Port 5173 not available');
      }
      // If no port works, show fallback
      await this.mainWindow.loadURL('data:text/html,<h1>QuantMind Desktop</h1><p>React server not found. Please ensure Vite is running on ports 5173-5180</p>');
    };
    
    await tryLoadApp();

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
      this.mainWindow.focus();
    });

    this.mainWindow.on('closed', () => {
      this.cleanup();
    });
  }

  async checkBackendConnection() {
    try {
      console.log(`Attempting to connect to: ${this.backendUrl}`);
      const response = await fetch(`${this.backendUrl}/`, {
        method: 'GET',
        timeout: 5000
      });
      console.log(`Backend response status: ${response.status}`);
      const text = await response.text();
      console.log(`Backend response: ${text}`);
      return response.ok;
    } catch (error) {
      console.error('Backend connection failed:', error.message);
      console.error('Error details:', error);
      return false;
    }
  }

  async startTradingAgent(config) {
    try {
      console.log('Bot start requested with config:', config);
      
      const headers = {
        'Content-Type': 'application/json'
      };
      
      // Add auth token if available
      if (config.AUTH_TOKEN) {
        headers['Authorization'] = `Bearer ${config.AUTH_TOKEN}`;
      }
      
      const response = await fetch(`${this.backendUrl}/api/bot/start`, {
        method: 'POST',
        headers,
        body: JSON.stringify(config)
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.sendToRenderer('bot-started', result);
        return result;
      } else {
        throw new Error(result.error || 'Failed to start bot');
      }
    } catch (error) {
      console.error('Failed to start trading agent:', error);
      this.sendToRenderer('agent-error', error.message);
      throw error;
    }
  }

  async stopTradingAgent() {
    try {
      console.log('Bot stop requested');
      
      const response = await fetch(`${this.backendUrl}/api/bot/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.sendToRenderer('bot-stopped', result);
        return result;
      } else {
        throw new Error(result.error || 'Failed to stop bot');
      }
    } catch (error) {
      console.error('Failed to stop trading agent:', error);
      throw error;
    }
  }

  setupSocketConnection() {
    try {
      this.socket = io(this.socketUrl, {
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        timeout: 20000
      });
      
      this.socket.on('connect', () => {
        console.log('Connected to backend SocketIO');
        this.sendToRenderer('backend-connected', { connected: true });
      });
      
      this.socket.on('disconnect', (reason) => {
        console.log('Disconnected from backend SocketIO:', reason);
        this.sendToRenderer('backend-disconnected', { connected: false, reason });
      });
      
      this.socket.on('analytics_update', (data) => {
        this.sendToRenderer('analytics-update', data);
      });
      
      this.socket.on('connect_error', (error) => {
        console.error('SocketIO connection error:', error.message);
        this.sendToRenderer('backend-error', `Connection failed: ${error.message}`);
      });
      
      this.socket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`Reconnection attempt ${attemptNumber}`);
      });
      
      this.socket.on('reconnect_failed', () => {
        console.error('Failed to reconnect to backend');
        this.sendToRenderer('backend-error', 'Failed to reconnect to backend');
      });
    } catch (error) {
      console.error('Failed to setup SocketIO connection:', error);
    }
  }

  sendToRenderer(channel, data) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }

  setupIPC() {
    ipcMain.handle('check-backend', async () => {
      const connected = await this.checkBackendConnection();
      return { success: true, connected };
    });

    ipcMain.handle('start-agent', async (event, config) => {
      try {
        // Get user plan from database
        const authToken = await this.mainWindow.webContents.executeJavaScript(
          'localStorage.getItem("authToken")'
        ).catch(() => null);
        
        let userPlan = 'Free';
        if (authToken) {
          try {
            const response = await fetch(`${this.backendUrl}/api/user/plan`, {
              headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (response.ok) {
              const plan = await response.json();
              userPlan = plan.plan_type || 'Free';
            }
          } catch (error) {
            console.log('Failed to get user plan from database:', error);
          }
        }
        

        
        // Get auth token from localStorage if available
        const botAuthToken = await this.mainWindow.webContents.executeJavaScript(
          'localStorage.getItem("authToken")'
        ).catch(() => null);
        
        if (botAuthToken) {
          config.AUTH_TOKEN = botAuthToken;
          console.log('Added auth token to bot config');
        } else {
          console.log('No auth token available');
        }
        
        const result = await this.startTradingAgent(config);
        return { success: true, result };
      } catch (error) {
        console.error('Start agent error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('stop-agent', async () => {
      try {
        const result = await this.stopTradingAgent();
        return { success: true, result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('get-app-status', async () => {
      const backendConnected = await this.checkBackendConnection();
      
      // Always return bot as stopped on fresh app startup to avoid "already running" issues
      let botStatus = { running: false, pid: null };
      
      return {
        backendConnected,
        backendUrl: this.backendUrl,
        socketUrl: this.socketUrl,
        botStatus
      };
    });

    ipcMain.handle('force-reanalysis-with-ad', async () => {
      try {
        // Get user plan from database
        const authToken = await this.mainWindow.webContents.executeJavaScript(
          'localStorage.getItem("authToken")'
        ).catch(() => null);
        
        let userPlan = 'Free';
        if (authToken) {
          try {
            const response = await fetch(`${this.backendUrl}/api/user/plan`, {
              headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (response.ok) {
              const plan = await response.json();
              userPlan = plan.plan_type || 'Free';
            }
          } catch (error) {
            console.log('Failed to get user plan from database:', error);
          }
        }
        

        
        return { success: true, canProceed: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('open-file-dialog', async () => {
      const result = await dialog.showOpenDialog(this.mainWindow, {
        title: 'Select MT5 Terminal Executable',
        defaultPath: 'C:\\Program Files\\MetaTrader 5',
        properties: ['openFile'],
        filters: [
          { name: 'MT5 Terminal', extensions: ['exe'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        message: 'Please select terminal64.exe from your MetaTrader 5 installation folder'
      });
      return result.filePaths[0] || null;
    });

    // Auto-updater IPC handlers
    ipcMain.handle('check-for-updates', () => {
      autoUpdater.checkForUpdatesAndNotify();
    });

    ipcMain.handle('download-update', () => {
      autoUpdater.downloadUpdate();
    });

    ipcMain.handle('restart-and-update', () => {
      autoUpdater.quitAndInstall();
    });

    ipcMain.handle('get-app-version', () => {
      return app.getVersion();
    });


  }

  createMenu() {
    const template = [
      {
        label: 'File',
        submenu: [
          {
            label: 'New Configuration',
            accelerator: 'CmdOrCtrl+N',
            click: () => this.sendToRenderer('menu-action', 'new-config')
          },
          {
            label: 'Open Configuration',
            accelerator: 'CmdOrCtrl+O',
            click: () => this.sendToRenderer('menu-action', 'open-config')
          },
          { type: 'separator' },
          {
            label: 'Exit',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => app.quit()
          }
        ]
      },
      {
        label: 'Trading',
        submenu: [
          {
            label: 'Start Bot',
            accelerator: 'CmdOrCtrl+R',
            click: () => this.sendToRenderer('menu-action', 'start-bot')
          },
          {
            label: 'Stop Bot',
            accelerator: 'CmdOrCtrl+S',
            click: () => this.sendToRenderer('menu-action', 'stop-bot')
          },
          {
            label: 'Force Reanalysis',
            accelerator: 'CmdOrCtrl+F',
            click: async () => {
              // Get user plan from database
              const authToken = await this.mainWindow.webContents.executeJavaScript(
                'localStorage.getItem("authToken")'
              ).catch(() => null);
              
              let userPlan = 'Free';
              if (authToken) {
                try {
                  const response = await fetch(`${this.backendUrl}/api/user/plan`, {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                  });
                  if (response.ok) {
                    const plan = await response.json();
                    userPlan = plan.plan_type || 'Free';
                  }
                } catch (error) {
                  console.log('Failed to get user plan from database:', error);
                }
              }
              
              this.sendToRenderer('menu-action', 'force-reanalysis');
            }
          }
        ]
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  cleanup() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  async clearPreviousSession() {
    try {
      // Clear backend logs
      await fetch(`${this.backendUrl}/api/logs/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      // Stop any running bot processes
      await fetch(`${this.backendUrl}/api/bot/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log('Previous session data cleared');
    } catch (error) {
      console.log('Failed to clear previous session data:', error.message);
    }
  }

  async initialize() {
    await this.createWindow();
    this.setupIPC();
    this.setupSocketConnection();
    this.createMenu();
    
    // Start with update check - force update if available
    this.checkForUpdatesOnStartup();
  }

  async checkForUpdatesOnStartup() {
    try {
      // Check version compatibility with backend first
      const currentVersion = app.getVersion();
      const versionCheck = await fetch(`${this.backendUrl}/api/app/version-check?version=${currentVersion}`);
      
      if (versionCheck.ok) {
        const versionData = await versionCheck.json();
        if (!versionData.is_supported) {
          console.log('Version not supported, forcing update');
          this.updateRequired = true;
          this.sendToRenderer('update-required', versionData);
        }
      }
      
      // Check for updates
      await autoUpdater.checkForUpdatesAndNotify();
      
      // Wait for update check to complete
      setTimeout(async () => {
        if (!this.updateRequired) {
          // No update required, proceed normally
          await this.startNormalApp();
        }
        // If update is required, the update screen will handle it
      }, 3000);
    } catch (error) {
      console.error('Update check failed:', error);
      // If update check fails, force update anyway for safety
      this.updateRequired = true;
      this.sendToRenderer('update-error', { message: 'Failed to verify app version. Update required.' });
    }
  }

  async startNormalApp() {
    // Check backend connection
    const connected = await this.checkBackendConnection();
    if (connected) {
      console.log('Successfully connected to remote backend');
      await this.clearPreviousSession();
    } else {
      console.warn('Failed to connect to remote backend');
    }
    
    // Show main window
    if (this.mainWindow) {
      this.mainWindow.show();
      this.mainWindow.focus();
    }
  }
}

const appManager = new TradingAppManager();

app.whenReady().then(() => {
  appManager.initialize();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    appManager.createWindow();
  }
});

app.on('before-quit', () => {
  appManager.cleanup();
});