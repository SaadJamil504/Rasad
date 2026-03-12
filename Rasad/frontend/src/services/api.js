import axios from 'axios';

const api = axios.create({
  baseURL: 'https://rasad-production.up.railway.app/api/',
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

// Response interceptor for handling token expiration
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await axios.post('https://rasad-production.up.railway.app/api/accounts/login/refresh/', {
          refresh: refreshToken,
        });
        
        const newAccessToken = response.data.access;
        localStorage.setItem('access_token', newAccessToken);
        
        // Update both defaults and the specific request that failed
        api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
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
