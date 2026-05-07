/**
 * User Service
 * Handles all user-related API calls
 * @see ARCHITECTURE.md - API Layer section
 */

import {
    AuthResponse,
    User,
    UserLoginDTO,
    UserPreferences,
    UserRegisterDTO,
    UserStats,
    UserUpdateDTO,
} from '@/types';
import client from '../client';
import { API_ENDPOINTS } from '../endpoints';

export const userService = {
  /**
   * Get current user profile
   */
  async getProfile(): Promise<User> {
    try {
      const response = await client.get<User>(API_ENDPOINTS.USER.PROFILE);
      return response.data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  },

  /**
   * Update user profile
   */
  async updateProfile(data: UserUpdateDTO): Promise<User> {
    try {
      const response = await client.put<User>(
        API_ENDPOINTS.USER.UPDATE,
        data
      );
      return response.data;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  },

  /**
   * Get user preferences
   */
  async getPreferences(): Promise<UserPreferences> {
    try {
      const response = await client.get<UserPreferences>(
        API_ENDPOINTS.USER.PREFERENCES
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching preferences:', error);
      throw error;
    }
  },

  /**
   * Get user statistics
   */
  async getStats(): Promise<UserStats> {
    try {
      const response = await client.get<UserStats>('/user/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching user stats:', error);
      throw error;
    }
  },

  /**
   * User login
   */
  async login(credentials: UserLoginDTO): Promise<AuthResponse> {
    try {
      const response = await client.post<AuthResponse>(
        API_ENDPOINTS.AUTH.LOGIN,
        credentials
      );
      return response.data;
    } catch (error) {
      console.error('Error logging in:', error);
      throw error;
    }
  },

  /**
   * User registration
   */
  async register(data: UserRegisterDTO): Promise<AuthResponse> {
    try {
      const response = await client.post<AuthResponse>(
        API_ENDPOINTS.AUTH.REGISTER,
        data
      );
      return response.data;
    } catch (error) {
      console.error('Error registering:', error);
      throw error;
    }
  },

  /**
   * User logout
   */
  async logout(): Promise<void> {
    try {
      await client.post(API_ENDPOINTS.AUTH.LOGOUT);
    } catch (error) {
      console.error('Error logging out:', error);
      throw error;
    }
  },
};
