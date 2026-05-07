/**
 * User-related Types
 */

export interface User {
  id: string;
  email: string;
  name: string;
  age?: number;
  weight?: number; // kg
  height?: number; // cm
  gender?: 'male' | 'female' | 'other';
  bio?: string;
  profilePictureUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  userId: string;
  theme: 'light' | 'dark' | 'auto';
  language: string;
  notificationsEnabled: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

export interface UserStats {
  userId: string;
  totalWorkouts: number;
  totalCalories: number;
  totalDuration: number; // minutes
  currentStreak: number; // days
  longestStreak: number; // days
  lastWorkoutDate?: Date;
}

export interface UserUpdateDTO extends Partial<Omit<User, 'id' | 'email' | 'createdAt' | 'updatedAt'>> {}

export interface UserRegisterDTO {
  email: string;
  password: string;
  name: string;
}

export interface UserLoginDTO {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
