const { app, BrowserWindow, ipcMain, Menu, dialog, net } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const adManager = require('./adManager');
const https = require('https');
const http = require('http');

const { io } = require('socket.io-client');

// Configure auto-updater
autoUpdater.checkForUpdatesAndNotify();
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

// Auto-updater events
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for update...');
});

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info.version);
  if (appManager.mainWindow) {
    appManager.mainWindow.webContents.send('update-available', info);
  }
});

autoUpdater.on('update-not-available', (info) => {
  console.log('Update not available:', info.version);
});

autoUpdater.on('error', (err) => {
  console.log('Error in auto-updater:', err);
});

autoUpdater.on('download-progress', (progressObj) => {
  let log_message = "Download speed: " + progressObj.bytesPerSecond;
  log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
  log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
  console.log(log_message);
  if (appManager.mainWindow) {
    appManager.mainWindow.webContents.send('update-downloading', progressObj);
  }
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded:', info.version);
  if (appManager.mainWindow) {
    appManager.mainWindow.webContents.send('update-ready', info);
  }
});

class TradingAppManager {
  constructor() {
    this.mainWindow = null;
    this.backendUrl = 'http://127.0.0.1:5000';
    this.socketUrl = 'http://127.0.0.1:5000';
    
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
        webSecurity: false, // Allow external resources
        allowRunningInsecureContent: true,
        experimentalFeatures: true
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
    return new Promise((resolve) => {
      try {
        console.log(`Attempting to connect to: ${this.backendUrl}`);
        
        const request = net.request({
          method: 'GET',
          url: `${this.backendUrl}/api/test`
        });
        
        request.on('response', (response) => {
          console.log(`Backend response status: ${response.statusCode}`);
          if (response.statusCode === 200) {
            resolve(true);
          } else {
            resolve(false);
          }
        });
        
        request.on('error', (error) => {
          console.error('Backend connection failed:', error.message);
          resolve(false);
        });
        
        request.setTimeout(5000, () => {
          console.error('Backend connection timeout');
          resolve(false);
        });
        
        request.end();
      } catch (error) {
        console.error('Backend connection error:', error);
        resolve(false);
      }
    });
  }

  async startTradingAgent(config) {
    return new Promise((resolve, reject) => {
      try {
        console.log('Bot start requested with config:', config);
        
        const request = net.request({
          method: 'POST',
          url: `${this.backendUrl}/api/bot/start`
        });
        
        request.setHeader('Content-Type', 'application/json');
        
        // Add auth token if available
        if (config.AUTH_TOKEN) {
          request.setHeader('Authorization', `Bearer ${config.AUTH_TOKEN}`);
        }
        
        let responseData = '';
        
        request.on('response', (response) => {
          response.on('data', (chunk) => {
            responseData += chunk;
          });
          
          response.on('end', () => {
            try {
              const result = JSON.parse(responseData);
              if (result.success) {
                this.sendToRenderer('bot-started', result);
                resolve(result);
              } else {
                reject(new Error(result.error || 'Failed to start bot'));
              }
            } catch (parseError) {
              reject(new Error('Invalid response from server'));
            }
          });
        });
        
        request.on('error', (error) => {
          console.error('Failed to start trading agent:', error);
          this.sendToRenderer('agent-error', error.message);
          reject(error);
        });
        
        request.write(JSON.stringify(config));
        request.end();
      } catch (error) {
        console.error('Failed to start trading agent:', error);
        this.sendToRenderer('agent-error', error.message);
        reject(error);
      }
    });
  }

  async stopTradingAgent() {
    return new Promise((resolve, reject) => {
      try {
        console.log('Bot stop requested');
        
        const request = net.request({
          method: 'POST',
          url: `${this.backendUrl}/api/bot/stop`
        });
        
        request.setHeader('Content-Type', 'application/json');
        
        let responseData = '';
        
        request.on('response', (response) => {
          response.on('data', (chunk) => {
            responseData += chunk;
          });
          
          response.on('end', () => {
            try {
              const result = JSON.parse(responseData);
              if (result.success) {
                this.sendToRenderer('bot-stopped', result);
                resolve(result);
              } else {
                reject(new Error(result.error || 'Failed to stop bot'));
              }
            } catch (parseError) {
              reject(new Error('Invalid response from server'));
            }
          });
        });
        
        request.on('error', (error) => {
          console.error('Failed to stop trading agent:', error);
          reject(error);
        });
        
        request.end();
      } catch (error) {
        console.error('Failed to stop trading agent:', error);
        reject(error);
      }
    });
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
            const planResponse = await this.mainWindow.webContents.executeJavaScript(`
              fetch('${this.backendUrl}/api/user/plan', {
                headers: { 'Authorization': 'Bearer ${authToken}' }
              }).then(r => r.json()).catch(e => ({ error: e.message }))
            `);
            
            if (planResponse && !planResponse.error) {
              userPlan = planResponse.plan_type || 'Free';
            }
          } catch (error) {
            console.log('Failed to get user plan from database:', error);
          }
        }
        
        // ADS TEMPORARILY DISABLED - Skip all ad checks
        console.log('Ad check bypassed for bot start');
        
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
            const planResponse = await this.mainWindow.webContents.executeJavaScript(`
              fetch('${this.backendUrl}/api/user/plan', {
                headers: { 'Authorization': 'Bearer ${authToken}' }
              }).then(r => r.json()).catch(e => ({ error: e.message }))
            `);
            
            if (planResponse && !planResponse.error) {
              userPlan = planResponse.plan_type || 'Free';
            }
          } catch (error) {
            console.log('Failed to get user plan from database:', error);
          }
        }
        
        // ADS TEMPORARILY DISABLED - Skip all ad checks
        console.log('Ad check bypassed for force reanalysis');
        
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
            const planResponse = await this.mainWindow.webContents.executeJavaScript(`
              fetch('${this.backendUrl}/api/user/plan', {
                headers: { 'Authorization': 'Bearer ${authToken}' }
              }).then(r => r.json()).catch(e => ({ error: e.message }))
            `);
            
            console.log('DEBUG: API response data:', planResponse);
            if (planResponse && !planResponse.error) {
              userPlan = planResponse.plan_type || 'Free';
              console.log('DEBUG: Final user plan:', userPlan);
            } else {
              console.log('DEBUG: API response error:', planResponse?.error);
            }
          } catch (error) {
            console.log('Failed to get user plan from database:', error);
          }
        } else {
          console.log('DEBUG: No auth token found');
        }
        
        // ADS TEMPORARILY DISABLED - Skip all ad checks
        console.log('Ad check bypassed for save config');
        
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
                  const planResponse = await this.mainWindow.webContents.executeJavaScript(`
                    fetch('${this.backendUrl}/api/user/plan', {
                      headers: { 'Authorization': 'Bearer ${authToken}' }
                    }).then(r => r.json()).catch(e => ({ error: e.message }))
                  `);
                  
                  if (planResponse && !planResponse.error) {
                    userPlan = planResponse.plan_type || 'Free';
                  }
                } catch (error) {
                  console.log('Failed to get user plan from database:', error);
                }
              }
              
              // ADS TEMPORARILY DISABLED - Skip all ad checks
              console.log('Ad check bypassed for menu force reanalysis');
              this.sendToRenderer('menu-action', 'force-reanalysis');
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
                await autoUpdater.checkForUpdatesAndNotify();
              } catch (error) {
                console.error('Update check failed:', error);
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

  async initialize() {
    await this.createWindow();
    this.setupIPC();
    this.setupSocketConnection();
    this.createMenu();
    
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