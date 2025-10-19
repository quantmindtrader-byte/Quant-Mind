import React, { useState, useEffect } from 'react';

const AutoUpdater = ({ onUpdateComplete, onUpdateError }) => {
  const [updateStatus, setUpdateStatus] = useState('checking'); // checking, available, downloading, installing, error, upToDate
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Listen for update events from main process
    if (window.electronAPI) {
      window.electronAPI.onUpdateChecking(() => {
        setUpdateStatus('checking');
      });

      window.electronAPI.onUpdateAvailable((info) => {
        setUpdateStatus('available');
        setUpdateInfo(info);
      });

      window.electronAPI.onUpdateNotAvailable(() => {
        setUpdateStatus('upToDate');
        setTimeout(() => {
          onUpdateComplete();
        }, 2000);
      });

      window.electronAPI.onUpdateDownloadProgress((progress) => {
        setUpdateStatus('downloading');
        setDownloadProgress(progress.percent);
      });

      window.electronAPI.onUpdateDownloaded(() => {
        setUpdateStatus('installing');
        // Auto-install after 3 seconds
        setTimeout(() => {
          window.electronAPI.restartAndUpdate();
        }, 3000);
      });

      window.electronAPI.onUpdateError((error) => {
        setUpdateStatus('error');
        setError(error.message);
        onUpdateError(error);
      });

      // Start checking for updates
      window.electronAPI.checkForUpdates();
    }

    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeAllUpdateListeners();
      }
    };
  }, [onUpdateComplete, onUpdateError]);

  const handleDownloadUpdate = () => {
    if (window.electronAPI) {
      window.electronAPI.downloadUpdate();
    }
  };

  const handleRetryUpdate = () => {
    setError(null);
    setUpdateStatus('checking');
    if (window.electronAPI) {
      window.electronAPI.checkForUpdates();
    }
  };

  const getStatusIcon = () => {
    switch (updateStatus) {
      case 'checking':
        return '🔍';
      case 'available':
        return '📥';
      case 'downloading':
        return '⬇️';
      case 'installing':
        return '⚙️';
      case 'error':
        return '❌';
      case 'upToDate':
        return '✅';
      default:
        return '🔄';
    }
  };

  const getStatusMessage = () => {
    switch (updateStatus) {
      case 'checking':
        return 'Checking for updates...';
      case 'available':
        return `Update available: v${updateInfo?.version || 'Unknown'}`;
      case 'downloading':
        return `Downloading update... ${Math.round(downloadProgress)}%`;
      case 'installing':
        return 'Installing update and restarting...';
      case 'error':
        return `Update failed: ${error}`;
      case 'upToDate':
        return 'App is up to date!';
      default:
        return 'Initializing updater...';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">{getStatusIcon()}</div>
          <h1 className="text-2xl font-bold text-white mb-2">QuantMind Desktop</h1>
          <p className="text-gray-400">Auto-Update System</p>
        </div>

        {/* Status */}
        <div className="text-center mb-6">
          <p className="text-lg text-white mb-4">{getStatusMessage()}</p>
          
          {/* Progress Bar for Downloads */}
          {updateStatus === 'downloading' && (
            <div className="w-full bg-gray-700 rounded-full h-3 mb-4">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${downloadProgress}%` }}
              ></div>
            </div>
          )}

          {/* Update Info */}
          {updateStatus === 'available' && updateInfo && (
            <div className="bg-gray-700 rounded-lg p-4 mb-4 text-left">
              <h3 className="text-white font-semibold mb-2">Update Details:</h3>
              <p className="text-gray-300 text-sm mb-1">Version: {updateInfo.version}</p>
              <p className="text-gray-300 text-sm mb-1">Size: {Math.round(updateInfo.files?.[0]?.size / 1024 / 1024) || 'Unknown'} MB</p>
              {updateInfo.releaseNotes && (
                <div className="mt-2">
                  <p className="text-gray-300 text-sm font-medium">Release Notes:</p>
                  <p className="text-gray-400 text-xs mt-1">{updateInfo.releaseNotes}</p>
                </div>
              )}
            </div>
          )}

          {/* Error Details */}
          {updateStatus === 'error' && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-4">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-3">
          {updateStatus === 'available' && (
            <button
              onClick={handleDownloadUpdate}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Download Update
            </button>
          )}

          {updateStatus === 'error' && (
            <button
              onClick={handleRetryUpdate}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Retry Update
            </button>
          )}

          {(updateStatus === 'downloading' || updateStatus === 'installing') && (
            <div className="flex items-center space-x-2 text-gray-400">
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              <span>Please wait...</span>
            </div>
          )}
        </div>

        {/* Force Update Notice */}
        <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-700 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-yellow-500">⚠️</span>
            <p className="text-yellow-300 text-sm font-medium">Update Required</p>
          </div>
          <p className="text-yellow-200 text-xs mt-1">
            This update is mandatory. The application will not start without updating to the latest version.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AutoUpdater;