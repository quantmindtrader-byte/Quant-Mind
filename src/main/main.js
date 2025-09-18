const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const adManager = require('./adManager');

const { io } = require('socket.io-client');

// Load environment variables
require('dotenv').config();

// Configure auto-updater
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.checkForUpdatesAndNotify();

class TradingAppManager {
  constructor() {
    this.mainWindow = null;
    this.backendUrl = 'http://localhost:5000';
    this.socketUrl = 'http://localhost:5000';
    
    // Handle SSL certificate errors for AdMob
    app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
      if (url.includes('googlesyndication.com') || url.includes('doubleclick.net')) {
        event.preventDefault();
        callback(true); // Trust the certificate
      } else {
        callback(false);
      }
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
      show: true
    });

    // Load the React app
    const tryLoadApp = async () => {
      try {
        await this.mainWindow.loadURL('http://localhost:5173');
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
        
        // Skip ads for paid users
        console.log(`DEBUG: User plan: '${userPlan}' (type: ${typeof userPlan})`);
        console.log(`DEBUG: Plan comparison - Free: ${userPlan === 'Free'}, free: ${userPlan === 'free'}, toLowerCase: ${userPlan.toLowerCase() === 'free'}`);
        const isPaidUser = userPlan && userPlan !== 'Free' && userPlan !== 'free' && userPlan.toLowerCase() !== 'free';
        console.log(`DEBUG: isPaidUser: ${isPaidUser}`);
        
        if (isPaidUser) {
          console.log(`DEBUG: Paid user (${userPlan}) - skipping ads completely`);
        } else {
          console.log(`DEBUG: Free user (${userPlan}) - showing ad`);
          const adWatched = await adManager.checkUserPlanAndShowAd(userPlan, 'start-bot');
          if (!adWatched) {
            return { success: false, error: 'Ad required to start bot. Please watch the ad or upgrade to Premium.' };
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
      
      // Check bot status
      let botStatus = { running: false, pid: null };
      try {
        const response = await fetch(`${this.backendUrl}/api/bot/status`);
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            botStatus = { running: result.running, pid: result.pid };
          }
        }
      } catch (error) {
        console.error('Failed to get bot status:', error);
      }
      
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
        
        // Skip ads for paid users
        const isPaidUser = userPlan && userPlan !== 'Free' && userPlan !== 'free' && userPlan.toLowerCase() !== 'free';
        
        if (isPaidUser) {
          console.log(`DEBUG: Paid user (${userPlan}) - skipping force-reanalysis ads`);
        } else {
          const adWatched = await adManager.checkUserPlanAndShowAd(userPlan, 'force-reanalysis');
          if (!adWatched) {
            return { success: false, error: 'Ad required for force reanalysis. Please watch the ad or upgrade to Premium.' };
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
    ipcMain.handle('check-for-updates', async () => {
      try {
        const result = await autoUpdater.checkForUpdates();
        return { success: true, updateInfo: result.updateInfo };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('quit-and-install', () => {
      autoUpdater.quitAndInstall();
    });

    // Add IPC handlers for ad-related actions
    ipcMain.handle('save-config-with-ad-check', async (event, configData, action) => {
      try {
        // Get user plan from database
        const authToken = await this.mainWindow.webContents.executeJavaScript(
          'localStorage.getItem("authToken")'
        ).catch(() => null);
        
        const userId = await this.mainWindow.webContents.executeJavaScript(
          'localStorage.getItem("userId")'
        ).catch(() => null);
        
        console.log('DEBUG: Auth token available:', !!authToken);
        console.log('DEBUG: User ID from localStorage:', userId);
        
        let userPlan = 'Free';
        if (authToken) {
          try {
            const response = await fetch(`${this.backendUrl}/api/user/plan`, {
              headers: { 'Authorization': `Bearer ${authToken}` }
            });
            console.log('DEBUG: API response status:', response.status);
            if (response.ok) {
              const plan = await response.json();
              console.log('DEBUG: API response data:', plan);
              userPlan = plan.plan_type || 'Free';
              console.log('DEBUG: Final user plan:', userPlan);
            } else {
              console.log('DEBUG: API response not OK:', await response.text());
            }
          } catch (error) {
            console.log('Failed to get user plan from database:', error);
          }
        } else {
          console.log('DEBUG: No auth token found');
        }
        
        // Skip ads for paid users
        const isPaidUser = userPlan && userPlan !== 'Free' && userPlan !== 'free' && userPlan.toLowerCase() !== 'free';
        
        if (isPaidUser) {
          console.log(`DEBUG: Paid user (${userPlan}) - skipping save-config ads`);
        } else {
          const adWatched = await adManager.checkUserPlanAndShowAd(userPlan, action);
          if (!adWatched) {
            return { success: false, error: 'Ad required to save configuration. Please watch the ad or upgrade to Premium.' };
          }
        }
        
        return { success: true, canProceed: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
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
              
              // Skip ads for paid users
              const isPaidUser = userPlan && userPlan !== 'Free' && userPlan !== 'free' && userPlan.toLowerCase() !== 'free';
              
              if (isPaidUser) {
                console.log(`DEBUG: Paid user (${userPlan}) - skipping menu force-reanalysis ads`);
                this.sendToRenderer('menu-action', 'force-reanalysis');
              } else {
                const adWatched = await adManager.checkUserPlanAndShowAd(userPlan, 'force-reanalysis');
                if (adWatched) {
                  this.sendToRenderer('menu-action', 'force-reanalysis');
                }
              }
            }
          }
        ]
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'Check for Updates',
            click: async () => {
              try {
                console.log('MANUAL UPDATE CHECK: Starting...');
                const result = await autoUpdater.checkForUpdatesAndNotify();
                console.log('MANUAL UPDATE CHECK: Result:', result);
                
                // Show immediate feedback to user
                if (this.mainWindow) {
                  this.mainWindow.webContents.executeJavaScript(`
                    console.log('Manual update check initiated...');
                  `);
                }
              } catch (error) {
                console.error('MANUAL UPDATE CHECK FAILED:', error.message);
                console.error('MANUAL UPDATE CHECK ERROR STACK:', error.stack);
                
                // Show error to user
                dialog.showErrorBox('Update Check Failed', 
                  `Failed to check for updates: ${error.message}`);
              }
            }
          },
          { type: 'separator' },
          {
            label: 'About',
            click: () => {
              dialog.showMessageBox(this.mainWindow, {
                type: 'info',
                title: 'About QuantMind Desktop',
                message: 'QuantMind Desktop',
                detail: `Version: ${app.getVersion()}\nElectron: ${process.versions.electron}\nNode: ${process.versions.node}`
              });
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

  setupAutoUpdater() {
    // Configure auto-updater for private GitHub repo
    autoUpdater.autoDownload = false; // Don't auto-download, ask user first
    autoUpdater.allowPrerelease = false;
    
    // Set GitHub token for private repository access
    const githubToken = process.env.GH_TOKEN || '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';
    if (githubToken) {
      autoUpdater.requestHeaders = {
        'Authorization': `token ${githubToken}`,
        'User-Agent': 'QuantMind-Desktop'
      };
      console.log('AUTO-UPDATER: GitHub token configured for private repo access');
    } else {
      console.warn('AUTO-UPDATER: No GitHub token found - private repo access may fail');
    }
    
    // Force update server URL
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'quantmindtrader-byte',
      repo: 'Quant-Mind',
      token: githubToken
    });
    console.log('AUTO-UPDATER: Feed URL configured for GitHub repo');
    
    // Auto-updater events
    autoUpdater.on('checking-for-update', () => {
      console.log('AUTO-UPDATER: Checking for update...');
    });

    autoUpdater.on('update-available', (info) => {
      console.log('AUTO-UPDATER: Update available:', info.version);
      console.log('AUTO-UPDATER: Release info:', JSON.stringify(info, null, 2));
      if (this.mainWindow) {
        this.mainWindow.webContents.send('update-available', info);
      }
    });

    autoUpdater.on('update-not-available', (info) => {
      console.log('AUTO-UPDATER: Update not available. Current version:', info.version);
    });

    autoUpdater.on('error', (err) => {
      console.error('AUTO-UPDATER ERROR:', err.message);
      console.error('AUTO-UPDATER ERROR STACK:', err.stack);
    });

    autoUpdater.on('download-progress', (progressObj) => {
      let log_message = "Download speed: " + progressObj.bytesPerSecond;
      log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
      log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
      console.log('AUTO-UPDATER:', log_message);
      if (this.mainWindow) {
        this.mainWindow.webContents.send('update-downloading', progressObj);
      }
    });

    autoUpdater.on('update-downloaded', (info) => {
      console.log('AUTO-UPDATER: Update downloaded:', info.version);
      if (this.mainWindow) {
        this.mainWindow.webContents.send('update-ready', info);
      }
    });

    // Check for updates on startup and every 30 minutes
    setTimeout(() => {
      console.log('AUTO-UPDATER: Initial update check...');
      autoUpdater.checkForUpdatesAndNotify().catch(err => {
        console.error('AUTO-UPDATER: Initial check failed:', err.message);
      });
    }, 5000); // Wait 5 seconds after startup
    
    setInterval(() => {
      console.log('AUTO-UPDATER: Periodic update check...');
      autoUpdater.checkForUpdatesAndNotify().catch(err => {
        console.error('AUTO-UPDATER: Periodic check failed:', err.message);
      });
    }, 30 * 60 * 1000); // 30 minutes
  }

  async initialize() {
    await this.createWindow();
    this.setupIPC();
    this.createMenu();
    this.setupAutoUpdater();
    
    // Check backend connection on startup
    const connected = await this.checkBackendConnection();
    if (connected) {
      console.log('Successfully connected to remote backend');
    } else {
      console.warn('Failed to connect to remote backend');
    }
    
    // Force window to front
    setTimeout(() => {
      if (this.mainWindow) {
        this.mainWindow.show();
        this.mainWindow.focus();
        this.mainWindow.setAlwaysOnTop(true);
        this.mainWindow.setAlwaysOnTop(false);
      }
    }, 2000);
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