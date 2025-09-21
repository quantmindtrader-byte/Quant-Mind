import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import BotControl from './components/BotControl';
import Configuration from './components/Configuration';
import RealTimeData from './components/RealTimeData';
import Authentication from './components/Authentication';
import NotificationDisplay from './components/NotificationDisplay';
import AutoUpdater from './components/AutoUpdater';
import { AppProvider } from './context/AppContext';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showUpdater, setShowUpdater] = useState(true);
  const [appStatus, setAppStatus] = useState({
    backend: false,
    agent: false,
    backendPort: 5000,
    wsPort: 8080
  });

  useEffect(() => {
    // Check authentication status
    const token = localStorage.getItem('authToken');
    if (token) {
      setIsAuthenticated(true);
    }

    // Get initial app status and reset bot status on startup
    const checkAppStatus = async () => {
      if (window.electronAPI) {
        try {
          const status = await window.electronAPI.getAppStatus();
          setAppStatus(prev => ({
            ...prev,
            backend: status.backendConnected || true,
            agent: false, // Always start with bot stopped
            backendPort: 5000,
            wsPort: 5000
          }));
        } catch (error) {
          console.error('Failed to get app status:', error);
          setAppStatus(prev => ({
            ...prev,
            backend: false,
            agent: false,
            backendPort: 5000,
            wsPort: 5000
          }));
        }
      }
    };
    
    checkAppStatus();

    // Set up menu action listeners
    if (window.electronAPI) {
      window.electronAPI.onMenuAction((event, action) => {
        handleMenuAction(action);
      });
    }

    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeAllListeners('menu-action');
      }
    };
  }, []);

  const handleMenuAction = (action) => {
    switch (action) {
      case 'new-config':
        setCurrentView('configuration');
        break;
      case 'open-config':
        setCurrentView('configuration');
        break;
      case 'start-bot':
        setCurrentView('bot-control');
        break;
      case 'stop-bot':
        setCurrentView('bot-control');
        break;
      case 'force-reanalysis':
        setCurrentView('bot-control');
        break;
    }
  };

  const handleLogin = async (token, user) => {
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(user));
    setIsAuthenticated(true);
    
    // Fetch user profile with subscription info
    try {
      const response = await fetch('http://127.0.0.1:5000/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const profileData = await response.json();
        if (profileData.success) {
          const userWithSubscription = {
            ...user,
            subscription: {
              plan: profileData.user.role?.name || 'Starter',
              limits: profileData.user.role?.limits || {},
              usage: profileData.user.usage || {}
            }
          };
          
          localStorage.setItem('user', JSON.stringify(userWithSubscription));
          
          // Update AppContext with complete user info
          if (window.appActions) {
            window.appActions.setUser(userWithSubscription);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      // Still proceed with basic user info
      if (window.appActions) {
        window.appActions.setUser(user);
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setCurrentView('dashboard');
  };

  const handleUpdateComplete = () => {
    setShowUpdater(false);
  };

  const handleUpdateError = (error) => {
    console.error('Update error:', error);
    // For now, allow app to continue even if update fails
    setTimeout(() => {
      setShowUpdater(false);
    }, 5000);
  };

  // Show updater first if needed
  if (showUpdater) {
    return (
      <AutoUpdater 
        onUpdateComplete={handleUpdateComplete}
        onUpdateError={handleUpdateError}
      />
    );
  }

  if (!isAuthenticated) {
    return (
      <AppProvider>
        <Authentication onLogin={handleLogin} />
      </AppProvider>
    );
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard appStatus={appStatus} />;
      case 'bot-control':
        return <BotControl appStatus={appStatus} setAppStatus={setAppStatus} />;
      case 'configuration':
        return <Configuration />;
      case 'realtime-data':
        return <RealTimeData appStatus={appStatus} />;
      default:
        return <Dashboard appStatus={appStatus} />;
    }
  };

  return (
    <AppProvider>
      <div className="flex h-screen bg-gray-900">
        <Sidebar 
          currentView={currentView} 
          setCurrentView={setCurrentView}
          onLogout={handleLogout}
          appStatus={appStatus}
        />
        <main className="flex-1 overflow-hidden">
          {renderCurrentView()}
        </main>
        <NotificationDisplay />
      </div>
    </AppProvider>
  );
}

export default App;