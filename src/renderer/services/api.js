// API utility with automatic token expiry handling

export async function apiRequest(url, options = {}) {
  const token = localStorage.getItem('authToken');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers
  });
  
  // Check for token expiry
  if (response.status === 401 || response.status === 403) {
    const data = await response.json().catch(() => ({}));
    if (data.error === 'Invalid token' || data.error === 'Token expired') {
      // Clear session and notify user
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      localStorage.removeItem('userId');
      
      if (window.appActions) {
        window.appActions.setUser(null);
        window.appActions.addNotification({
          type: 'warning',
          title: 'Session Expired',
          message: 'Your session has expired. Please login again.'
        });
      }
      
      throw new Error('Session expired');
    }
  }
  
  return response;
}
