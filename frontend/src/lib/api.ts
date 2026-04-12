import axios, { AxiosInstance } from 'axios';
import { useAuthStore } from '../store/auth.store';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Request interceptor — attach access token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401, refresh tokens
let isRefreshing = false;
let failedQueue: Array<{ resolve: (val: any) => void; reject: (err: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            return api(original);
          })
          .catch((err) => Promise.reject(err));
      }

      original._retry = true;
      isRefreshing = true;

      const refreshToken = useAuthStore.getState().refreshToken;
      if (!refreshToken) {
        useAuthStore.getState().logout();
        isRefreshing = false;
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefresh } = res.data;

        useAuthStore.getState().setAuth(
          useAuthStore.getState().user!,
          accessToken,
          newRefresh,
        );

        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        processQueue(null, accessToken);

        return api(original);
      } catch (err) {
        processQueue(err, null);
        useAuthStore.getState().logout();
        window.location.href = '/auth/login';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// ─── API methods ─────────────────────────────────────────────────────────────

export const authApi = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  verifyOtp: (data: any) => api.post('/auth/verify-otp', data),
  refresh: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),
  me: () => api.get('/auth/me'),
};

export const usersApi = {
  me: () => api.get('/users/me'),
  myClubs: () => api.get('/users/me/clubs'),
  updateMe: (data: any) => api.patch('/users/me', data),
  updatePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.patch('/users/me/password', data),
  sessions: () => api.get('/users/sessions'),
  revokeSession: (id: string) => api.delete(`/users/sessions/${id}`),
};

export const eventsApi = {
  list: (params?: any) => api.get('/events', { params }),
  get: (slug: string) => api.get(`/events/${slug}`),
  create: (data: any) => api.post('/events', data),
  update: (id: string, data: any) => api.put(`/events/${id}`, data),
  publish: (id: string) => api.patch(`/events/${id}/publish`),
  reject: (id: string, note?: string) => api.patch(`/events/${id}/reject`, { note }),
  live: () => api.get('/events/live'),
  trending: () => api.get('/events/trending'),
  stats: () => api.get('/events/stats'),
  markAttendance: (eventId: string, qrCode: string) =>
    api.post(`/events/${eventId}/attendance`, { qrCode }),
};

export const seatsApi = {
  getSeatMap: (eventId: string, sessionId?: string) =>
    api.get(`/events/${eventId}/seats`, { params: sessionId ? { sessionId } : undefined }),
  getEventSessions: (eventId: string) => api.get(`/events/${eventId}/seats/sessions`),
  holdSeat: (eventId: string, seatId: string, sessionId?: string) =>
    api.post(`/events/${eventId}/seats/hold`, { seatId, sessionId }),
  confirmBooking: (eventId: string, seatId: string) =>
    api.post(`/events/${eventId}/seats/confirm`, { seatId }),
  joinWaitlist: (eventId: string, sessionId?: string) =>
    api.post(`/events/${eventId}/seats/waitlist`, { sessionId }),
  releaseSeat: (eventId: string, seatId: string) =>
    api.post(`/events/${eventId}/seats/release`, { seatId }),
};

