import { API_BASE_URL, API_TIMEOUT } from '@/constants/api';
import axios, { AxiosError, AxiosInstance } from 'axios';

/**
 * Axios instance for API calls
 * Configured with interceptors for authentication and error handling
 */
const client: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor - Add authentication token
 */
client.interceptors.request.use(
  (config) => {
    // TODO: Add auth token from storage
    // const token = getAuthToken();
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

/**
 * Response interceptor - Handle errors globally
 */
client.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - refresh token or logout
      console.error('Unauthorized - redirecting to login');
      // TODO: Dispatch logout action
    }

    if (error.response?.status === 500) {
      console.error('Server error:', error.response.data);
    }

    return Promise.reject(error);
  }
);

export default client;
