/**
 * Statistics-related Types
 */

import { Intensity } from './common';

export interface WorkoutStats {
  totalWorkouts: number;
  totalDuration: number; // minutes
  totalCalories: number;
  averageDuration: number;
  averageCalories: number;
  mostCommonIntensity: Intensity;
  lastWorkoutDate?: Date;
}

export interface DailyStats {
  date: Date;
  workoutCount: number;
  totalDuration: number;
  totalCalories: number;
  totalDistance?: number;
}

export interface MonthlyStats {
  month: number;
  year: number;
  workoutCount: number;
  totalDuration: number;
  totalCalories: number;
  averageWorkoutDuration: number;
}

export interface IntensityBreakdown {
  low: number;
  medium: number;
  high: number;
}

export interface StatsOverview {
  currentStreak: number;
  longestStreak: number;
  thisWeek: WorkoutStats;
  thisMonth: WorkoutStats;
  allTime: WorkoutStats;
  intensityBreakdown: IntensityBreakdown;
}

export interface StatsPeriod {
  period: 'day' | 'week' | 'month' | 'year';
  data: DailyStats[] | MonthlyStats[];
}
