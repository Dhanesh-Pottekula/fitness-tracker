/**
 * Workout Service
 * Handles all workout-related API calls
 * @see ARCHITECTURE.md - API Layer section
 */

import {
    Workout,
    WorkoutCreateDTO,
    WorkoutFilters,
    WorkoutUpdateDTO,
} from '@/types';
import client from '../client';
import { API_ENDPOINTS } from '../endpoints';

export const workoutService = {
  /**
   * Fetch all workouts for the current user
   */
  async getWorkouts(): Promise<Workout[]> {
    try {
      const response = await client.get<Workout[]>(API_ENDPOINTS.WORKOUT.LIST);
      return response.data;
    } catch (error) {
      console.error('Error fetching workouts:', error);
      throw error;
    }
  },

  /**
   * Fetch a specific workout by ID
   */
  async getWorkout(id: string): Promise<Workout> {
    try {
      const response = await client.get<Workout>(API_ENDPOINTS.WORKOUT.GET(id));
      return response.data;
    } catch (error) {
      console.error('Error fetching workout:', error);
      throw error;
    }
  },

  /**
   * Create a new workout
   */
  async createWorkout(data: WorkoutCreateDTO): Promise<Workout> {
    try {
      const response = await client.post<Workout>(
        API_ENDPOINTS.WORKOUT.CREATE,
        data
      );
      return response.data;
    } catch (error) {
      console.error('Error creating workout:', error);
      throw error;
    }
  },

  /**
   * Update an existing workout
   */
  async updateWorkout(id: string, data: WorkoutUpdateDTO): Promise<Workout> {
    try {
      const response = await client.put<Workout>(
        API_ENDPOINTS.WORKOUT.UPDATE(id),
        data
      );
      return response.data;
    } catch (error) {
      console.error('Error updating workout:', error);
      throw error;
    }
  },

  /**
   * Delete a workout
   */
  async deleteWorkout(id: string): Promise<void> {
    try {
      await client.delete(API_ENDPOINTS.WORKOUT.DELETE(id));
    } catch (error) {
      console.error('Error deleting workout:', error);
      throw error;
    }
  },

  /**
   * Fetch workouts for a specific date
   */
  async getWorkoutsByDate(date: Date): Promise<Workout[]> {
    try {
      const dateStr = date.toISOString().split('T')[0];
      const response = await client.get<Workout[]>(
        API_ENDPOINTS.WORKOUT.BY_DATE(dateStr)
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching workouts by date:', error);
      throw error;
    }
  },

  /**
   * Filter workouts based on criteria
   */
  async filterWorkouts(filters: WorkoutFilters): Promise<Workout[]> {
    try {
      const response = await client.get<Workout[]>(API_ENDPOINTS.WORKOUT.LIST, {
        params: filters,
      });
      return response.data;
    } catch (error) {
      console.error('Error filtering workouts:', error);
      throw error;
    }
  },
};
