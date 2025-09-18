import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

// Component to handle individual symbol input with proper state management
const SymbolInput = React.memo(({ value, index, onUpdate, onRemove }) => {
  const [localValue, setLocalValue] = useState(value);

  const handleChange = (e) => {
    const newValue = e.target.value.toUpperCase();
    setLocalValue(newValue);
    onUpdate(index, newValue);
  };

  return (
    <div className="flex items-center space-x-2">
      <input
        type="text"
        value={localValue}
        onChange={handleChange}
        className="input-field flex-1"
        placeholder="Symbol (e.g., EURUSD)"
      />
      <button
        onClick={(e) => {
          e.preventDefault();
          onRemove(index);
        }}
        className="btn-danger px-2 py-1 text-sm"
      >
        Remove
      </button>
    </div>
  );
});

// Separate component for trading parameters to prevent re-renders
const TradingParametersTab = React.memo(({ config, onConfigChange }) => {
  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-white mb-4">Trading Parameters</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Max Open Risk (%)</label>
          <input
            type="number"
            step="0.1"
            value={config.max_open_risk || 10.0}
            onChange={(e) => onConfigChange('max_open_risk', parseFloat(e.target.value))}
            className="input-field w-full"
          />
          <p className="text-xs text-gray-500 mt-1">Maximum total risk from all open positions</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Minimum Trade Score</label>
          <input
            type="number"
            step="0.1"
            value={config.min_trade_score || 6.0}
            onChange={(e) => onConfigChange('min_trade_score', parseFloat(e.target.value))}
            className="input-field w-full"
          />
          <p className="text-xs text-gray-500 mt-1">Minimum AI confidence score to execute trades</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Max Trades Per Symbol</label>
          <input
            type="number"
            value={config.max_trades_per_symbol || 1}
            onChange={(e) => onConfigChange('max_trades_per_symbol', parseInt(e.target.value))}
            className="input-field w-full"
          />
          <p className="text-xs text-gray-500 mt-1">Maximum concurrent trades per symbol</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Slippage (Points)</label>
          <input
            type="number"
            value={config.slippage_points || 3}
            onChange={(e) => onConfigChange('slippage_points', parseInt(e.target.value))}
            className="input-field w-full"
          />
          <p className="text-xs text-gray-500 mt-1">Maximum allowed slippage in points</p>
        </div>
      </div>
    </div>
  );
});

