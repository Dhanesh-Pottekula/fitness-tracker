/**
 * Error Messages
 * Centralized error messages for consistency
 */

export const ERROR_MESSAGES = {
  NETWORK: 'Network error. Please check your connection.',
  TIMEOUT: 'Request timeout. Please try again.',
  SERVER: 'Server error. Please try again later.',
  UNAUTHORIZED: 'Unauthorized. Please login again.',
  NOT_FOUND: 'Resource not found.',
  VALIDATION: 'Please check your input and try again.',
  UNKNOWN: 'An unexpected error occurred.',

  WORKOUT: {
    CREATE_FAILED: 'Failed to create workout.',
    UPDATE_FAILED: 'Failed to update workout.',
    DELETE_FAILED: 'Failed to delete workout.',
    FETCH_FAILED: 'Failed to fetch workouts.',
  },

  USER: {
    LOGIN_FAILED: 'Login failed. Please try again.',
    LOGOUT_FAILED: 'Logout failed.',
    UPDATE_FAILED: 'Failed to update profile.',
    FETCH_FAILED: 'Failed to fetch user profile.',
  },
} as const;
