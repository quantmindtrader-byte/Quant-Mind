import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import BotControl from './components/BotControl';
import Configuration from './components/Configuration';
import RealTimeData from './components/RealTimeData';
import Authentication from './components/Authentication';
import ToastContainer from './components/Toast';
import { AppProvider, useApp } from './context/AppContext';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [appStatus, setAppStatus] = useState({
    backend: false,
    agent: false,
    backendPort: 5000,
    wsPort: 8080
  });

  useEffect(() => {
    // Check authentication status
    const token = localStorage.getItem('authToken');
    const userId = localStorage.getItem('userId');
    if (token) {
      setIsAuthenticated(true);
    }

    // Poll for token validity every second
    const authCheckInterval = setInterval(() => {
      const currentToken = localStorage.getItem('authToken');
      if (!currentToken && isAuthenticated) {
        setIsAuthenticated(false);
      }
    }, 1000);

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
      clearInterval(authCheckInterval);
      if (window.electronAPI) {
        window.electronAPI.removeAllListeners('menu-action');
      }
    };
  }, [isAuthenticated]);

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
    localStorage.setItem('userId', user.id.toString());
    setIsAuthenticated(true);
    

    
    // Fetch user profile with subscription info
    try {
      const response = await fetch('http://74.162.152.95/api/user/profile', {
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

  const handleLogout = async () => {
    // Log logout activity
    try {
      const token = localStorage.getItem('authToken');
      await fetch('http://74.162.152.95/api/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (error) {
      console.error('Failed to log logout:', error);
    }
    
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('userId');
    setIsAuthenticated(false);
    setCurrentView('dashboard');
  };

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
      <AppContent 
        currentView={currentView}
        setCurrentView={setCurrentView}
        handleLogout={handleLogout}
        appStatus={appStatus}
        renderCurrentView={renderCurrentView}
      />
    </AppProvider>
  );
}

function AppContent({ currentView, setCurrentView, handleLogout, appStatus, renderCurrentView }) {
  const { state, actions } = useApp();

  return (
    <>
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
      </div>
      <ToastContainer 
        notifications={state.notifications} 
        onClose={actions.removeNotification}
      />
    </>
  );
}

export default App;