// Separate component for symbol management to prevent re-renders
const SymbolManagementTab = React.memo(({ config, onConfigChange, actions }) => {
  const [dailyLimits, setDailyLimits] = React.useState(null);
  
  React.useEffect(() => {
    const fetchLimits = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('http://localhost:5000/api/user/trading-limits', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const limits = await response.json();
          setDailyLimits(limits);
        }
      } catch (error) {
        console.error('Failed to load limits:', error);
      }
    };
    fetchLimits();
  }, []);
  
  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-white mb-4">Symbol Management</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Trading Symbols</label>
          <div className="space-y-2">
            {(config.symbols || []).map((symbol, index) => (
              <SymbolInput
                key={`symbol-${index}`}
                value={symbol}
                index={index}
                onUpdate={(idx, newValue) => {
                  const newSymbols = [...(config.symbols || [])];
                  newSymbols[idx] = newValue;
                  onConfigChange('symbols', newSymbols);
                }}
                onRemove={(idx) => {
                  const newSymbols = (config.symbols || []).filter((_, i) => i !== idx);
                  onConfigChange('symbols', newSymbols);
                }}
              />
            ))}
            <button
              onClick={(e) => {
                e.preventDefault();
                const currentSymbols = (config.symbols || []).length;
                const maxSymbols = dailyLimits?.max_symbols || 2;
                
                if (maxSymbols !== -1 && currentSymbols >= maxSymbols) {
                  actions.addNotification({
                    type: 'error',
                    title: 'Symbol Limit Reached',
                    message: `Your ${dailyLimits?.plan_type || 'Free'} plan allows maximum ${maxSymbols} symbols. Upgrade to add more.`
                  });
                  return;
                }
                
                const newSymbols = [...(config.symbols || []), ''];
                onConfigChange('symbols', newSymbols);
              }}
              className={`btn-secondary text-sm ${
                dailyLimits && dailyLimits.max_symbols !== -1 && 
                (config.symbols || []).length >= dailyLimits.max_symbols
                  ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={dailyLimits && dailyLimits.max_symbols !== -1 && 
                       (config.symbols || []).length >= dailyLimits.max_symbols}
            >
  + Add Symbol {dailyLimits?.plan_type === 'Free' ? '(Ad Required)' : ''}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Current symbols: {(config.symbols || []).length} configured
            {dailyLimits && dailyLimits.max_symbols !== -1 && 
             ` (${Math.max(0, dailyLimits.max_symbols - (config.symbols || []).length)} remaining)`}
          </p>
        </div>
        
        {(config.symbols || []).length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-300 mb-2">Active Symbols:</p>
            <div className="flex flex-wrap gap-2">
              {(config.symbols || []).map(symbol => (
                <span
                  key={symbol}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded-full"
                >
                  {symbol}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

const Configuration = () => {
  const { state, actions } = useApp();
  const [activeTab, setActiveTab] = useState('mt5');
  const [config, setConfig] = useState({
    mt5_configs: {},
    symbols: [],
    risk_per_trade: 2.0,
    max_open_risk: 10.0,
    min_trade_score: 6.0,
    max_trades_per_symbol: 1,
    slippage_points: 3,
    daily_profit_target: 5.0,
    daily_loss_limit: 3.0,
    daily_trade_limit: 10,
    daily_trade_loss_limit: 5,
    max_risk_per_trade: 2.0,
    weekly_profit_target: 15.0,
    weekly_loss_limit: 10.0
  });
  const [originalConfig, setOriginalConfig] = useState(null);
  const [newMT5Config, setNewMT5Config] = useState({
    name: '',
    path: '',
    login: '',
    password: '',
    server: ''
  });

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('http://localhost:5000/api/settings', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const backendConfig = await response.json();
          setConfig(prev => ({ ...prev, ...backendConfig }));
          setOriginalConfig(backendConfig);
        }
      } catch (error) {
        const savedConfig = JSON.parse(localStorage.getItem('tradingConfig') || '{}');
        setConfig(prev => ({ ...prev, ...savedConfig }));
        setOriginalConfig(savedConfig);
      }
    };
    loadConfig();
  }, []);

  const saveConfigToBackend = async (newConfig, showAd = true) => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userPlan = user.subscription?.plan_type || 'Free';
      
      if (showAd && !['Starter', 'Pro', 'Elite'].includes(userPlan)) {
        setOriginalConfig(JSON.parse(JSON.stringify(config)));
        const adResult = await window.electronAPI.saveConfigWithAdCheck(newConfig, 'save-config');
        if (!adResult.success) {
          if (originalConfig) {
            setConfig(originalConfig);
            actions.setConfig(originalConfig);
            localStorage.setItem('tradingConfig', JSON.stringify(originalConfig));
          }
          actions.addNotification({
            type: 'error',
            title: 'Save Cancelled',
            message: 'Configuration reset - ad required to save changes'
          });
          return;
        }
      }
      
      const token = localStorage.getItem('authToken');
      console.log('Saving config to backend:', newConfig);
      
      const response = await fetch('http://localhost:5000/api/settings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newConfig)
      });
      
      const result = await response.json();
      console.log('Save response:', result);
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to save settings');
      }
      
      if (!showAd) {
        // Silent save for auto-save, only show notification on manual save
        console.log('Settings auto-saved successfully');
      } else {
        actions.addNotification({
          type: 'success',
          title: 'Configuration Saved',
          message: showAd && !['Starter', 'Pro', 'Elite'].includes(userPlan) ? 'Thank you for watching the ad! Configuration saved successfully.' : 'Configuration saved successfully.'
        });
      }
    } catch (error) {
      console.error('Save error:', error);
      actions.addNotification({
        type: 'error',
        title: 'Save Error',
        message: `Failed to save configuration: ${error.message}`
      });
    }
  };

  const handleDirectConfigChange = (key, value) => {
    const newConfig = {
      ...config,
      [key]: value
    };
    setConfig(newConfig);
    actions.setConfig(newConfig);
    localStorage.setItem('tradingConfig', JSON.stringify(newConfig));
    
    // Auto-save to database for immediate persistence
    console.log('Auto-saving config change:', key, value);
    saveConfigToBackend(newConfig, false);
  };

  const handleAddMT5Config = () => {
    if (!newMT5Config.name || !newMT5Config.path || !newMT5Config.login) {
      actions.addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fill in all required MT5 configuration fields.'
      });
      return;
    }

    const newConfig = {
      ...config,
      mt5_configs: {
        ...config.mt5_configs,
        [newMT5Config.name]: {
          path: newMT5Config.path,
          login: parseInt(newMT5Config.login),
          password: newMT5Config.password,
          server: newMT5Config.server
        }
      }
    };

    setConfig(newConfig);
    actions.setConfig(newConfig);
    localStorage.setItem('tradingConfig', JSON.stringify(newConfig));
    setNewMT5Config({ name: '', path: '', login: '', password: '', server: '' });
    
    actions.addNotification({
      type: 'info',
      title: 'Configuration Added',
      message: `MT5 configuration "${newMT5Config.name}" added. Click Save to persist changes.`
    });
  };

  const handleRemoveMT5Config = async (configName) => {
    const newConfig = {
      ...config,
      mt5_configs: { ...config.mt5_configs }
    };
    delete newConfig.mt5_configs[configName];
    
    setConfig(newConfig);
    actions.setConfig(newConfig);
    localStorage.setItem('tradingConfig', JSON.stringify(newConfig));
    
    // Direct API call to save without merging
    try {
      const token = localStorage.getItem('authToken');
      await fetch('http://localhost:5000/api/settings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newConfig)
      });
      
      actions.addNotification({
        type: 'success',
        title: 'Configuration Removed',
        message: `MT5 configuration "${configName}" has been removed and saved.`
      });
    } catch (error) {
      actions.addNotification({
        type: 'error',
        title: 'Save Error',
        message: `Failed to save removal: ${error.message}`
      });
    }
  };

  const handleBrowseFile = async () => {
    try {
      const filePath = await window.electronAPI.openFileDialog();
      if (filePath) {
        const fileName = filePath.split('\\').pop().toLowerCase();
        if (fileName.includes('terminal') && fileName.endsWith('.exe')) {
          setNewMT5Config(prev => ({ ...prev, path: filePath }));
          actions.addNotification({
            type: 'success',
            title: 'File Selected',
            message: `Selected: ${fileName}`
          });
        } else {
          actions.addNotification({
            type: 'warning',
            title: 'Invalid File',
            message: 'Please select a valid MT5 terminal executable (terminal64.exe or terminal.exe)'
          });
        }
      }
    } catch (error) {
      actions.addNotification({
        type: 'error',
        title: 'File Browser Error',
        message: 'Failed to open file browser. Please enter the path manually.'
      });
    }
  };

  const tabs = [
    { id: 'mt5', label: 'MT5 Accounts', icon: '🏦' },
    { id: 'trading', label: 'Trading Parameters', icon: '📊' },
    { id: 'symbols', label: 'Symbol Management', icon: '💱' },
    { id: 'money_management', label: 'Money Management', icon: '💰' }
  ];

  return (
    <div className="h-full overflow-auto bg-gray-900">
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Configuration</h1>
          <p className="text-gray-400">Manage your trading system settings and MT5 connections</p>
        </div>

        <div className="flex space-x-1 mb-6 bg-gray-800 p-1 rounded-lg">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {activeTab === 'mt5' && (
            <div className="space-y-6">
              <div className="card">
                <h3 className="text-lg font-semibold text-white mb-4">Existing MT5 Configurations</h3>
                {Object.keys(config.mt5_configs || {}).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(config.mt5_configs || {}).map(([name, cfg]) => (
                      <div key={name} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium text-white">{name}</h4>
                          <p className="text-sm text-gray-400">Login: {cfg.login} | Server: {cfg.server}</p>
                          <p className="text-xs text-gray-500 truncate">Path: {cfg.path}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveMT5Config(name)}
                          className="ml-4 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">🏦</div>
                    <p>No MT5 configurations found</p>
                    <p className="text-sm">Add your first MT5 account below</p>
                  </div>
                )}
              </div>

              <div className="card">
                <h3 className="text-lg font-semibold text-white mb-4">Add New MT5 Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Configuration Name</label>
                    <input
                      type="text"
                      value={newMT5Config.name}
                      onChange={(e) => setNewMT5Config(prev => ({ ...prev, name: e.target.value }))}
                      className="input-field w-full"
                      placeholder="e.g., Live Account, Demo Account"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">MT5 Terminal Path</label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newMT5Config.path}
                        onChange={(e) => setNewMT5Config(prev => ({ ...prev, path: e.target.value }))}
                        className="input-field flex-1"
                        placeholder="Path to terminal64.exe"
                      />
                      <button
                        onClick={handleBrowseFile}
                        className="btn-secondary px-3"
                      >
                        Browse
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Login</label>
                    <input
                      type="number"
                      value={newMT5Config.login}
                      onChange={(e) => setNewMT5Config(prev => ({ ...prev, login: e.target.value }))}
                      className="input-field w-full"
                      placeholder="MT5 Account Number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                    <input
                      type="password"
                      value={newMT5Config.password}
                      onChange={(e) => setNewMT5Config(prev => ({ ...prev, password: e.target.value }))}
                      className="input-field w-full"
                      placeholder="Account Password"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Server</label>
                    <input
                      type="text"
                      value={newMT5Config.server}
                      onChange={(e) => setNewMT5Config(prev => ({ ...prev, server: e.target.value }))}
                      className="input-field w-full"
                      placeholder="e.g., MetaQuotes-Demo, Broker-Live"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <button
                    onClick={handleAddMT5Config}
                    className="btn-primary"
                  >
                    Add Configuration
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'trading' && (
            <TradingParametersTab config={config} onConfigChange={handleDirectConfigChange} />
          )}

          {activeTab === 'symbols' && (
            <SymbolManagementTab 
              config={config} 
              onConfigChange={handleDirectConfigChange}
              actions={actions}
            />
          )}

          {activeTab === 'money_management' && (
            <div className="space-y-6">
              <div className="card">
                <h3 className="text-lg font-semibold text-white mb-4">Money Management</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Daily Profit Target (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={config.daily_profit_target || 5.0}
                      onChange={(e) => handleDirectConfigChange('daily_profit_target', parseFloat(e.target.value))}
                      className="input-field w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">✅ Locks in profits, avoids overtrading when you're green</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Daily Loss Limit (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={config.daily_loss_limit || 3.0}
                      onChange={(e) => handleDirectConfigChange('daily_loss_limit', parseFloat(e.target.value))}
                      className="input-field w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">✅ Essential, protects account blowups</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Daily Trade Limit</label>
                    <input
                      type="number"
                      value={config.daily_trade_limit || 10}
                      onChange={(e) => handleDirectConfigChange('daily_trade_limit', parseInt(e.target.value))}
                      className="input-field w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">✅ Prevents overtrading on boring/choppy days</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Daily Trade Loss Limit</label>
                    <input
                      type="number"
                      value={config.daily_trade_loss_limit || 5}
                      onChange={(e) => handleDirectConfigChange('daily_trade_loss_limit', parseInt(e.target.value))}
                      className="input-field w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">✅ Brilliant, stops death-by-a-thousand-paper-cuts if stop losses keep hitting</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Max Risk per Trade (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={config.max_risk_per_trade || 2.0}
                      onChange={(e) => handleDirectConfigChange('max_risk_per_trade', parseFloat(e.target.value))}
                      className="input-field w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">Never risk more than 1-2% of account balance per trade. Keeps position sizing sane automatically</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Weekly Profit Target (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={config.weekly_profit_target || 15.0}
                      onChange={(e) => handleDirectConfigChange('weekly_profit_target', parseFloat(e.target.value))}
                      className="input-field w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">Weekly profit limit to lock in gains</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Weekly Loss Limit (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={config.weekly_loss_limit || 10.0}
                      onChange={(e) => handleDirectConfigChange('weekly_loss_limit', parseFloat(e.target.value))}
                      className="input-field w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">Stops one bad day from wrecking the whole week</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-700">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-400">
              Your configuration is stored securely and isolated per user account
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  localStorage.removeItem('tradingConfig');
                  setConfig({
                    mt5_configs: {},
                    symbols: [],
                    risk_per_trade: 2.0,
                    max_open_risk: 10.0,
                    min_trade_score: 6.0,
                    max_trades_per_symbol: 1,
                    slippage_points: 3,
                    daily_profit_target: 5.0,
                    daily_loss_limit: 3.0,
                    daily_trade_limit: 10,
                    daily_trade_loss_limit: 5,
                    max_risk_per_trade: 2.0,
                    weekly_profit_target: 15.0,
                    weekly_loss_limit: 10.0
                  });
                  actions.addNotification({
                    type: 'info',
                    title: 'Configuration Reset',
                    message: 'All settings have been reset to defaults.'
                  });
                }}
                className="btn-secondary"
              >
                Reset to Defaults
              </button>
              <button
                onClick={async () => {
                  await saveConfigToBackend(config, true);
                }}
                className="btn-primary"
              >
Save Configuration {JSON.parse(localStorage.getItem('user') || '{}').subscription?.plan_type === 'Free' ? '(Ad Required)' : ''}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Configuration;