import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';

const Dashboard = ({ appStatus }) => {
  const { state } = useApp();
  const [dailyLimits, setDailyLimits] = useState(null);
  const [todayStats, setTodayStats] = useState(null);
  const chartInitialized = useRef(false);

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

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('authToken');
        
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
    
    const interval = setInterval(() => {
      fetchTodayStats();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!chartInitialized.current) {
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
  }, []);

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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Trading Dashboard</h1>
          <p className="text-gray-400">Monitor your AI trading system performance</p>
        </div>

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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
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
    </div>
  );
};

export default Dashboard;
