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
    // ADS COMPLETELY DISABLED - Always return true
    console.log('AdManager: Ads disabled - returning true immediately');
    return true;
  }

  async checkUserPlanAndShowAd(userPlan, action = 'continue') {
    // ADS COMPLETELY DISABLED - Always return true for all users
    console.log(`AdManager: Ads disabled for all users (plan: ${userPlan}) - returning true`);
    return true;
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