import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';

const Dashboard = ({ appStatus }) => {
  const { state } = useApp();
  const [stats, setStats] = useState({
    totalTrades: 0,
    successRate: 0,
    totalProfit: 0,
    activeSymbols: 0
  });
  const [dailyLimits, setDailyLimits] = useState(null);
  const [tradingStats, setTradingStats] = useState(null);
  const [todayStats, setTodayStats] = useState(null);
  const [tradeHistory, setTradeHistory] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('daily');
  const [customDates, setCustomDates] = useState({ start: '', end: '' });
  const [activeTab, setActiveTab] = useState('overview');
  const chartInitialized = useRef(false);

  const fetchTradingStats = async (period = 'daily', startDate = null, endDate = null) => {
    try {
      const token = localStorage.getItem('authToken');
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      
      if (!user || !user.id) return;
      
      let url = `http://74.162.152.95/api/bot/trade-statistics/${user.id}?period=${period}`;
      if (period === 'custom' && startDate && endDate) {
        url += `&start_date=${startDate}&end_date=${endDate}`;
      }
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setTradingStats(data.statistics);
        }
      }
    } catch (error) {
      console.error('Failed to fetch trading stats:', error);
    }
  };

  const fetchTodayStats = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://74.162.152.95/api/user/trading-statistics?period=daily', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTodayStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch today stats:', error);
    }
  };

  const fetchTradeHistory = async (period = 'all', startDate = null, endDate = null) => {
    try {
      const token = localStorage.getItem('authToken');
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      
      if (!user || !user.id) return;
      
      let url = `http://74.162.152.95/api/bot/trade-statistics/${user.id}?period=${period}`;
      if (period === 'custom' && startDate && endDate) {
        url += `&start_date=${startDate}&end_date=${endDate}`;
      }
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setTradeHistory(data.recent_trades || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch trade history:', error);
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('authToken');
        
        // Load daily limits
        const limitsResponse = await fetch('http://74.162.152.95/api/user/trading-limits', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (limitsResponse.ok) {
          const limits = await limitsResponse.json();
          setDailyLimits(limits);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };

    fetchStats();
    fetchTodayStats();
    fetchTradingStats(selectedPeriod);
    fetchTradeHistory(selectedPeriod);
    
    const interval = setInterval(() => {
      fetchTodayStats();
      fetchTradingStats(selectedPeriod);
      fetchTradeHistory(selectedPeriod);
    }, 30000);
    
    return () => clearInterval(interval);
  }, [selectedPeriod]);

  useEffect(() => {
    if (activeTab === 'overview' && !chartInitialized.current) {
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/tv.js';
      script.async = true;
      script.onload = () => {
        if (window.TradingView) {
          new window.TradingView.widget({
            autosize: true,
            symbol: 'FX:EURUSD',
            interval: '15',
            timezone: 'Etc/UTC',
            theme: 'dark',
            style: '1',
            locale: 'en',
            toolbar_bg: '#131722',
            enable_publishing: false,
            allow_symbol_change: true,
            container_id: 'tradingview_chart'
          });
          chartInitialized.current = true;
        }
      };
      document.head.appendChild(script);
      return () => {
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      };
    }
  }, [activeTab]);

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    if (period === 'custom') {
      if (customDates.start && customDates.end) {
        fetchTradingStats(period, customDates.start, customDates.end);
        fetchTradeHistory(period, customDates.start, customDates.end);
      }
    } else {
      fetchTradingStats(period);
      fetchTradeHistory(period);
    }
  };

  const handleCustomDateChange = () => {
    if (customDates.start && customDates.end) {
      fetchTradingStats('custom', customDates.start, customDates.end);
      fetchTradeHistory('custom', customDates.start, customDates.end);
    }
  };

  const getSystemHealth = () => {
    if (appStatus.backend && appStatus.agent) return { status: 'Excellent', color: 'text-green-400', icon: '🟢' };
    if (appStatus.backend) return { status: 'Good', color: 'text-yellow-400', icon: '🟡' };
    return { status: 'Offline', color: 'text-red-400', icon: '🔴' };
  };

  const systemHealth = getSystemHealth();

  const recentActivity = state.logs.slice(-5).reverse();

  return (
    <div className="h-full overflow-auto bg-gray-900">
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Trading Dashboard</h1>
          <p className="text-gray-400">Monitor your AI trading system performance</p>
        </div>



        {/* Plan Limits Display */}
        {dailyLimits && (
          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 mb-6">
            <h3 className="text-blue-300 font-medium mb-3 flex items-center">
              <span className="mr-2">📊</span>
              {dailyLimits.plan_type} Plan - Daily Limits
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Symbols:</span>
                <span className="text-white">
                  {dailyLimits.symbols_used}/{dailyLimits.max_symbols === -1 ? '∞' : dailyLimits.max_symbols}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Daily Trades:</span>
                <span className="text-white">
                  {dailyLimits.trades_taken}/{dailyLimits.max_trades_per_day === -1 ? '∞' : dailyLimits.max_trades_per_day}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6 bg-gray-800 p-1 rounded-lg">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'statistics', label: 'Statistics', icon: '📈' },
            { id: 'history', label: 'Trade History', icon: '📋' }
          ].map(tab => (
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

        {activeTab === 'overview' && (
          <>
            {/* System Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">System Health</p>
                    <p className={`text-xl font-semibold ${systemHealth.color}`}>
                      {systemHealth.status}
                    </p>
                  </div>
                  <div className="text-2xl">{systemHealth.icon}</div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Today's Trades</p>
                    <p className="text-xl font-semibold text-white">{todayStats?.total_trades || 0}</p>
                  </div>
                  <div className="text-2xl">📈</div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Today's Win Rate</p>
                    <p className="text-xl font-semibold text-white">{todayStats?.win_rate || 0}%</p>
                  </div>
                  <div className="text-2xl">🎯</div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Today's P&L</p>
                    <p className={`text-xl font-semibold ${
                      (todayStats?.total_pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      ${(todayStats?.total_pnl || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="text-2xl">💰</div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'statistics' && (
          <>
            {/* Period Selector */}
            <div className="card mb-6">
              <div className="flex flex-wrap items-center gap-4 mb-4">
                <div className="flex space-x-2">
                  {['daily', 'weekly', 'monthly', 'custom'].map(period => (
                    <button
                      key={period}
                      onClick={() => handlePeriodChange(period)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        selectedPeriod === period
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {period.charAt(0).toUpperCase() + period.slice(1)}
                    </button>
                  ))}
                </div>
                
                {selectedPeriod === 'custom' && (
                  <div className="flex items-center space-x-2">
                    <input
                      type="date"
                      value={customDates.start}
                      onChange={(e) => setCustomDates(prev => ({ ...prev, start: e.target.value }))}
                      className="input-field"
                    />
                    <span className="text-gray-400">to</span>
                    <input
                      type="date"
                      value={customDates.end}
                      onChange={(e) => setCustomDates(prev => ({ ...prev, end: e.target.value }))}
                      className="input-field"
                    />
                    <button
                      onClick={handleCustomDateChange}
                      className="btn-primary px-3 py-1"
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Statistics Cards */}
            {tradingStats && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <div className="card">
                    <div className="text-center">
                      <p className="text-gray-400 text-sm">Total Trades</p>
                      <p className="text-3xl font-bold text-white">{tradingStats.total_trades}</p>
                    </div>
                  </div>
                  <div className="card">
                    <div className="text-center">
                      <p className="text-gray-400 text-sm">Win Rate</p>
                      <p className="text-3xl font-bold text-green-400">{tradingStats.win_rate}%</p>
                    </div>
                  </div>
                  <div className="card">
                    <div className="text-center">
                      <p className="text-gray-400 text-sm">Net Profit</p>
                      <p className={`text-3xl font-bold ${
                        (tradingStats.net_profit || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        ${(tradingStats.net_profit || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="card">
                    <div className="text-center">
                      <p className="text-gray-400 text-sm">Profit Factor</p>
                      <p className="text-3xl font-bold text-blue-400">
                        {(tradingStats.profit_factor || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  <div className="card">
                    <h3 className="text-lg font-semibold text-white mb-4">Performance Breakdown</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Winning Trades:</span>
                        <span className="text-green-400">{tradingStats.winning_trades}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Losing Trades:</span>
                        <span className="text-red-400">{tradingStats.losing_trades}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Profit:</span>
                        <span className="text-green-400">${tradingStats.total_profit.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Loss:</span>
                        <span className="text-red-400">-${tradingStats.total_loss.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Average Win:</span>
                        <span className="text-green-400">${(tradingStats.average_win || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Average Loss:</span>
                        <span className="text-red-400">${(tradingStats.average_loss || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Largest Win:</span>
                        <span className="text-green-400">${(tradingStats.largest_win || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Largest Loss:</span>
                        <span className="text-red-400">${(tradingStats.largest_loss || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <h3 className="text-lg font-semibold text-white mb-4">MT5 History Stats</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Profit Factor:</span>
                        <span className="text-blue-400 font-semibold">{(tradingStats.profit_factor || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Win Rate:</span>
                        <span className="text-green-400 font-semibold">{(tradingStats.win_rate || 0).toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Net Profit:</span>
                        <span className={`font-semibold ${
                          (tradingStats.net_profit || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          ${(tradingStats.net_profit || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-700">
                        <p className="text-sm text-gray-500 text-center">
                          Data synced from MT5 terminal
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {activeTab === 'history' && (
          <>
            {/* Period Selector for History */}
            <div className="card mb-6">
              <div className="flex flex-wrap items-center gap-4 mb-4">
                <div className="flex space-x-2">
                  {['daily', 'weekly', 'monthly', 'all', 'custom'].map(period => (
                    <button
                      key={period}
                      onClick={() => handlePeriodChange(period)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        selectedPeriod === period
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {period.charAt(0).toUpperCase() + period.slice(1)}
                    </button>
                  ))}
                </div>
                
                {selectedPeriod === 'custom' && (
                  <div className="flex items-center space-x-2">
                    <input
                      type="date"
                      value={customDates.start}
                      onChange={(e) => setCustomDates(prev => ({ ...prev, start: e.target.value }))}
                      className="input-field"
                    />
                    <span className="text-gray-400">to</span>
                    <input
                      type="date"
                      value={customDates.end}
                      onChange={(e) => setCustomDates(prev => ({ ...prev, end: e.target.value }))}
                      className="input-field"
                    />
                    <button
                      onClick={handleCustomDateChange}
                      className="btn-primary px-3 py-1"
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Trade History Table */}
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Trade History</h3>
              {tradeHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4 text-gray-400">Time</th>
                        <th className="text-left py-3 px-4 text-gray-400">Symbol</th>
                        <th className="text-left py-3 px-4 text-gray-400">Type</th>
                        <th className="text-left py-3 px-4 text-gray-400">Volume</th>
                        <th className="text-left py-3 px-4 text-gray-400">Price</th>
                        <th className="text-left py-3 px-4 text-gray-400">P&L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tradeHistory.map((trade, index) => (
                        <tr key={index} className="border-b border-gray-800 hover:bg-gray-800">
                          <td className="py-3 px-4 text-gray-300">
                            {new Date(trade.time).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-white font-medium">{trade.symbol}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-xs ${
                              trade.type === 'BUY' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                            }`}>
                              {trade.type}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-300">{trade.volume}</td>
                          <td className="py-3 px-4 text-gray-300">{trade.price}</td>
                          <td className={`py-3 px-4 font-medium ${
                            trade.profit >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            ${trade.profit.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📊</div>
                  <p>No trades found for the selected period</p>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'overview' && (
          <>
            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <div className="card h-[600px] flex flex-col">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <span className="mr-2">📋</span>
                  Recent Activity
                </h3>
                <div className="space-y-3 overflow-y-auto flex-1">
                  {recentActivity.length > 0 ? (
                    recentActivity.map((log, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-gray-700 rounded-lg">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          log.type === 'error' ? 'bg-red-500' : 
                          log.type === 'agent' ? 'bg-blue-500' : 'bg-green-500'
                        }`}></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-300 truncate">{log.message}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-2">📭</div>
                      <p>No recent activity</p>
                    </div>
                  )}
                </div>
              </div>

              {/* TradingView Chart */}
              <div className="card h-[600px] flex flex-col">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <span className="mr-2">📈</span>
                  Live Market Chart
                </h3>
                <div className="flex-1 bg-[#131722] rounded-lg overflow-hidden">
                  <div className="tradingview-widget-container" style={{ height: '100%', width: '100%' }}>
                    <div id="tradingview_chart" style={{ height: '100%', width: '100%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'overview' && (
          <>
            {/* System Components Status */}
            <div className="mt-8">
              <div className="card">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <span className="mr-2">⚙️</span>
                  System Components
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${appStatus.backend ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="text-white">Backend API</span>
                    </div>
                    <span className="text-sm text-gray-400">Port {appStatus.backendPort}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${appStatus.agent ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="text-white">Trading Agent</span>
                    </div>
                    <span className="text-sm text-gray-400">{appStatus.agent ? 'Active' : 'Stopped'}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${state.wsConnection ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                      <span className="text-white">WebSocket</span>
                    </div>
                    <span className="text-sm text-gray-400">Port {appStatus.wsPort}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}


      </div>
    </div>
  );
};

export default Dashboard;