export const bookingsApi = {
  my: () => api.get('/bookings/my'),
  eventRegistrations: (eventId: string) => api.get(`/bookings/event/${eventId}/registrations`),
  exportEventRegistrations: (eventId: string) => api.get(`/bookings/event/${eventId}/export`),
  bookFree: (sessionId: string, seatId?: string) =>
    api.post('/bookings/free', { sessionId, seatId }),
  createOrder: (sessionId: string, seatId?: string) =>
    api.post('/bookings/create-order', { sessionId, seatId }),
  verifyPayment: (data: { bookingId: string; razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) =>
    api.post('/bookings/verify-payment', data),
  myBookings: () => api.get('/bookings/my'),
  cancel: (bookingId: string, reason?: string) =>
    api.post(`/bookings/${bookingId}/cancel`, { reason }),
  checkIn: (qrToken: string) =>
    api.post('/checkin', { qrToken }),
  getRegistrations: (eventId: string) =>
    api.get(`/bookings/event/${eventId}/registrations`),
  exportRegistrations: (eventId: string) =>
    api.get(`/bookings/event/${eventId}/export`),
};

export const clubsApi = {
  list: (params?: any) => api.get('/clubs', { params }),
  get: (slug: string) => api.get(`/clubs/${slug}`),
  create: (data: any) => api.post('/clubs', data),
  update: (id: string, data: any) => api.put(`/clubs/${id}`, data),
  join: (id: string) => api.post(`/clubs/${id}/join`),
  leave: (id: string) => api.post(`/clubs/${id}/leave`),
  categories: () => api.get('/clubs/categories'),
  presidentDashboard: () => api.get('/clubs/president/dashboard'),
  healthScore: (id: string) => api.get(`/clubs/${id}/health-score`),
};

export const leaderboardApi = {
  students: (campus?: string) => api.get('/leaderboard/students', { params: { campus } }),
  clubs: (campus?: string) => api.get('/leaderboard/clubs', { params: { campus } }),
  campuses: () => api.get('/leaderboard/campuses'),
  myRank: () => api.get('/leaderboard/my-rank'),
  history: () => api.get('/leaderboard/points-history'),
};

export const focApi = {
  myActivities: (semester?: string) => api.get('/foc/my-activities', { params: { semester } }),
  progress: () => api.get('/foc/progress'),
  submit: (data: any) => api.post('/foc/submit', data),
  report: (semester: string) => api.get(`/foc/report/${encodeURIComponent(semester)}`),
  pending: () => api.get('/foc/pending-approvals'),
  clubActivities: () => api.get('/foc/club-activities'),
  bulkApprove: (ids: string[], note?: string) => api.post('/foc/bulk-approve', { ids, note }),
  bulkReject: (ids: string[], note: string) => api.post('/foc/bulk-reject', { ids, note }),
  approve: (id: string, note?: string) => api.patch(`/foc/${id}/approve`, { note }),
  reject: (id: string, note: string) => api.patch(`/foc/${id}/reject`, { note }),
};

export const collaborationApi = {
  tasks: (clubId?: string) => api.get('/collaboration/tasks', { params: { clubId } }),
  createTask: (data: any) => api.post('/collaboration/tasks', data),
  updateTaskStatus: (taskId: string, status: string, clubId?: string, completionNote?: string) => api.patch(`/collaboration/tasks/${taskId}/status`, { status, clubId, completionNote }),
  channels: (clubId?: string) => api.get('/collaboration/channels', { params: { clubId } }),
  messages: (channelId: string, clubId?: string) => api.get(`/collaboration/channels/${channelId}/messages`, { params: { clubId } }),
  postMessage: (channelId: string, text: string, clubId?: string) => api.post(`/collaboration/channels/${channelId}/messages`, { text, clubId }),
  meetings: (clubId?: string) => api.get('/collaboration/meetings', { params: { clubId } }),
  createMeeting: (data: any) => api.post('/collaboration/meetings', data),
};

export const portfolioApi = {
  me: () => api.get('/portfolio/me'),
  resume: () => api.get('/portfolio/me/resume'),
  public: (userId: string) => api.get(`/portfolio/${userId}/public`),
  updateProfile: (data: any) => api.put('/portfolio/profile', data),
  updateSkills: (data: any) => api.put('/portfolio/skills', data),
};

export const aiApi = {
  recommendations: () => api.get('/ai/recommendations'),
  chat: (message: string, campus?: string) => api.post('/ai/chat', { query: message, message, campus }),
  extractPoster: (imageBase64: string) => api.post('/ai/extract-poster', { imageBase64 }),
  detectConflicts: (data: any) => api.post('/ai/detect-conflicts', data),
  search: (q: string, campus?: string) => api.get('/ai/search', { params: { q, campus } }),
};

export const adminApi = {
  overview: () => api.get('/admin/overview'),
  users: (params?: any) => api.get('/admin/users', { params }),
  campusAnalytics: () => api.get('/admin/campus-analytics'),
  seatUtilization: () => api.get('/admin/seat-utilization'),
  fraud: () => api.get('/admin/fraud-detection'),
  report: (reportId: string, params?: any) => api.get(`/admin/reports/${reportId}`, { params }),
  toggleUser: (id: string) => api.patch(`/admin/users/${id}/toggle`),
  createAnnouncement: (data: any) => api.post('/admin/announcements', data),
  announcements: (campus?: string) => api.get('/admin/announcements', { params: { campus } }),
};

// ─── New v2 APIs ──────────────────────────────────────────────

export const achievementsApi = {
  mine: () => api.get('/achievements/me'),
  leaderboard: () => api.get('/achievements/leaderboard'),
};

export const venuesApi = {
  list: (campus?: string) => api.get('/venues', { params: { campus } }),
  get: (id: string) => api.get(`/venues/${id}`),
};

export const notificationsApi = {
  list: () => api.get('/users/notifications'),
  markAllRead: () => api.patch('/users/notifications/read-all'),
};
