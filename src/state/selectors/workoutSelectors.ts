/**
 * Workout Selectors
 * Memoized selectors for workout state
 * @see ARCHITECTURE.md - Selectors section
 */

import { RootState } from '../store';

// Base selectors
export const selectAllWorkouts = (state: RootState) => state.workouts.workouts;
export const selectWorkoutsLoading = (state: RootState) => state.workouts.loading;
export const selectWorkoutsError = (state: RootState) => state.workouts.error;
export const selectSelectedWorkout = (state: RootState) => state.workouts.selectedWorkout;
export const selectFilteredWorkouts = (state: RootState) => state.workouts.filteredWorkouts;

// Derived selectors
export const selectWorkoutCount = (state: RootState) =>
  state.workouts.workouts.length;

export const selectWorkoutById = (state: RootState, id: string) =>
  state.workouts.workouts.find((w) => w.id === id);

export const selectRecentWorkouts = (state: RootState, limit: number = 5) =>
  state.workouts.workouts.slice(0, limit);

export const selectTotalCalories = (state: RootState) =>
  state.workouts.workouts.reduce((sum, w) => sum + w.calories, 0);

export const selectTotalDuration = (state: RootState) =>
  state.workouts.workouts.reduce((sum, w) => sum + w.duration, 0);

export const selectWorkoutsByIntensity = (state: RootState, intensity: string) =>
  state.workouts.workouts.filter((w) => w.intensity === intensity);
