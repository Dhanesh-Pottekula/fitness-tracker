/**
 * Validation Utilities
 */

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPassword = (password: string): boolean => {
  return password.length >= 8;
};

export const isValidName = (name: string): boolean => {
  return name.trim().length >= 2;
};

export const isValidAge = (age: number): boolean => {
  return age >= 13 && age <= 150;
};

export const isValidWeight = (weight: number): boolean => {
  return weight > 0 && weight < 500;
};

export const isValidHeight = (height: number): boolean => {
  return height > 0 && height < 300;
};

export const isValidDuration = (minutes: number): boolean => {
  return minutes > 0 && minutes <= 1440; // max 24 hours
};

export const isValidCalories = (calories: number): boolean => {
  return calories >= 0 && calories <= 10000;
};

export const isValidReps = (reps: number): boolean => {
  return reps > 0 && reps <= 1000;
};

export const isValidSets = (sets: number): boolean => {
  return sets > 0 && sets <= 100;
};
