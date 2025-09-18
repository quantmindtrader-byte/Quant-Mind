import React, { useState, useEffect } from 'react';

const UpdateNotification = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    // Listen for update events from main process
    if (window.electronAPI) {
      window.electronAPI.onUpdateAvailable((info) => {
        setUpdateAvailable(true);
        setUpdateInfo(info);
      });

      window.electronAPI.onUpdateDownloading((progress) => {
        setDownloading(true);
        setDownloadProgress(progress.percent);
      });

      window.electronAPI.onUpdateReady(() => {
        setDownloading(false);
        setUpdateReady(true);
      });
    }
  }, []);

  const handleCheckForUpdates = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.checkForUpdates();
      if (!result.success) {
        console.error('Update check failed:', result.error);
      }
    }
  };

  const handleInstallUpdate = () => {
    if (window.electronAPI) {
      window.electronAPI.quitAndInstall();
    }
  };

  if (updateReady) {
    return (
      <div className="fixed top-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold">Update Ready!</h4>
            <p className="text-sm">Restart to apply the update</p>
          </div>
          <button
            onClick={handleInstallUpdate}
            className="ml-4 bg-white text-green-500 px-3 py-1 rounded text-sm font-medium hover:bg-gray-100"
          >
            Restart Now
          </button>
        </div>
      </div>
    );
  }

  if (downloading) {
    return (
      <div className="fixed top-4 right-4 bg-blue-500 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm">
        <div>
          <h4 className="font-semibold">Downloading Update...</h4>
          <div className="mt-2">
            <div className="bg-blue-300 rounded-full h-2">
              <div 
                className="bg-white h-2 rounded-full transition-all duration-300"
                style={{ width: `${downloadProgress}%` }}
              ></div>
            </div>
            <p className="text-xs mt-1">{Math.round(downloadProgress)}% complete</p>
          </div>
        </div>
      </div>
    );
  }

  if (updateAvailable) {
    return (
      <div className="fixed top-4 right-4 bg-yellow-500 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold">Update Available</h4>
            <p className="text-sm">Version {updateInfo?.version} is ready</p>
          </div>
          <button
            onClick={() => setUpdateAvailable(false)}
            className="ml-4 text-white hover:text-gray-200"
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleCheckForUpdates}
      className="fixed bottom-4 right-4 bg-gray-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors"
    >
      Check for Updates
    </button>
  );
};

export default UpdateNotification;