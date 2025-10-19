const { BrowserWindow, ipcMain } = require('electron');
const path = require('path');

class AdManager {
  constructor() {
    this.adWindow = null;
    this.ipcSetup = false;
  }

  ensureIPC() {
    if (!this.ipcSetup) {
      this.setupIPC();
      this.ipcSetup = true;
    }
  }

  setupIPC() {
    ipcMain.handle('show-rewarded-ad', async (event, action) => {
      return this.showRewardedAd(action);
    });

    ipcMain.handle('check-user-plan-and-show-ad', async (event, userPlan, action) => {
      return this.checkUserPlanAndShowAd(userPlan, action);
    });
  }

  async showRewardedAd(action = 'continue') {
    this.ensureIPC();
    return new Promise((resolve) => {
      if (this.adWindow) {
        this.adWindow.close();
      }

      this.adWindow = new BrowserWindow({
        width: 500,
        height: 650,
        modal: true,
        show: false,
        resizable: false,
        minimizable: false,
        maximizable: false,
        alwaysOnTop: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload: path.join(__dirname, 'preload.cjs'),
          webSecurity: false // Allow AdMob external resources
        }
      });

      this.adWindow.loadFile(path.join(__dirname, '../renderer/reward-ad.html'));
      
      this.adWindow.once('ready-to-show', () => {
        this.adWindow.show();
        // Send action context to the ad window
        this.adWindow.webContents.send('set-ad-context', { action });
      });

      this.adWindow.on('closed', () => {
        this.adWindow = null;
        resolve(false);
      });

      // Listen for ad completion
      const handleAdCompleted = (event, watched) => {
        if (this.adWindow) {
          this.adWindow.close();
        }
        ipcMain.removeListener('ad-completed', handleAdCompleted);
        resolve(watched);
      };

      ipcMain.on('ad-completed', handleAdCompleted);
    });
  }

  async checkUserPlanAndShowAd(userPlan, action = 'continue') {
    this.ensureIPC();
    console.log(`AdManager: Checking user plan: ${userPlan}`);
    // All paid plans skip ads
    if (['Starter', 'Pro', 'Elite'].includes(userPlan)) {
      console.log('AdManager: Paid user - skipping ad');
      return true;
    }
    // Only Free users see ads
    console.log('AdManager: Free user - showing ad');
    return await this.showRewardedAd(action);
  }

  getActionMessage(action) {
    const messages = {
      'start-bot': 'start the trading bot',
      'force-reanalysis': 'force market reanalysis',
      'save-config': 'save configuration',
      'save-trading-params': 'save trading parameters',
      'save-symbols': 'save symbol configuration',
      'continue': 'continue'
    };
    return messages[action] || 'continue';
  }
}

module.exports = new AdManager();