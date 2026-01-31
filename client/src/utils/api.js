import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API functions
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
};

export const donorAPI = {
  getProfile: () => api.get('/profile'),
  updateProfile: (data) => api.put('/profile', data),
  getMyMatches: () => api.get('/my-matches'),
  updateMatch: (matchId, data) => api.put(`/matches/${matchId}`, data),
  getDonationHistory: (donorId) => api.get(`/donation-history/${donorId}`),
  completeDonation: (matchId) => api.put(`/matches/${matchId}/complete`),
};

export const hospitalAPI = {
  getRequests: () => api.get('/blood-requests'),
  createRequest: (data) => api.post('/blood-requests', data),
  getDonors: (params) => api.get('/donors', { params }),
  contactDonor: (donorId) => api.post(`/contact-donor/${donorId}`),
  getRequestDonors: (requestId) => api.get(`/requests/${requestId}/donors`),
  recordDonation: (data) => api.post('/donation-history', data),
};

export const adminAPI = {
  // Dashboard & Statistics
  getStats: () => api.get('/dashboard/stats'),
  getDashboardStats: () => api.get('/admin/dashboard-stats'),
  getDetailedStats: () => api.get('/admin/statistics'),
  
  // User Management
  getUsers: () => api.get('/admin/users'),
  addUser: (data) => api.post('/admin/users', data),
  updateUser: (userId, data) => api.put(`/admin/users/${userId}`, data),
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),
  toggleUserStatus: (userId, data) => api.put(`/admin/users/${userId}/status`, data),
  
  // Donor Management
  getAllDonors: () => api.get('/donors'),
  getDonor: (donorId) => api.get(`/donors/${donorId}`),
  addDonor: (data) => api.post('/admin/donors', data),
  updateDonor: (donorId, data) => api.put(`/donors/${donorId}`, data),
  deleteDonor: (donorId) => api.delete(`/admin/donors/${donorId}`),
  
  // Hospital Management
  getHospitals: () => api.get('/hospitals'),
  addHospital: (data) => api.post('/admin/hospitals', data),
  updateHospital: (hospitalId, data) => api.put(`/admin/hospitals/${hospitalId}`, data),
  deleteHospital: (hospitalId) => api.delete(`/admin/hospitals/${hospitalId}`),
  
  // Blood Requests Management
  getAllRequests: (params) => api.get('/admin/requests', { params }),
  createRequest: (data) => api.post('/blood-requests', data),
  
  // Donation Management
  getAllDonations: (params) => api.get('/admin/donations', { params }),
  getDonationHistory: (donorId) => api.get(`/donation-history/${donorId}`),
  
  // System Management
  clearOldRequests: () => api.post('/admin/clear-old-requests'),
  generateReport: () => api.get('/admin/generate-report'),
  backupDatabase: () => api.post('/admin/backup-database'),
  
  // Blood Groups
  getBloodGroups: () => api.get('/blood-groups'),
};

// General API calls
export const generalAPI = {
  testDB: () => api.get('/test-db'),
  health: () => api.get('/health'),
  test: () => api.get('/test'),
};

export default api;