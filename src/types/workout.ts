/**
 * Workout-related Types
 */

import { ExerciseType, Intensity } from './common';

export interface Workout {
  id: string;
  userId: string;
  name: string;
  description?: string;
  duration: number; // minutes
  calories: number;
  intensity: Intensity;
  date: Date;
  exercises: Exercise[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Exercise {
  id: string;
  name: string;
  type: ExerciseType;
  sets: number;
  reps: number;
  weight?: number; // kg
  duration?: number; // seconds
  distance?: number; // meters
}

export interface WorkoutCreateDTO {
  name: string;
  description?: string;
  duration: number;
  calories: number;
  intensity: Intensity;
  date?: Date;
  exercises: Omit<Exercise, 'id'>[];
  notes?: string;
}

export interface WorkoutUpdateDTO extends Partial<Omit<Workout, 'id' | 'userId' | 'createdAt' | 'updatedAt'>> {}

export interface WorkoutFilters {
  startDate?: Date;
  endDate?: Date;
  intensity?: Intensity;
  minCalories?: number;
  maxCalories?: number;
}
