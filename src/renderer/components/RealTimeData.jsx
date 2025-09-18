import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';

const RealTimeData = ({ appStatus }) => {
  const { state, actions } = useApp();
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef(null);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [state.logs, autoScroll]);

  const filteredLogs = state.logs.filter(log => {
    const matchesFilter = filter === 'all' || log.type === filter;
    const matchesSearch = searchTerm === '' || 
      log.message.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getLogIcon = (type) => {
    switch (type) {
      case 'error': return '❌';
      case 'agent': return '🤖';
      case 'backend': return '🔧';
      default: return 'ℹ️';
    }
  };

  const getLogColor = (type) => {
    switch (type) {
      case 'error': return 'text-red-400 border-red-500';
      case 'agent': return 'text-blue-400 border-blue-500';
      case 'backend': return 'text-green-400 border-green-500';
      default: return 'text-gray-400 border-gray-500';
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const exportLogs = () => {
    const logsText = filteredLogs.map(log => 
      `[${formatTimestamp(log.timestamp)}] [${log.type.toUpperCase()}] ${log.message}`
    ).join('\n');
    
    const blob = new Blob([logsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trading-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    actions.addNotification({
      type: 'success',
      title: 'Logs Exported',
      message: 'Trading logs have been exported successfully.'
    });
  };

  return (
    <div className="h-full flex flex-col bg-gray-900">
      <div className="p-6 border-b border-gray-700">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Real-time Data</h1>
          <p className="text-gray-400">Monitor live trading data, logs, and system events</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Logs</p>
                <p className="text-xl font-semibold text-white">{state.logs.length}</p>
              </div>
              <div className="text-2xl">📋</div>
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Error Count</p>
                <p className="text-xl font-semibold text-red-400">
                  {state.logs.filter(log => log.type === 'error').length}
                </p>
              </div>
              <div className="text-2xl">❌</div>
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Agent Events</p>
                <p className="text-xl font-semibold text-blue-400">
                  {state.logs.filter(log => log.type === 'agent').length}
                </p>
              </div>
              <div className="text-2xl">🤖</div>
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Real-time Updates</p>
                <p className="text-xl font-semibold text-green-400">{state.realTimeData.length}</p>
              </div>
              <div className="text-2xl">📊</div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            {/* Filter */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="input-field"
            >
              <option value="all">All Logs</option>
              <option value="agent">Agent Only</option>
              <option value="backend">Backend Only</option>
              <option value="error">Errors Only</option>
            </select>

            {/* Search */}
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field w-64"
            />
          </div>

          <div className="flex items-center space-x-3">
            {/* Auto-scroll toggle */}
            <label className="flex items-center space-x-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded"
              />
              <span>Auto-scroll</span>
            </label>

            {/* Action buttons */}
            <button
              onClick={exportLogs}
              className="btn-secondary text-sm"
            >
              Export Logs
            </button>
            
            <button
              onClick={() => actions.clearLogs()}
              className="btn-danger text-sm"
            >
              Clear All
            </button>
          </div>
        </div>
      </div>

      {/* Logs Display */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-auto p-6">
          {filteredLogs.length > 0 ? (
            <div className="space-y-2">
              {filteredLogs.map((log, index) => (
                <div
                  key={index}
                  className={`flex items-start space-x-3 p-3 bg-gray-800 rounded-lg border-l-4 ${getLogColor(log.type)}`}
                >
                  <div className="text-lg mt-0.5">{getLogIcon(log.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-medium uppercase tracking-wide ${getLogColor(log.type)}`}>
                        {log.type}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 break-words">{log.message}</p>
                  </div>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <div className="text-6xl mb-4">📡</div>
                <h3 className="text-xl font-medium mb-2">No Data Available</h3>
                <p className="text-sm">
                  {state.logs.length === 0 
                    ? 'Start the trading bot to see real-time data and logs'
                    : 'No logs match your current filter criteria'
                  }
                </p>
                {!appStatus.backend && (
                  <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-700 rounded-lg">
                    <p className="text-yellow-300 text-sm">
                      ⚠️ Backend is not running. Please start the backend to see live data.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Real-time Data Panel */}
      {state.realTimeData.length > 0 && (
        <div className="border-t border-gray-700 bg-gray-800">
          <div className="p-4">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
              <span className="mr-2">📈</span>
              Latest Trading Updates
            </h3>
            <div className="space-y-2 max-h-32 overflow-auto">
              {state.realTimeData.slice(-3).reverse().map((data, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-700 rounded text-sm">
                  <span className="text-gray-300 flex-1">{data.message}</span>
                  <span className="text-gray-500 text-xs ml-3">
                    {formatTimestamp(data.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Connection Status */}
      <div className="border-t border-gray-700 bg-gray-800 px-6 py-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${appStatus.backend ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-gray-400">Backend</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${appStatus.agent ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-gray-400">Trading Agent</span>
            </div>
          </div>
          <div className="text-gray-500">
            Showing {filteredLogs.length} of {state.logs.length} logs
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealTimeData;