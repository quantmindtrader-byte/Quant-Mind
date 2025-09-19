import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import PaymentModal from './PaymentModal';
import SubscriptionStatus from './SubscriptionStatus';

const Sidebar = ({ currentView, setCurrentView, onLogout, appStatus }) => {
  const { state, actions } = useApp();
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: '📊',
      description: 'Overview and analytics'
    },
    {
      id: 'bot-control',
      label: 'Bot Control',
      icon: '🤖',
      description: 'Start/stop trading bot'
    },
    {
      id: 'configuration',
      label: 'Configuration',
      icon: '⚙️',
      description: 'Settings and MT5 setup'
    },
    {
      id: 'realtime-data',
      label: 'Real-time Data',
      icon: '📈',
      description: 'Live trading data'
    }
  ];

  const getStatusColor = () => {
    if (appStatus.backend && appStatus.agent) return 'bg-green-500';
    if (appStatus.backend) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusText = () => {
    if (appStatus.backend && appStatus.agent) return 'Active';
    if (appStatus.backend) return 'Backend Only';
    return 'Offline';
  };

  return (
    <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22,7 13.5,15.5 8.5,10.5 2,17"/>
              <polyline points="16,7 22,7 22,13"/>
            </svg>
          </div>
          <div>
            <h1 className="text-white font-semibold">Trading Desktop</h1>
            <div className="flex items-center space-x-2 text-xs">
              <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
              <span className="text-gray-400">{getStatusText()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm">
              {state.user?.username?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">
              {state.user?.username || 'User'}
            </p>
            <p className="text-gray-400 text-xs truncate">
              {state.user?.email || 'user@example.com'}
            </p>
            <div className="mt-1">
              <span className={`inline-block px-2 py-1 text-xs font-bold rounded-full ${
                state.user?.subscription?.plan === 'Elite' ? 'bg-yellow-500 text-black' :
                state.user?.subscription?.plan === 'Pro' ? 'bg-blue-500 text-white' :
                state.user?.subscription?.plan === 'Starter' ? 'bg-green-500 text-white' :
                state.user?.subscription?.plan === 'Free' ? 'bg-gray-500 text-white' :
                'bg-gray-400 text-white'
              }`}>
                {state.user?.subscription?.plan || 'Free'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Status */}
      <div className="px-4">
        <SubscriptionStatus user={state.user} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentView(item.id)}
            className={`w-full text-left p-3 rounded-lg transition-colors duration-200 ${
              currentView === item.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-3">
              <span className="text-lg">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.label}</p>
                <p className="text-xs opacity-75 truncate">{item.description}</p>
              </div>
            </div>
          </button>
        ))}
      </nav>

      {/* System Status */}
      <div className="p-4 border-t border-gray-700">
        <div className="space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Backend</span>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${appStatus.backend ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-gray-300">:{appStatus.backendPort}</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Trading Agent</span>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${appStatus.agent ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-gray-300">{appStatus.agent ? 'Running' : 'Stopped'}</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Notifications</span>
            <span className="text-gray-300">{state.notifications.length}</span>
          </div>
        </div>
      </div>

      {/* Logout */}
      <div className="p-4 border-t border-gray-700">
        <button
          onClick={onLogout}
          className="w-full text-left p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors duration-200"
        >
          <div className="flex items-center space-x-3">
            <span>🚪</span>
            <span>Logout</span>
          </div>
        </button>
      </div>
      
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={() => {
          actions.addNotification({
            type: 'success',
            title: 'Payment Successful',
            message: 'Your membership has been upgraded successfully!'
          });
          // Refresh user data
          window.location.reload();
        }}
      />
    </div>
  );
};

export default Sidebar;