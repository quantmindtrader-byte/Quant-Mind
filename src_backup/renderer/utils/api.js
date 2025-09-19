// API utility for desktop app
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000';

// Configure axios instance with debug logging
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor for debugging
axiosInstance.interceptors.request.use(
  (config) => {
    console.log(`[AXIOS DEBUG] Outgoing request:`, {
      url: config.url,
      method: config.method,
      baseURL: config.baseURL,
      headers: config.headers,
      timeout: config.timeout
    });
    return config;
  },
  (error) => {
    console.error(`[AXIOS DEBUG] Request interceptor error:`, error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
axiosInstance.interceptors.response.use(
  (response) => {
    console.log(`[AXIOS DEBUG] Response received:`, {
      status: response.status,
      statusText: response.statusText,
      url: response.config.url,
      headers: response.headers
    });
    return response;
  },
  (error) => {
    console.error(`[AXIOS DEBUG] Response interceptor error:`, {
      message: error.message,
      code: error.code,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      } : 'No response',
      request: error.request ? 'Request made but no response' : 'No request'
    });
    return Promise.reject(error);
  }
);

// Test backend connection with detailed logging
const testConnection = async () => {
  console.log('[CONNECTION TEST] Starting backend connection test...');
  console.log('[CONNECTION TEST] Target URL:', `${API_BASE_URL}/api/test`);
  
  try {
    const startTime = Date.now();
    const response = await axiosInstance.get('/api/test');
    const duration = Date.now() - startTime;
    
    console.log('[CONNECTION TEST] Success!', {
      status: response.status,
      duration: `${duration}ms`,
      data: response.data
    });
    
    return response.status === 200;
  } catch (error) {
    console.error('[CONNECTION TEST] Failed!');
    console.error('[CONNECTION TEST] Error type:', error.constructor.name);
    console.error('[CONNECTION TEST] Error message:', error.message);
    console.error('[CONNECTION TEST] Error code:', error.code);
    
    if (error.response) {
      console.error('[CONNECTION TEST] Server responded with error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    } else if (error.request) {
      console.error('[CONNECTION TEST] No response received:', {
        readyState: error.request.readyState,
        status: error.request.status,
        responseURL: error.request.responseURL
      });
    }
    
    // Specific XHR poll error detection
    if (error.message && error.message.toLowerCase().includes('xhr poll')) {
      console.error('[CONNECTION TEST] XHR POLL ERROR DETECTED!');
      console.error('[CONNECTION TEST] This usually means:');
      console.error('[CONNECTION TEST] 1. Backend CORS is not properly configured');
      console.error('[CONNECTION TEST] 2. WebSocket/Socket.IO connection is failing');
      console.error('[CONNECTION TEST] 3. Network firewall is blocking the connection');
      console.error('[CONNECTION TEST] 4. Backend server is overloaded or not responding');
    }
    
    return false;
  }
};

// Export test function
export { testConnection };

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    console.log('[API CLIENT] Initialized with baseURL:', this.baseURL);
  }

  getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  }

  async request(endpoint, options = {}) {
    const startTime = Date.now();
    console.log(`[API DEBUG] Starting request to ${endpoint}`, {
      method: options.method || 'GET',
      headers: this.getAuthHeaders(),
      timestamp: new Date().toISOString()
    });
    
    try {
      const config = {
        url: endpoint,
        method: options.method || 'GET',
        headers: {
          ...this.getAuthHeaders(),
          ...options.headers
        },
        timeout: 10000,
        ...options
      };

      if (options.data) {
        config.data = options.data;
      }

      console.log(`[API DEBUG] Request config:`, config);
      const response = await axiosInstance.request(config);
      
      const duration = Date.now() - startTime;
      console.log(`[API DEBUG] Request successful to ${endpoint}`, {
        status: response.status,
        duration: `${duration}ms`,
        dataSize: JSON.stringify(response.data).length
      });
      
      // Handle different response types
      if (options.responseType === 'blob') {
        return response;
      }

      return response.data;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[API DEBUG] Request failed to ${endpoint} after ${duration}ms`);
      console.error(`[API DEBUG] Error details:`, {
        message: error.message,
        code: error.code,
        errno: error.errno,
        syscall: error.syscall,
        address: error.address,
        port: error.port,
        stack: error.stack
      });
      
      // Handle axios errors with detailed logging
      if (error.response) {
        console.error(`[API DEBUG] Server error response:`, {
          status: error.response.status,
          statusText: error.response.statusText,
          headers: error.response.headers,
          data: error.response.data
        });
        
        if (error.response.status === 401) {
          console.log(`[API DEBUG] Unauthorized - clearing auth tokens`);
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          window.location.reload();
        }
        throw new Error(`Server Error: ${error.response.status} - ${error.response.data?.error || error.response.statusText}`);
      } else if (error.request) {
        console.error(`[API DEBUG] Network error - no response received:`, {
          request: error.request,
          readyState: error.request.readyState,
          status: error.request.status,
          responseText: error.request.responseText
        });
        
        // Check specific network error types
        if (error.code === 'ECONNREFUSED') {
          throw new Error('Connection refused - Backend server is not running on localhost:5000');
        } else if (error.code === 'ENOTFOUND') {
          throw new Error('DNS lookup failed - Cannot resolve localhost');
        } else if (error.code === 'ETIMEDOUT') {
          throw new Error('Connection timeout - Backend server is not responding');
        } else if (error.message.includes('xhr poll error')) {
          throw new Error('XHR Poll Error - WebSocket/polling connection failed. Check if backend supports CORS and WebSocket connections.');
        } else {
          throw new Error(`Network Error: ${error.code || 'UNKNOWN'} - Cannot connect to backend server`);
        }
      } else {
        console.error(`[API DEBUG] Request setup error:`, error.message);
        throw new Error(`Request Error: ${error.message}`);
      }
    }
  }

  async get(endpoint, options = {}) {
    return this.request(endpoint, { method: 'GET', ...options });
  }

  async post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      data: data,
      ...options,
    });
  }

  async put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      data: data,
      ...options,
    });
  }

  async delete(endpoint, options = {}) {
    return this.request(endpoint, { method: 'DELETE', ...options });
  }
}

export default new ApiClient();