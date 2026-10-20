import axios from 'axios';

const rawBase = import.meta.env.VITE_API_URL || '';
const baseURL = rawBase ? `${rawBase.replace(/\/+$/, '')}/api` : '/api';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach JWT token if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('laksh_token') || localStorage.getItem('fitlog_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token on authentication failure
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        localStorage.removeItem('laksh_token');
        localStorage.removeItem('laksh_user');
        localStorage.removeItem('fitlog_token');
        localStorage.removeItem('fitlog_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data) => api.patch('/auth/me', data),
  changePassword: (data) => api.patch('/auth/me/password', data),
};

export const workoutAPI = {
  listWorkouts: (params) => api.get('/workouts', { params }),
  getActiveWorkout: () => api.get('/workouts/active'),
  getWorkout: (id) => api.get(`/workouts/${id}`),
  createWorkout: (data) => api.post('/workouts', data),
  updateWorkout: (id, data) => api.put(`/workouts/${id}`, data),
  finishWorkout: (id) => api.post(`/workouts/${id}/finish`),
  cancelWorkout: (id) => api.post(`/workouts/${id}/cancel`),
  deleteWorkout: (id) => api.delete(`/workouts/${id}`),

  // Workout Exercises
  addExercise: (workoutId, data) => api.post(`/workouts/${workoutId}/exercises`, data),
  deleteExercise: (workoutId, exerciseId) => api.delete(`/workouts/${workoutId}/exercises/${exerciseId}`),

  // Sets
  addSet: (exerciseId, data) => api.post(`/workout-exercises/${exerciseId}/sets`, data),
  updateSet: (setId, data) => api.put(`/sets/${setId}`, data),
  deleteSet: (setId) => api.delete(`/sets/${setId}`),

  // Ghost Data: previous performance for an exercise
  getPreviousSets: (exerciseId) => api.get(`/exercises/${exerciseId}/previous-sets`),

  // Data Export
  exportCSV: () => api.get('/export/csv', { responseType: 'blob' }),
  exportJSON: () => api.get('/export/json', { responseType: 'blob' }),
};

export const templateAPI = {
  listTemplates: () => api.get('/templates'),
  getTemplate: (id) => api.get(`/templates/${id}`),
  createTemplate: (data) => api.post('/templates', data),
  updateTemplate: (id, data) => api.put(`/templates/${id}`, data),
  deleteTemplate: (id) => api.delete(`/templates/${id}`),
  addExercise: (templateId, data) => api.post(`/templates/${templateId}/exercises`, data),
  deleteExercise: (teId) => api.delete(`/template-exercises/${teId}`),
  startWorkout: (templateId) => api.post(`/templates/${templateId}/start`),
};

export const exerciseAPI = {
  listExercises: (params) => api.get('/exercises', { params }),
  getExercise: (id) => api.get(`/exercises/${id}`),
  createExercise: (data) => api.post('/exercises', data),
  updateExercise: (id, data) => api.put(`/exercises/${id}`, data),
  deleteExercise: (id) => api.delete(`/exercises/${id}`),
};

export const activityAPI = {
  getDailyActivity: (date) => api.get('/activity/daily', { params: { activity_date: date } }),
  upsertDailyActivity: (date, data) => api.put(`/activity/daily/${date}`, data),
  getHistory: (params) => api.get('/activity/history', { params }),

  // Google Fit / Health Connect Auto-Sync
  getGoogleFitStatus: () => api.get('/activity/google-fit/status'),
  sendGoogleFitCallback: (code) => api.post('/activity/google-fit/callback', { code }),
  syncGoogleFitSteps: (date) => api.post('/activity/google-fit/sync', null, { params: { activity_date: date } }),
  disconnectGoogleFit: () => api.post('/activity/google-fit/disconnect'),
};

export const hydrationAPI = {
  getDailyHydration: (date) => api.get('/hydration/daily', { params: { target_date: date } }),
  addWaterIntake: (data) => api.post('/hydration/intakes', data),
  deleteWaterIntake: (id) => api.delete(`/hydration/intakes/${id}`),
  getHistory: (params) => api.get('/hydration/history', { params }),
};

export const goalsAPI = {
  getGoals: () => api.get('/goals'),
  updateGoals: (data) => api.put('/goals', data),
};

export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getWorkoutAnalytics: () => api.get('/analytics/workouts'),
  getExerciseProgression: (exerciseId) => api.get(`/analytics/exercises/${exerciseId}/progression`),
  getPersonalRecords: (params) => api.get('/analytics/records/personal-records', { params }),
};

export default api;
