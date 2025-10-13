const { app, BrowserWindow, ipcMain, Menu, dialog, Notification } = require('electron');
const path = require('path');
const adManager = require('./adManager');
const { spawn } = require('child_process');
const fs = require('fs');

// Add fetch polyfill for Node.js
if (!globalThis.fetch) {
  const { default: fetch } = require('node-fetch');
  globalThis.fetch = fetch;
}

const { io } = require('socket.io-client');

class TradingAppManager {
  constructor() {
    this.mainWindow = null;
    this.backendUrl = 'http://74.162.152.95';
    this.socketUrl = 'http://74.162.152.95:5000';
    this.bridgeUrl = 'http://127.0.0.1:8080';
    this.bridgeProcess = null;
    this.bridgeStarting = false;
    this.currentUserId = null;
    this.bridgePort = 8080;
    this.heartbeatInterval = null;
    this.botProcess = null;
    
    // Handle SSL certificate errors and allow external requests
    app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
      event.preventDefault();
      callback(true); // Trust all certificates for external requests
    });
    
    // Allow external requests by disabling web security
    app.commandLine.appendSwitch('--disable-web-security');
    app.commandLine.appendSwitch('--disable-features', 'VizDisplayCompositor');
    app.commandLine.appendSwitch('--allow-running-insecure-content');
    app.commandLine.appendSwitch('--disable-site-isolation-trials');
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
        webSecurity: false, // Disable web security to allow external requests
        allowRunningInsecureContent: true, // Allow HTTP requests
        experimentalFeatures: true,
        enableRemoteModule: false,
        sandbox: false, // Disable sandbox for external requests
        nodeIntegrationInWorker: false,
        nodeIntegrationInSubFrames: false
      },
      titleBarStyle: 'hiddenInset',
      show: true
    });

    // Load the React app
    const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
    
    if (isDev) {
      // Development mode - connect to Vite dev server
      const tryLoadApp = async () => {
        try {
          await this.mainWindow.loadURL('http://127.0.0.1:5173');
          console.log('Connected to React app on port 5173');
          this.mainWindow.webContents.openDevTools();
          return;
        } catch (error) {
          console.log('Port 5173 not available');
          // If no port works, show fallback
          await this.mainWindow.loadURL('data:text/html,<h1>QuantMind Desktop</h1><p>React server not found. Please ensure Vite is running on ports 5173-5180</p>');
        }
      };
      await tryLoadApp();
    } else {
      // Production mode - load built files
      const indexPath = path.join(__dirname, '../../dist/index.html');
      await this.mainWindow.loadFile(indexPath);
      console.log('Loaded built React app from:', indexPath);
    }

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
      this.mainWindow.focus();
    });

    this.mainWindow.on('closed', () => {
      this.cleanup();
    });
    
    // Allow all external requests
    this.mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
      callback(true); // Allow all permissions
    });
    
    // Set CSP to allow external requests
    this.mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': ['default-src * data: blob: filesystem: about: ws: wss: \'unsafe-inline\' \'unsafe-eval\'; script-src * data: blob: \'unsafe-inline\' \'unsafe-eval\'; connect-src * data: blob: \'unsafe-inline\'; img-src * data: blob: \'unsafe-inline\'; frame-src * data: blob:; style-src * data: blob: \'unsafe-inline\';']
        }
      });
    });
  }

  async checkBackendConnection() {
    try {
      console.log(`Attempting to connect to: ${this.backendUrl}`);
      const response = await fetch(`${this.backendUrl}/api/test`, {
        method: 'GET',
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      console.log(`Backend response status: ${response.status}`);
      
      if (!response.ok) {
        console.error(`Backend returned ${response.status}: ${response.statusText}`);
        return false;
      }
      
      const text = await response.text();
      if (!text.trim().startsWith('{')) {
        console.error('Backend returned HTML instead of JSON - Flask server may not be running');
        return false;
      }
      
      const data = JSON.parse(text);
      console.log(`Backend response:`, data);
      return true;
    } catch (error) {
      console.error('Backend connection failed:', error.message);
      return false;
    }
  }

  async startTradingAgent(config) {
    try {
      console.log('\n' + '='.repeat(80));
      console.log('\x1b[32m[TRADING AGENT] Starting bot...\x1b[0m');
      console.log('='.repeat(80));
      console.log('Config:', JSON.stringify(config, null, 2));
      
      // Start bot directly using bot_launcher.py
      console.log('\x1b[36m[DESKTOP] Starting bot directly via bot_launcher.py\x1b[0m');
      
      const path = require('path');
      
      // Check if bot executable exists, otherwise use Python script
      let botExePath, botLauncherPath;
      
      if (app.isPackaged) {
        // In packaged app, look in resources folder
        botExePath = path.join(process.resourcesPath, 'app.asar.unpacked', 'src', 'bot', 'bot_executable', 'Agent.exe');
        botLauncherPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'src', 'bot', 'bot_launcher.py');
      } else {
        // In development
        botExePath = path.join(__dirname, '..', 'bot', 'bot_executable', 'Agent.exe');
        botLauncherPath = path.join(__dirname, '..', 'bot', 'bot_launcher.py');
      }
      
      let botCommand;
      let botArgs;
      let useExecutable = false;
      
      if (fs.existsSync(botExePath)) {
        // Use compiled executable (production)
        botCommand = botExePath; // Don't quote, spawn handles it
        botArgs = ['--user_id', config.user_id.toString(), '--config', config.selected_mt5_config];
        useExecutable = true;
        console.log('\x1b[36m[DESKTOP] Using bot executable (production mode)\x1b[0m');
      } else {
        // Use Python script (development)
        const pythonExe = process.platform === 'win32' ? 'python' : 'python3';
        botCommand = pythonExe;
        botArgs = [botLauncherPath, config.user_id.toString(), config.selected_mt5_config];
        console.log('\x1b[36m[DESKTOP] Using Python script (development mode)\x1b[0m');
      }
      
      console.log('\x1b[36m[DESKTOP] Bot command:\x1b[0m', botCommand);
      console.log('\x1b[36m[DESKTOP] User ID:\x1b[0m', config.user_id);
      console.log('\x1b[36m[DESKTOP] MT5 Config:\x1b[0m', config.selected_mt5_config);
      console.log('='.repeat(80) + '\n');
      
      // Start bot process with proper stdio configuration
      this.botProcess = spawn(botCommand, botArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
        detached: false,
        shell: false, // Don't use shell to avoid path parsing issues
        encoding: 'utf8'
      });
      
      // Set encoding on streams
      if (this.botProcess.stdout) this.botProcess.stdout.setEncoding('utf8');
      if (this.botProcess.stderr) this.botProcess.stderr.setEncoding('utf8');
      
      // Handle bot output - show in console and send to renderer
      this.botProcess.stdout.on('data', (data) => {
        const logMessage = data.toString().trim();
        if (!logMessage) return;
        
        // Split by newlines and send each line separately
        const lines = logMessage.split('\n').filter(line => line.trim());
        lines.forEach(line => {
          const timestamp = new Date().toLocaleTimeString();
          console.log(`\x1b[36m[${timestamp}] [BOT]\x1b[0m`, line);
          
          // Send to renderer with proper type detection
          let logType = 'info';
          if (line.includes('[ERROR]') || line.includes('ERROR')) logType = 'error';
          else if (line.includes('[SUCCESS]') || line.includes('SUCCESS')) logType = 'success';
          else if (line.includes('[WARNING]') || line.includes('WARNING')) logType = 'warning';
          
          this.sendToRenderer('agent-log', line);
        });
      });
      
      this.botProcess.stderr.on('data', (data) => {
        const errorMessage = data.toString().trim();
        if (!errorMessage) return;
        
        const lines = errorMessage.split('\n').filter(line => line.trim());
        lines.forEach(line => {
          const timestamp = new Date().toLocaleTimeString();
          console.error(`\x1b[31m[${timestamp}] [BOT ERROR]\x1b[0m`, line);
          this.sendToRenderer('agent-error', line);
        });
      });
      
      this.botProcess.on('close', (code) => {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`\x1b[33m[${timestamp}] [BOT] Process exited with code ${code}\x1b[0m`);
        this.sendToRenderer('agent-log', `Bot stopped (exit code: ${code})`);
        this.sendToRenderer('bot-stopped', { code });
        this.botProcess = null;
      });
      
      this.botProcess.on('error', (error) => {
        console.error('\x1b[31m[BOT] Process error:\x1b[0m', error);
        this.sendToRenderer('agent-error', `Bot process error: ${error.message}`);
      });
      
      // Wait a moment for initial logs
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const result = { success: true, message: 'Bot started successfully', pid: this.botProcess.pid };
      console.log('\x1b[32m[TRADING AGENT] Bot process started successfully (PID: ' + this.botProcess.pid + ')\x1b[0m');
      
      const logPath = useExecutable 
        ? path.join(__dirname, '..', 'bot', 'bot_executable', 'logs', `bot_user_${config.user_id}.log`)
        : path.join(__dirname, '..', 'bot', 'logs', `bot_user_${config.user_id}.log`);
      console.log('\x1b[36m[TRADING AGENT] Log file: ' + logPath + '\x1b[0m\n');
      
      this.sendToRenderer('agent-log', `Bot started successfully (PID: ${this.botProcess.pid})`);
      this.sendToRenderer('bot-started', result);
      return result;
    } catch (error) {
      console.error('\x1b[31m[TRADING AGENT] Failed to start:\x1b[0m', error);
      this.sendToRenderer('agent-error', error.message);
      throw error;
    }
  }

  async stopTradingAgent() {
    try {
      console.log('\n' + '='.repeat(80));
      console.log('\x1b[33m[TRADING AGENT] Stopping bot...\x1b[0m');
      console.log('='.repeat(80));
      
      if (this.botProcess) {
        console.log('\x1b[36m[DESKTOP] Killing bot process (PID: ' + this.botProcess.pid + ')\x1b[0m');
        
        // Force kill the process
        if (process.platform === 'win32') {
          spawn('taskkill', ['/pid', this.botProcess.pid, '/f', '/t']);
        } else {
          this.botProcess.kill('SIGKILL');
        }
        
        this.botProcess = null;
        const result = { success: true, message: 'Bot stopped successfully' };
        console.log('\x1b[32m[TRADING AGENT] Bot stopped successfully\x1b[0m');
        console.log('='.repeat(80) + '\n');
        this.sendToRenderer('bot-stopped', result);
        return result;
      } else {
        const result = { success: false, error: 'Bot is not running' };
        console.log('\x1b[33m[TRADING AGENT] Bot is not running\x1b[0m');
        console.log('='.repeat(80) + '\n');
        return result;
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
        reconnectionAttempts: 10,
        timeout: 60000
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
        
        // Set current user ID for bridge registration
        this.currentUserId = await this.mainWindow.webContents.executeJavaScript(
          'localStorage.getItem("userId")'
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
        if (!['Starter', 'Pro', 'Elite'].includes(userPlan)) {
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
      const bridgeConnected = await this.checkBridgeConnection();
      
      // Always return bot as stopped on fresh app startup to avoid "already running" issues
      let botStatus = { running: false, pid: null };
      
      return {
        backendConnected,
        bridgeConnected,
        backendUrl: this.backendUrl,
        socketUrl: this.socketUrl,
        bridgeUrl: this.bridgeUrl,
        botStatus
      };
    });

    ipcMain.handle('start-bridge', async () => {
      try {
        const result = await this.startBridge();
        return { success: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('stop-bridge', async () => {
      try {
        await this.stopBridge();
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('check-bridge', async () => {
      const connected = await this.checkBridgeConnection();
      return { success: true, connected };
    });

    ipcMain.handle('bridge-request', async (event, endpoint, options = {}) => {
      try {
        const authToken = await this.mainWindow.webContents.executeJavaScript(
          'localStorage.getItem("authToken")'
        ).catch(() => null);
        
        if (!authToken) {
          return { success: false, error: 'Authentication required' };
        }
        
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          ...options.headers
        };
        
        const response = await fetch(`${this.bridgeUrl}${endpoint}`, {
          method: options.method || 'GET',
          headers,
          body: options.body ? JSON.stringify(options.body) : undefined,
          timeout: 10000
        });
        
        const data = await response.json();
        return { success: response.ok, data, status: response.status };
      } catch (error) {
        return { success: false, error: error.message };
      }
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
        if (!['Starter', 'Pro', 'Elite'].includes(userPlan)) {
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

    // Add IPC handlers for ad-related actions
    // Add HTTP request handler matching website configuration
    ipcMain.handle('http-request', async (event, url, options) => {
      try {
        console.log('Main process making request to:', url);
        console.log('Request data:', options.data || JSON.parse(options.body || '{}'));
        
        // Use exact same configuration as website
        const fetchOptions = {
          method: options.method || 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...options.headers
          },
          body: options.data ? JSON.stringify(options.data) : options.body,
          timeout: 10000
        };
        
        const response = await fetch(url, fetchOptions);
        
        console.log('Main process response status:', response.status);
        const text = await response.text();
        console.log('Main process response text:', text.substring(0, 200));
        
        return {
          success: true,
          status: response.status,
          statusText: response.statusText,
          text: text,
          headers: Object.fromEntries(response.headers.entries())
        };
      } catch (error) {
        console.error('Main process fetch error:', error);
        return {
          success: false,
          error: error.message,
          code: error.code
        };
      }
    });

    ipcMain.handle('set-user-id', async (event, userId) => {
      this.currentUserId = userId;
      console.log(`User ID set: ${userId}`);
      
      // Register bridge if it's running
      if (this.bridgeProcess) {
        console.log('Bridge is running, attempting registration...');
        await this.registerBridge();
      }
      
      return { success: true };
    });

    ipcMain.handle('show-notification', async (event, { type, title, message }) => {
      try {
        if (Notification.isSupported()) {
          const notification = new Notification({
            title: title || 'QuantMind',
            body: message,
            icon: path.join(__dirname, '../../assets/icon.ico'),
            urgency: type === 'error' ? 'critical' : 'normal'
          });
          notification.show();
        }
        return { success: true };
      } catch (error) {
        console.error('Notification error:', error);
        return { success: false, error: error.message };
      }
    });

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
        
        const adWatched = await adManager.checkUserPlanAndShowAd(userPlan, action);
        
        if (!adWatched) {
          return { success: false, error: 'Ad required to save configuration. Please watch the ad or upgrade to Premium.' };
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
              if (['Starter', 'Pro', 'Elite'].includes(userPlan)) {
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



  async startBridge() {
    if (this.bridgeProcess || this.bridgeStarting) {
      console.log('Bridge already running or starting');
      return true;
    }

    this.bridgeStarting = true;
    try {
      const bridgePath = path.join(__dirname, '../bridge');
      const bridgeExe = path.join(bridgePath, 'dist', 'mt5_bridge.exe');
      const bridgeScript = path.join(bridgePath, 'mt5_bridge.py');
      
      let bridgeCommand;
      let bridgeArgs = [];
      
      // Check if executable exists, otherwise use Python script
      if (fs.existsSync(bridgeExe)) {
        bridgeCommand = bridgeExe;
        console.log('Starting MT5 bridge executable');
      } else if (fs.existsSync(bridgeScript)) {
        bridgeCommand = 'python';
        bridgeArgs = [bridgeScript];
        console.log('Starting MT5 bridge Python script');
      } else {
        throw new Error('MT5 bridge not found');
      }
      
      this.bridgeProcess = spawn(bridgeCommand, bridgeArgs, {
        cwd: bridgePath,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      this.bridgeProcess.stdout.on('data', (data) => {
        console.log(`Bridge stdout: ${data}`);
      });
      
      this.bridgeProcess.stderr.on('data', (data) => {
        console.error(`Bridge stderr: ${data}`);
      });
      
      this.bridgeProcess.on('close', (code) => {
        console.log(`Bridge process exited with code ${code}`);
        this.bridgeProcess = null;
        this.sendToRenderer('bridge-disconnected', { code });
      });
      
      // Wait for bridge to start
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Bridge startup timeout'));
        }, 10000);
        
        const checkBridge = async () => {
          try {
            const response = await fetch(`http://127.0.0.1:8080/status`);
            if (response.ok) {
              clearTimeout(timeout);
              resolve();
            } else {
              setTimeout(checkBridge, 500);
            }
          } catch (error) {
            setTimeout(checkBridge, 500);
          }
        };
        
        setTimeout(checkBridge, 2000); // Wait 2s before first check
      });
      
      console.log('MT5 Bridge started successfully');
      
      // Get current user ID and register with production server
      this.currentUserId = await this.mainWindow.webContents.executeJavaScript(
        'localStorage.getItem("userId")'
      ).catch(() => null);
      
      if (this.currentUserId) {
        console.log(`Registering bridge for user: ${this.currentUserId}`);
        await this.registerBridge();
      } else {
        console.log('No user logged in, skipping bridge registration');
        
        // Register bridge if user is already logged in
        const userId = await this.mainWindow.webContents.executeJavaScript(
          'localStorage.getItem("userId")'
        ).catch(() => null);
        
        if (userId) {
          this.currentUserId = userId;
          console.log(`User already logged in (${userId}), registering bridge...`);
          await this.registerBridge();
        }
      }
      
      this.sendToRenderer('bridge-connected', { connected: true });
      return true;
    } catch (error) {
      console.error('Failed to start MT5 bridge:', error);
      this.sendToRenderer('bridge-error', error.message);
      return false;
    } finally {
      this.bridgeStarting = false;
    }
  }

  async stopBridge() {
    if (this.bridgeProcess) {
      console.log('Stopping MT5 bridge');
      await this.unregisterBridge();
      this.bridgeProcess.kill('SIGTERM');
      this.bridgeProcess = null;
      this.sendToRenderer('bridge-disconnected', { manual: true });
    }
  }

  async checkBridgeConnection() {
    try {
      const response = await fetch(`${this.bridgeUrl}/status`, {
        method: 'GET',
        timeout: 3000
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async getPublicIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json', { timeout: 5000 });
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.error('Failed to get public IP:', error);
      return null;
    }
  }

  async registerBridge() {
    try {
      // Get current user ID if not set
      if (!this.currentUserId) {
        this.currentUserId = await this.mainWindow.webContents.executeJavaScript(
          'localStorage.getItem("userId")'
        ).catch(() => null);
      }
      
      if (!this.currentUserId) {
        console.log('No user ID available for bridge registration');
        return false;
      }
      
      // Get auth token for authentication
      const authToken = await this.mainWindow.webContents.executeJavaScript(
        'localStorage.getItem("authToken")'
      ).catch(() => null);
      
      if (!authToken) {
        console.error('No auth token available for bridge registration');
        return false;
      }
      
      // Get public IP address
      const publicIP = await this.getPublicIP();
      if (!publicIP) {
        console.error('Could not determine public IP address');
        return false;
      }
      
      console.log(`Registering bridge for user ${this.currentUserId} with public IP: ${publicIP}:8080`);
      
      const response = await fetch(`${this.backendUrl}/api/mt5/register-bridge`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          user_id: this.currentUserId,
          port: 8080,
          public_ip: publicIP,
          bridge_url: `http://${publicIP}:8080`
        }),
        timeout: 60000
      });
      
      const responseText = await response.text();
      console.log('Bridge registration response:', responseText);
      
      if (response.ok) {
        const data = JSON.parse(responseText);
        if (data.success) {
          console.log(`✅ Bridge registered successfully: ${data.bridge_url}`);
          this.startHeartbeat();
          return true;
        } else {
          console.error('Bridge registration failed:', data.message);
        }
      } else {
        console.error(`Bridge registration failed with status ${response.status}: ${responseText}`);
      }
    } catch (error) {
      console.error('Bridge registration failed:', error);
    }
    return false;
  }
  
  async unregisterBridge() {
    if (!this.currentUserId) return;
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    try {
      const authToken = await this.mainWindow.webContents.executeJavaScript(
        'localStorage.getItem("authToken")'
      ).catch(() => null);
      
      if (authToken) {
        await fetch(`${this.backendUrl}/api/mt5/unregister-bridge`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ user_id: this.currentUserId }),
          timeout: 5000
        });
        console.log('Bridge unregistered');
      }
    } catch (error) {
      console.error('Bridge unregistration failed:', error);
    }
  }
  
  startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.heartbeatInterval = setInterval(async () => {
      await this.registerBridge();
    }, 12 * 60 * 60 * 1000); // 12 hours
  }

  cleanup() {
    if (this.socket) {
      this.socket.disconnect();
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.unregisterBridge();
    if (this.bridgeProcess) {
      this.bridgeProcess.kill('SIGTERM');
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
    
    // Check backend connection on startup
    const connected = await this.checkBackendConnection();
    if (connected) {
      console.log('Successfully connected to remote backend');
      // Clear previous session data
      await this.clearPreviousSession();
    } else {
      console.warn('Failed to connect to remote backend');
    }
    
    // Start MT5 bridge
    console.log('Starting MT5 bridge...');
    const bridgeStarted = await this.startBridge();
    if (bridgeStarted) {
      console.log('MT5 bridge started successfully');
      
      // Register bridge if user is already logged in
      const userId = await this.mainWindow.webContents.executeJavaScript(
        'localStorage.getItem("userId")'
      ).catch(() => null);
      
      if (userId) {
        this.currentUserId = userId;
        console.log(`User already logged in (${userId}), registering bridge...`);
        await this.registerBridge();
      }
    } else {
      console.warn('Failed to start MT5 bridge');
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