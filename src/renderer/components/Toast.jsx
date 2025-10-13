import React, { useEffect, useState, useRef } from 'react';

const Toast = ({ notification, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, 4700);

    const removeTimer = setTimeout(() => {
      onCloseRef.current(notification.id);
    }, 5000);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [notification.id]);

  const getStyles = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-500 border-green-600';
      case 'error':
        return 'bg-red-500 border-red-600';
      case 'warning':
        return 'bg-yellow-500 border-yellow-600';
      case 'info':
        return 'bg-blue-500 border-blue-600';
      default:
        return 'bg-gray-500 border-gray-600';
    }
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ';
      default:
        return '•';
    }
  };

  return (
    <div
      className={`${getStyles()} text-white px-4 py-3 rounded-lg shadow-lg border-l-4 mb-3 min-w-[300px] max-w-[400px] transition-all duration-300 ${
        isExiting ? 'animate-slide-out' : 'animate-slide-in'
      }`}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-white bg-opacity-20 rounded-full mr-3 font-bold">
          {getIcon()}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">{notification.title}</p>
          <p className="text-xs mt-1 opacity-90">{notification.message}</p>
        </div>
        <button
          onClick={() => {
            setIsExiting(true);
            setTimeout(() => onClose(notification.id), 300);
          }}
          className="ml-3 text-white hover:text-gray-200 font-bold"
        >
          ×
        </button>
      </div>
    </div>
  );
};

const ToastContainer = ({ notifications, onClose }) => {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col">
      {notifications.map((notification) => (
        <Toast key={notification.id} notification={notification} onClose={onClose} />
      ))}
    </div>
  );
};

export default ToastContainer;
