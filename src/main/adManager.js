const { BrowserWindow, ipcMain } = require('electron');
const path = require('path');

class AdManager {
  constructor() {
    this.adWindow = null;
    this.setupIPC();
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
          preload: path.join(__dirname, 'preload.js'),
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
    console.log(`AdManager: Checking user plan: ${userPlan}`);
    // Check if user has a paid plan (anything other than Free)
    const isPaidUser = userPlan && userPlan !== 'Free' && userPlan !== 'free' && userPlan.toLowerCase() !== 'free';
    if (isPaidUser) {
      console.log(`AdManager: Paid user (${userPlan}) - skipping ad`);
      return true;
    }
    // Only Free users see ads
    console.log(`AdManager: Free user (${userPlan}) - showing ad`);
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