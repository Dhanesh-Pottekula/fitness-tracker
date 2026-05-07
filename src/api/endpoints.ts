/**
 * API Endpoints
 * Centralized list of all API routes
 */

export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
  },

  // User
  USER: {
    PROFILE: '/user/profile',
    UPDATE: '/user/profile',
    PREFERENCES: '/user/preferences',
  },

  // Workouts
  WORKOUT: {
    LIST: '/workouts',
    CREATE: '/workouts',
    GET: (id: string) => `/workouts/${id}`,
    UPDATE: (id: string) => `/workouts/${id}`,
    DELETE: (id: string) => `/workouts/${id}`,
    BY_DATE: (date: string) => `/workouts/date/${date}`,
  },

  // Stats
  STATS: {
    OVERVIEW: '/stats/overview',
    BY_PERIOD: (period: string) => `/stats/period/${period}`,
    CALORIES: '/stats/calories',
    DURATION: '/stats/duration',
  },

  // Exercises
  EXERCISE: {
    LIST: '/exercises',
    GET: (id: string) => `/exercises/${id}`,
  },
} as const;
