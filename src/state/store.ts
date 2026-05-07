/**
 * Redux Store Configuration
 * @see ARCHITECTURE.md - State Management section
 */

import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import statsSlice from './slices/statsSlice';
import userSlice from './slices/userSlice';
import workoutSlice from './slices/workoutSlice';

export const store = configureStore({
  reducer: {
    workouts: workoutSlice,
    user: userSlice,
    stats: statsSlice,
    auth: authSlice,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
