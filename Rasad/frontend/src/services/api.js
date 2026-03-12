import axios from 'axios';

const api = axios.create({
  baseURL: 'https://rasad-production.up.railway.app/api/',
  timeout: 15000, // 15 seconds timeout for slow Railway instances
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Set up refresh state
let isRefreshing = false;
let refreshQueue = [];

const processQueue = (error, token = null) => {
  refreshQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  refreshQueue = [];
};

// Response interceptor for handling token expiration
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle Connection Timeout
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      console.error('[API] Backend Connection Timeout. Railway might be slow.');
      return Promise.reject(new Error('Backend server is taking too long to respond. Please try again.'));
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      // Check for "user_not_found" error which happens if database is reset
      const errorData = error.response.data;
      if (errorData.code === 'user_not_found' || (typeof errorData.detail === 'string' && errorData.detail.includes('not found'))) {
        console.warn('[API] Current user not found in database. Logging out.');
        localStorage.clear();
        window.location.href = '/login?error=account_deleted';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        console.log('[API] Token refresh already in progress, queueing request...');
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;
      console.log('[API] Access Token expired. Attempting refresh...');

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) throw new Error('No refresh token available');

        const response = await axios.post('https://rasad-production.up.railway.app/api/accounts/login/refresh/', {
          refresh: refreshToken,
        }, { timeout: 10000 });
        
        const newAccessToken = response.data.access;
        localStorage.setItem('access_token', newAccessToken);
        console.log('[API] Token refresh successful. Retrying original request.');
        
        api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        
        processQueue(null, newAccessToken);
        return api(originalRequest);
      } catch (refreshError) {
        console.error('[API] Token refresh failed:', refreshError);
        processQueue(refreshError, null);
        
        // Handle "user_not_found" during refresh too
        const isUserGone = refreshError.response?.data?.code === 'user_not_found' || 
                           refreshError.response?.data?.detail?.includes('not found');

        if (!window.location.pathname.includes('/login')) {
          localStorage.clear();
          window.location.href = isUserGone ? '/login?error=account_deleted' : '/login?session_expired=true';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);



export const authAPI = {
  login: (data) => api.post('accounts/login/', data),
  signup: (data) => api.post('accounts/signup/', data),
  invitationSignup: (data) => api.post('accounts/invitations/signup/', data),
  validateToken: (token) => api.get(`accounts/invitations/validate/${token}/`),
};

export const invitationAPI = {
  invite: (data) => api.post('accounts/invitations/', data),
  getInvitations: () => api.get('accounts/invitations/'),
};

export const staffAPI = {
  getStaff: (role) => api.get('accounts/staff/', { params: { role } }),
};

export const routeAPI = {
  getRoutes: () => api.get('accounts/routes/'),
  createRoute: (data) => api.post('accounts/routes/', data),
  updateRoute: (id, data) => api.put(`accounts/routes/${id}/`, data),
  deleteRoute: (id) => api.delete(`accounts/routes/${id}/`),
};

export default api;
