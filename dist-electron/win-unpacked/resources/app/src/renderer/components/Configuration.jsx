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
        const response = await fetch('http://74.162.152.95/api/user/trading-limits', {
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
  + Add Symbol
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
  const [editingConfig, setEditingConfig] = useState(null);
  const [editMT5Config, setEditMT5Config] = useState(null);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        console.log('Loading MT5 configs from backend...');
        const result = await window.electronAPI.fetchMT5Config();
        
        if (result.success && result.data) {
          console.log('Successfully loaded MT5 configs:', result.data);
          setConfig(prev => ({ 
            ...prev, 
            mt5_configs: result.data.mt5_configs || {}
          }));
          setOriginalConfig({ mt5_configs: result.data.mt5_configs || {} });
        } else {
          console.error('Failed to load MT5 configs:', result.error);
          setConfig(prev => ({ ...prev, mt5_configs: {} }));
        }
      } catch (error) {
        console.error('Error loading MT5 configs:', error);
        setConfig(prev => ({ ...prev, mt5_configs: {} }));
      }
    };
    loadConfig();
  }, []);

  const showNotification = (type, title, message) => {
    actions.addNotification({ type, title, message });
  };

  const saveConfigToBackend = async (newConfig) => {
    try {
      // Ensure we always send complete config including all MT5 configs
      const mergedConfig = {
        ...newConfig,
        mt5_configs: newConfig.mt5_configs || config.mt5_configs || {}
      };
      
      console.log('Saving config with MT5 configs:', Object.keys(mergedConfig.mt5_configs || {}));
      
      const result = await window.electronAPI.saveMT5Config(mergedConfig);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to save configuration');
      }
      
      showNotification('success', 'Configuration Saved', 'Configuration saved successfully.');
    } catch (error) {
      showNotification('error', 'Save Failed', `Failed to save configuration: ${error.message}`);
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
  };

  const handleAddMT5Config = async () => {
    if (!newMT5Config.name || !newMT5Config.path || !newMT5Config.login) {
      showNotification('error', 'Validation Error', 'Please fill in all required MT5 configuration fields.');
      return;
    }

    try {
      const result = await window.electronAPI.addMT5Account({
        name: newMT5Config.name,
        path: newMT5Config.path,
        login: parseInt(newMT5Config.login),
        password: newMT5Config.password,
        server: newMT5Config.server
      });

      if (result.success) {
        // Reload configs from backend
        const fetchResult = await window.electronAPI.fetchMT5Config();
        if (fetchResult.success) {
          setConfig(prev => ({ ...prev, mt5_configs: fetchResult.data.mt5_configs || {} }));
        }
        setNewMT5Config({ name: '', path: '', login: '', password: '', server: '' });
        showNotification('success', 'MT5 Config Added', `MT5 configuration "${newMT5Config.name}" added successfully.`);
      } else {
        showNotification('error', 'Add Failed', result.error || 'Failed to add MT5 configuration');
      }
    } catch (error) {
      showNotification('error', 'Add Failed', error.message);
    }
  };

  const handleEditMT5Config = (configName) => {
    const cfg = config.mt5_configs[configName];
    setEditingConfig(configName);
    setEditMT5Config({
      name: configName,
      path: cfg.path,
      login: cfg.login.toString(),
      password: cfg.password,
      server: cfg.server
    });
  };

  const handleSaveEditMT5Config = async () => {
    if (!editMT5Config.name || !editMT5Config.path || !editMT5Config.login) {
      showNotification('error', 'Validation Error', 'Please fill in all required MT5 configuration fields.');
      return;
    }

    try {
      const result = await window.electronAPI.updateMT5Account({
        old_name: editingConfig,
        name: editMT5Config.name,
        path: editMT5Config.path,
        login: parseInt(editMT5Config.login),
        password: editMT5Config.password,
        server: editMT5Config.server
      });

      if (result.success) {
        // Reload configs from backend
        const fetchResult = await window.electronAPI.fetchMT5Config();
        if (fetchResult.success) {
          setConfig(prev => ({ ...prev, mt5_configs: fetchResult.data.mt5_configs || {} }));
        }
        showNotification('success', 'MT5 Config Updated', `MT5 configuration "${editMT5Config.name}" has been updated successfully.`);
        setEditingConfig(null);
        setEditMT5Config(null);
      } else {
        showNotification('error', 'Update Failed', result.error || 'Failed to update MT5 configuration');
      }
    } catch (error) {
      showNotification('error', 'Update Failed', error.message);
    }
  };

  const handleRemoveMT5Config = async (configName) => {
    try {
      const result = await window.electronAPI.removeMT5Account(configName);

      if (result.success) {
        // Reload configs from backend
        const fetchResult = await window.electronAPI.fetchMT5Config();
        if (fetchResult.success) {
          setConfig(prev => ({ ...prev, mt5_configs: fetchResult.data.mt5_configs || {} }));
        }
        showNotification('success', 'MT5 Config Removed', `MT5 configuration "${configName}" has been removed successfully.`);
      } else {
        showNotification('error', 'Remove Failed', result.error || 'Failed to remove MT5 configuration');
      }
    } catch (error) {
      showNotification('error', 'Remove Failed', error.message);
    }
  };

  const handleBrowseFile = async () => {
    try {
      const filePath = await window.electronAPI.openFileDialog();
      if (filePath) {
        const fileName = filePath.split('\\').pop().toLowerCase();
        if (fileName.includes('terminal') && fileName.endsWith('.exe')) {
          setNewMT5Config(prev => ({ ...prev, path: filePath }));
          showNotification('success', 'File Selected', `Selected: ${fileName}`);
        } else {
          showNotification('error', 'Invalid File', 'Please select a valid MT5 terminal executable (terminal64.exe or terminal.exe)');
        }
      }
    } catch (error) {
      showNotification('error', 'File Browser Error', 'Failed to open file browser. Please enter the path manually.');
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
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditMT5Config(name)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleRemoveMT5Config(name)}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                          >
                            Remove
                          </button>
                        </div>
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

        {editingConfig && editMT5Config && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4">
              <h3 className="text-xl font-semibold text-white mb-4">Edit MT5 Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Configuration Name</label>
                  <input
                    type="text"
                    value={editMT5Config.name}
                    onChange={(e) => setEditMT5Config(prev => ({ ...prev, name: e.target.value }))}
                    className="input-field w-full"
                    placeholder="e.g., Live Account, Demo Account"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">MT5 Terminal Path</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={editMT5Config.path}
                      onChange={(e) => setEditMT5Config(prev => ({ ...prev, path: e.target.value }))}
                      className="input-field flex-1"
                      placeholder="Path to terminal64.exe"
                    />
                    <button
                      onClick={async () => {
                        const filePath = await window.electronAPI.openFileDialog();
                        if (filePath) {
                          setEditMT5Config(prev => ({ ...prev, path: filePath }));
                        }
                      }}
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
                    value={editMT5Config.login}
                    onChange={(e) => setEditMT5Config(prev => ({ ...prev, login: e.target.value }))}
                    className="input-field w-full"
                    placeholder="MT5 Account Number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                  <input
                    type="password"
                    value={editMT5Config.password}
                    onChange={(e) => setEditMT5Config(prev => ({ ...prev, password: e.target.value }))}
                    className="input-field w-full"
                    placeholder="Account Password"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Server</label>
                  <input
                    type="text"
                    value={editMT5Config.server}
                    onChange={(e) => setEditMT5Config(prev => ({ ...prev, server: e.target.value }))}
                    className="input-field w-full"
                    placeholder="e.g., MetaQuotes-Demo, Broker-Live"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setEditingConfig(null);
                    setEditMT5Config(null);
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEditMT5Config}
                  className="btn-primary"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

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
                  showNotification('success', 'Configuration Reset', 'All settings have been reset to defaults.');
                }}
                className="btn-secondary"
              >
                Reset to Defaults
              </button>
              <button
                onClick={async () => {
                  await saveConfigToBackend(config, false);
                }}
                className="btn-primary"
              >
Save Configuration
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Configuration;