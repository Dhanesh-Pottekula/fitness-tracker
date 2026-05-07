/**
 * Stats Service
 * Handles all statistics-related API calls
 * @see ARCHITECTURE.md - API Layer section
 */

import { DailyStats, StatsOverview, StatsPeriod, WorkoutStats } from '@/types';
import client from '../client';
import { API_ENDPOINTS } from '../endpoints';

export const statsService = {
  /**
   * Get overall stats overview
   */
  async getOverview(): Promise<StatsOverview> {
    try {
      const response = await client.get<StatsOverview>(
        API_ENDPOINTS.STATS.OVERVIEW
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching stats overview:', error);
      throw error;
    }
  },

  /**
   * Get stats for a specific period
   */
  async getStatsByPeriod(period: 'day' | 'week' | 'month' | 'year'): Promise<StatsPeriod> {
    try {
      const response = await client.get<StatsPeriod>(
        API_ENDPOINTS.STATS.BY_PERIOD(period)
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching stats by period:', error);
      throw error;
    }
  },

  /**
   * Get calories statistics
   */
  async getCaloriesStats(): Promise<WorkoutStats> {
    try {
      const response = await client.get<WorkoutStats>(
        API_ENDPOINTS.STATS.CALORIES
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching calories stats:', error);
      throw error;
    }
  },

  /**
   * Get duration statistics
   */
  async getDurationStats(): Promise<WorkoutStats> {
    try {
      const response = await client.get<WorkoutStats>(
        API_ENDPOINTS.STATS.DURATION
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching duration stats:', error);
      throw error;
    }
  },

  /**
   * Get daily stats for a specific date
   */
  async getDailyStats(date: Date): Promise<DailyStats> {
    try {
      const dateStr = date.toISOString().split('T')[0];
      const response = await client.get<DailyStats>(`/stats/day/${dateStr}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching daily stats:', error);
      throw error;
    }
  },
};
