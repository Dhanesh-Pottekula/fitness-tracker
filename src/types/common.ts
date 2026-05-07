/**
 * Common/Shared Types
 */

export type Intensity = 'low' | 'medium' | 'high';
export type ExerciseType = 'strength' | 'cardio' | 'flexibility' | 'sports';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Async State Wrapper
 * Use this to type loading/error states in Redux
 */
export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}
