import React, { createContext, useContext, useReducer, useEffect } from 'react';

const AppContext = createContext();

const initialState = {
  user: null,
  config: {},
  logs: [],
  tradingStatus: 'stopped',
  realTimeData: [],
  notifications: [],
  wsConnection: null,
  logsFetching: false
};

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_CONFIG':
      return { ...state, config: action.payload };
    case 'ADD_LOG':
      return { 
        ...state, 
        logs: [...state.logs.slice(-999), action.payload] // Keep last 1000 logs
      };
    case 'SET_TRADING_STATUS':
      return { ...state, tradingStatus: action.payload };
    case 'ADD_REALTIME_DATA':
      return { 
        ...state, 
        realTimeData: [...state.realTimeData.slice(-499), action.payload] // Keep last 500 entries
      };
    case 'ADD_NOTIFICATION':
      return { 
        ...state, 
        notifications: [...state.notifications, { 
          id: Date.now(), 
          timestamp: new Date().toISOString(),
          ...action.payload 
        }]
      };
    case 'REMOVE_NOTIFICATION':
      return { 
        ...state, 
        notifications: state.notifications.filter(n => n.id !== action.payload)
      };
    case 'SET_WS_CONNECTION':
      return { ...state, wsConnection: action.payload };
    case 'CLEAR_LOGS':
      return { ...state, logs: [] };
    case 'SET_LOGS':
      return { ...state, logs: action.payload };
    case 'SET_LOGS_FETCHING':
      return { ...state, logsFetching: action.payload };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Fetch logs from API
  const fetchLogs = async () => {
    try {
      dispatch({ type: 'SET_LOGS_FETCHING', payload: true });
      const response = await fetch('http://127.0.0.1:5000/api/logs');
      if (response.ok) {
        const data = await response.json();
        dispatch({ type: 'SET_LOGS', payload: data.logs || [] });
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      dispatch({ type: 'SET_LOGS_FETCHING', payload: false });
    }
  };

  useEffect(() => {
    // Load user from localStorage
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      dispatch({ type: 'SET_USER', payload: JSON.parse(savedUser) });
    }
    
    // Make actions available globally for App.jsx
    window.appActions = actions;

    // Load config from localStorage
    const savedConfig = localStorage.getItem('tradingConfig');
    if (savedConfig) {
      dispatch({ type: 'SET_CONFIG', payload: JSON.parse(savedConfig) });
    }

    // Fetch logs initially
    fetchLogs();
    
    // Fetch user profile initially and refresh subscription info
    fetchUserProfile();

    // Set up polling for logs every 3 seconds
    const logInterval = setInterval(fetchLogs, 3000);
    
    // Set up polling for user profile every 60 seconds to refresh subscription
    const profileInterval = setInterval(fetchUserProfile, 60000);

    // Set up Electron API listeners
    if (window.electronAPI) {
      window.electronAPI.onBackendLog((event, data) => {
        dispatch({ 
          type: 'ADD_LOG', 
          payload: { 
            type: 'backend', 
            message: data, 
            timestamp: new Date().toISOString() 
          }
        });
      });

      window.electronAPI.onAgentLog((event, data) => {
        dispatch({ 
          type: 'ADD_LOG', 
          payload: { 
            type: 'agent', 
            message: data, 
            timestamp: new Date().toISOString() 
          }
        });
        
        // Parse real-time data from agent logs
        try {
          if (data.includes('💰') || data.includes('📊') || data.includes('🏆')) {
            dispatch({ 
              type: 'ADD_REALTIME_DATA', 
              payload: { 
                message: data, 
                timestamp: new Date().toISOString() 
              }
            });
          }
        } catch (error) {
          console.error('Error parsing real-time data:', error);
        }
      });

      window.electronAPI.onBackendError((event, data) => {
        dispatch({ 
          type: 'ADD_LOG', 
          payload: { 
            type: 'error', 
            message: data, 
            timestamp: new Date().toISOString() 
          }
        });
        dispatch({ 
          type: 'ADD_NOTIFICATION', 
          payload: { 
            type: 'error', 
            title: 'Backend Error', 
            message: data.substring(0, 100) + '...' 
          }
        });
      });

      window.electronAPI.onAgentError((event, data) => {
        dispatch({ 
          type: 'ADD_LOG', 
          payload: { 
            type: 'error', 
            message: data, 
            timestamp: new Date().toISOString() 
          }
        });
        dispatch({ 
          type: 'ADD_NOTIFICATION', 
          payload: { 
            type: 'error', 
            title: 'Trading Agent Error', 
            message: data.substring(0, 100) + '...' 
          }
        });
      });
    }

    return () => {
      clearInterval(logInterval);
      clearInterval(profileInterval);
      delete window.appActions;
      if (window.electronAPI) {
        window.electronAPI.removeAllListeners('backend-log');
        window.electronAPI.removeAllListeners('agent-log');
        window.electronAPI.removeAllListeners('backend-error');
        window.electronAPI.removeAllListeners('agent-error');
      }
    };
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://127.0.0.1:5000/api/user/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const dashboardData = await response.json();
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const userWithSubscription = {
          ...currentUser,
          subscription: {
            plan: dashboardData.plan?.name || 'Free',
            limits: dashboardData.daily_limits || {},
            usage: dashboardData.usage || {}
          }
        };
        
        localStorage.setItem('user', JSON.stringify(userWithSubscription));
        dispatch({ type: 'SET_USER', payload: userWithSubscription });
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  };

  const actions = {
    setUser: (user) => dispatch({ type: 'SET_USER', payload: user }),
    setConfig: (config) => {
      dispatch({ type: 'SET_CONFIG', payload: config });
      localStorage.setItem('tradingConfig', JSON.stringify(config));
    },
    addLog: (log) => dispatch({ type: 'ADD_LOG', payload: log }),
    setTradingStatus: (status) => dispatch({ type: 'SET_TRADING_STATUS', payload: status }),
    addRealTimeData: (data) => dispatch({ type: 'ADD_REALTIME_DATA', payload: data }),
    addNotification: (notification) => dispatch({ type: 'ADD_NOTIFICATION', payload: notification }),
    removeNotification: (id) => dispatch({ type: 'REMOVE_NOTIFICATION', payload: id }),
    setWsConnection: (connection) => dispatch({ type: 'SET_WS_CONNECTION', payload: connection }),
    clearLogs: () => dispatch({ type: 'CLEAR_LOGS' }),
    fetchLogs: fetchLogs,
    fetchUserProfile: fetchUserProfile
  };

  return (
    <AppContext.Provider value={{ state, actions }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}