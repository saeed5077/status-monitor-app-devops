import axios from 'axios';

// ALWAYS use relative URLs like /api/auth/login
// Next.js rewrites proxy /api/* → backend internally
// This works in both browser (client-side) and server-side rendering
const api = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token from localStorage on every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Auth API
export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post('/api/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/api/auth/login', data),
  getMe: () => api.get('/api/auth/me'),
};

// Tenant API
export const tenantApi = {
  getMyTenant: () => api.get('/api/tenants/me'),
  updateMyTenant: (data: {
    name?: string;
    logo_url?: string;
    brand_color?: string;
    custom_domain?: string;
  }) => api.put('/api/tenants/me', data),
};

// Monitor API
export const monitorApi = {
  list: () => api.get('/api/monitors'),
  create: (data: { name: string; url: string; check_interval_seconds: number }) =>
    api.post('/api/monitors', data),
  update: (id: string, data: { name?: string; url?: string; check_interval_seconds?: number }) =>
    api.put(`/api/monitors/${id}`, data),
  delete: (id: string) => api.delete(`/api/monitors/${id}`),
  getUptime: (id: string, days?: number) =>
    api.get(`/api/monitors/${id}/uptime${days ? `?days=${days}` : ''}`),
};

// Incident API
export const incidentApi = {
  list: (params?: { status?: string }) => api.get('/api/incidents', { params }),
  create: (data: {
    title: string;
    message?: string;
    severity: string;
    status: string;
    monitor_id?: string;
  }) => api.post('/api/incidents', data),
  update: (id: string, data: { title?: string; message?: string; severity?: string; status?: string }) =>
    api.put(`/api/incidents/${id}`, data),
  delete: (id: string) => api.delete(`/api/incidents/${id}`),
};

// Subscriber API
export const subscriberApi = {
  subscribe: (tenantSlug: string, email: string) =>
    api.post(`/api/subscribers?tenant_slug=${tenantSlug}`, { email }),
  confirm: (token: string) => api.get(`/api/subscribers/confirm/${token}`),
  unsubscribe: (token: string) => api.get(`/api/subscribers/unsubscribe/${token}`),
  list: () => api.get('/api/subscribers'),
};

// Public API
export const publicApi = {
  getStatus: (tenantSlugOrDomain: string) =>
    api.get(`/api/public/${tenantSlugOrDomain}`),
  getHistory: (tenantSlugOrDomain: string, days?: number) =>
    api.get(`/api/public/${tenantSlugOrDomain}/history${days ? `?days=${days}` : ''}`),
};

export default api;