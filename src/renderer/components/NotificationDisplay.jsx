import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';

const NotificationDisplay = () => {
  const { state, actions } = useApp();

  useEffect(() => {
    const timers = [];
    
    state.notifications.forEach(notification => {
      const timer = setTimeout(() => {
        actions.removeNotification(notification.id);
      }, 5000);
      timers.push(timer);
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [state.notifications.length]);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return 'ℹ️';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'success': return 'bg-green-600 border-green-500';
      case 'error': return 'bg-red-600 border-red-500';
      case 'warning': return 'bg-yellow-600 border-yellow-500';
      case 'info': return 'bg-blue-600 border-blue-500';
      default: return 'bg-gray-600 border-gray-500';
    }
  };

  if (state.notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {state.notifications.map((notification) => (
        <div
          key={notification.id}
          className={`max-w-sm p-4 rounded-lg shadow-lg border-l-4 ${getNotificationColor(notification.type)} text-white animate-slide-in`}
        >
          <div className="flex items-start">
            <div className="flex-shrink-0 mr-3 text-lg">
              {getNotificationIcon(notification.type)}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm">{notification.title}</h4>
              <p className="text-sm opacity-90 mt-1">{notification.message}</p>
            </div>
            <button
              onClick={() => actions.removeNotification(notification.id)}
              className="flex-shrink-0 ml-2 text-white hover:text-gray-300 text-lg"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationDisplay;