import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

const BotControl = ({ appStatus, setAppStatus }) => {
  const { state, actions } = useApp();
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState('');
  const [availableConfigs, setAvailableConfigs] = useState([]);

  useEffect(() => {
    // Load available MT5 configurations from backend
    const loadConfigs = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('http://74.162.152.95/api/settings', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const settings = await response.json();
          if (settings.mt5_configs) {
            const configs = Object.keys(settings.mt5_configs);
            setAvailableConfigs(configs);
            
            // Try to restore previously selected config
            const savedConfig = localStorage.getItem('selectedMT5Config');
            if (savedConfig && configs.includes(savedConfig)) {
              setSelectedConfig(savedConfig);
            } else if (settings.selected_mt5_config && configs.includes(settings.selected_mt5_config)) {
              setSelectedConfig(settings.selected_mt5_config);
            } else if (configs.length > 0 && !selectedConfig) {
              setSelectedConfig(configs[0]);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load configs:', error);
        // Fallback to state config
        if (state.config?.mt5_configs) {
          const configs = Object.keys(state.config.mt5_configs);
          setAvailableConfigs(configs);
          
          // Try to restore previously selected config
          const savedConfig = localStorage.getItem('selectedMT5Config');
          if (savedConfig && configs.includes(savedConfig)) {
            setSelectedConfig(savedConfig);
          } else if (configs.length > 0 && !selectedConfig) {
            setSelectedConfig(configs[0]);
          }
        }
      }
    };
    
    loadConfigs();
  }, [state.config]);

  const handleStartBot = async () => {
    if (!selectedConfig) {
      actions.addNotification({
        type: 'error',
        title: 'Configuration Required',
        message: 'Please select an MT5 configuration before starting the bot.'
      });
      return;
    }

    setIsStarting(true);
    try {
      // Get user info for SaaS integration
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      console.log('Starting bot with config:', selectedConfig);
      const config = {
        selected_mt5_config: selectedConfig,
        MT5_CONFIG: selectedConfig,
        SYMBOLS: JSON.stringify(state.config?.symbols || []),
        user_id: user.id  // Pass user ID for SaaS integration
      };
      console.log('Full config being passed:', config);
      
      // Save selected config to localStorage for persistence
      localStorage.setItem('selectedMT5Config', selectedConfig);
      
      // Also save selected config to backend (preserve existing MT5 configs)
      const token = localStorage.getItem('authToken');
      try {
        // Get current backend config first
        const currentResponse = await fetch('http://74.162.152.95/api/settings', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        let configToSave = { ...state.config, selected_mt5_config: selectedConfig, user_id: user.id };
        if (currentResponse.ok) {
          const currentConfig = await currentResponse.json();
          // Preserve existing MT5 configs
          configToSave.mt5_configs = {
            ...currentConfig.mt5_configs,
            ...state.config?.mt5_configs
          };
        }
        
        await fetch('http://74.162.152.95/api/settings', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(configToSave)
        });
        console.log('Settings saved to backend with preserved MT5 configs');
      } catch (error) {
        console.error('Failed to save settings:', error);
      }

      await window.electronAPI.startAgent(config);
      
      actions.setTradingStatus('running');
      actions.addNotification({
        type: 'success',
        title: 'Bot Started',
        message: `Trading bot started with ${selectedConfig} configuration.`
      });

      // Update app status
      setAppStatus(prev => ({ ...prev, agent: true }));
    } catch (error) {
      actions.addNotification({
        type: 'error',
        title: 'Start Failed',
        message: `Failed to start trading bot: ${error.message}`
      });
    } finally {
      setIsStarting(false);
    }
  };

  const handleStopBot = async () => {
    setIsStopping(true);
    try {
      await window.electronAPI.stopAgent();
      
      actions.setTradingStatus('stopped');
      actions.addNotification({
        type: 'info',
        title: 'Bot Stopped',
        message: 'Trading bot has been stopped.'
      });

      // Update app status
      setAppStatus(prev => ({ ...prev, agent: false }));
    } catch (error) {
      actions.addNotification({
        type: 'error',
        title: 'Stop Failed',
        message: `Failed to stop trading bot: ${error.message}`
      });
    } finally {
      setIsStopping(false);
    }
  };

  const handleForceReanalysis = async () => {
    try {
      const result = await window.electronAPI.forceReanalysisWithAd();
      if (result.success) {
        actions.addNotification({
          type: 'info',
          title: 'Reanalysis Triggered',
          message: 'Force reanalysis has been triggered. Changes will apply on the next cycle.'
        });
      } else {
        actions.addNotification({
          type: 'error',
          title: 'Reanalysis Failed',
          message: result.error || 'Failed to trigger reanalysis'
        });
      }
    } catch (error) {
      actions.addNotification({
        type: 'error',
        title: 'Reanalysis Error',
        message: `Error: ${error.message}`
      });
    }
  };

  const getStatusColor = () => {
    switch (state.tradingStatus) {
      case 'running': return 'text-green-400';
      case 'stopping': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = () => {
    switch (state.tradingStatus) {
      case 'running': return '🟢';
      case 'stopping': return '🟡';
      case 'error': return '🔴';
      default: return '⚪';
    }
  };

  return (
    <div className="h-full overflow-auto bg-gray-900">
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Bot Control</h1>
          <p className="text-gray-400">Manage your AI trading bot operations</p>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Bot Status</p>
                <p className={`text-xl font-semibold ${getStatusColor()}`}>
                  {state.tradingStatus.charAt(0).toUpperCase() + state.tradingStatus.slice(1)}
                </p>
                {state.tradingStatus === 'running' && selectedConfig && (
                  <p className="text-xs text-gray-500 mt-1">Using: {selectedConfig}</p>
                )}
              </div>
              <div className="text-2xl">{getStatusIcon()}</div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Selected MT5 Config</p>
                <p className="text-xl font-semibold text-white">
                  {selectedConfig || 'None'}
                </p>
              </div>
              <div className="text-2xl">⚙️</div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Active Symbols</p>
                <p className="text-xl font-semibold text-white">
                  {state.config?.symbols?.length || 0}
                </p>
              </div>
              <div className="text-2xl">💱</div>
            </div>
          </div>
        </div>

        {/* Control Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bot Controls */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <span className="mr-2">🎮</span>
              Bot Controls
            </h3>
            
            <div className="space-y-4">
              {/* Configuration Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  MT5 Configuration
                </label>
                <select
                  value={selectedConfig}
                  onChange={(e) => {
                    const newConfig = e.target.value;
                    setSelectedConfig(newConfig);
                    // Save to localStorage immediately
                    if (newConfig) {
                      localStorage.setItem('selectedMT5Config', newConfig);
                    }
                  }}
                  className="input-field w-full"
                  disabled={state.tradingStatus === 'running'}
                >
                  <option value="">Select Configuration</option>
                  {availableConfigs.map(config => (
                    <option key={config} value={config}>{config}</option>
                  ))}
                </select>
              </div>

              {/* Control Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={handleStartBot}
                  disabled={isStarting || state.tradingStatus === 'running' || !appStatus.backend}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                    state.tradingStatus === 'running' || !appStatus.backend
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'btn-success'
                  }`}
                >
                  {isStarting ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Starting...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <span>▶️</span>
                      <span>Start Bot</span>
                    </div>
                  )}
                </button>

                <button
                  onClick={handleStopBot}
                  disabled={isStopping || state.tradingStatus !== 'running'}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                    state.tradingStatus !== 'running'
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'btn-danger'
                  }`}
                >
                  {isStopping ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Stopping...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <span>⏹️</span>
                      <span>Stop Bot</span>
                    </div>
                  )}
                </button>
              </div>

              {/* Advanced Controls */}
              <div className="pt-4 border-t border-gray-700">
                <button
                  onClick={handleForceReanalysis}
                  disabled={state.tradingStatus !== 'running'}
                  className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                    state.tradingStatus !== 'running'
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'btn-secondary'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <span>🔄</span>
                    <span>Force Reanalysis {JSON.parse(localStorage.getItem('user') || '{}').subscription?.plan_type === 'Free' ? '(Ad Required)' : ''}</span>
                  </div>
                </button>
              </div>
            </div>
          </div>



          {/* System Information */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <span className="mr-2">ℹ️</span>
              System Information
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Backend Port</p>
                  <p className="text-white font-mono">{appStatus.backendPort}</p>
                </div>
                <div>
                  <p className="text-gray-400">WebSocket Port</p>
                  <p className="text-white font-mono">{appStatus.wsPort}</p>
                </div>
                <div>
                  <p className="text-gray-400">Log Entries</p>
                  <p className="text-white font-mono">{state.logs.length}</p>
                </div>
                <div>
                  <p className="text-gray-400">Notifications</p>
                  <p className="text-white font-mono">{state.notifications.length}</p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="pt-4 border-t border-gray-700">
                <p className="text-gray-400 text-sm mb-3">Quick Actions</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => actions.clearLogs()}
                    className="py-2 px-3 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                  >
                    Clear Logs
                  </button>
                  <button
                    onClick={() => {
                      state.notifications.forEach(n => actions.removeNotification(n.id));
                    }}
                    className="py-2 px-3 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                  >
                    Clear Notifications
                  </button>
                  <button
                    onClick={() => {
                      // Clear all frontend data
                      actions.clearLogs();
                      state.notifications.forEach(n => actions.removeNotification(n.id));
                      actions.setTradingStatus('stopped');
                      // Clear selected config
                      localStorage.removeItem('selectedMT5Config');
                      setSelectedConfig('');
                      actions.addNotification({
                        type: 'info',
                        title: 'Data Cleared',
                        message: 'All session data has been cleared.'
                      });
                    }}
                    className="col-span-2 py-2 px-3 bg-red-700 hover:bg-red-600 text-white text-sm rounded-lg transition-colors"
                  >
                    Clear All Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Prerequisites Check */}
        {!appStatus.backend && (
          <div className="mt-6">
            <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="text-yellow-500 text-xl">⚠️</div>
                <div>
                  <p className="text-yellow-300 font-medium">Backend Not Available</p>
                  <p className="text-yellow-200 text-sm">
                    The Python backend must be running before you can start the trading bot.
                    Please check your configuration and ensure all dependencies are installed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Configuration Warning */}
        {availableConfigs.length === 0 && (
          <div className="mt-6">
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="text-red-500 text-xl">❌</div>
                <div>
                  <p className="text-red-300 font-medium">No MT5 Configurations Found</p>
                  <p className="text-red-200 text-sm">
                    Please configure at least one MT5 account in the Configuration section before starting the bot.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BotControl;