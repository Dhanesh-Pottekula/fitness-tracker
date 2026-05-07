/**
 * Workout Slice
 * Manages workout-related state and async operations
 * @see ARCHITECTURE.md - State Management section
 */

import { workoutService } from '@/api/services/workoutService';
import { ERROR_MESSAGES } from '@/constants/errors';
import {
    Workout,
    WorkoutCreateDTO,
    WorkoutFilters,
    WorkoutUpdateDTO
} from '@/types';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

/**
 * Async Thunks
 * These handle API calls and dispatch actions based on success/failure
 */

export const fetchWorkouts = createAsyncThunk(
  'workouts/fetchWorkouts',
  async (_, { rejectWithValue }) => {
    try {
      const workouts = await workoutService.getWorkouts();
      return workouts;
    } catch (error) {
      return rejectWithValue(ERROR_MESSAGES.WORKOUT.FETCH_FAILED);
    }
  }
);

export const createWorkout = createAsyncThunk(
  'workouts/createWorkout',
  async (data: WorkoutCreateDTO, { rejectWithValue }) => {
    try {
      const workout = await workoutService.createWorkout(data);
      return workout;
    } catch (error) {
      return rejectWithValue(ERROR_MESSAGES.WORKOUT.CREATE_FAILED);
    }
  }
);

export const updateWorkout = createAsyncThunk(
  'workouts/updateWorkout',
  async (
    { id, data }: { id: string; data: WorkoutUpdateDTO },
    { rejectWithValue }
  ) => {
    try {
      const workout = await workoutService.updateWorkout(id, data);
      return workout;
    } catch (error) {
      return rejectWithValue(ERROR_MESSAGES.WORKOUT.UPDATE_FAILED);
    }
  }
);

export const deleteWorkout = createAsyncThunk(
  'workouts/deleteWorkout',
  async (id: string, { rejectWithValue }) => {
    try {
      await workoutService.deleteWorkout(id);
      return id;
    } catch (error) {
      return rejectWithValue(ERROR_MESSAGES.WORKOUT.DELETE_FAILED);
    }
  }
);

export const fetchWorkoutsByDate = createAsyncThunk(
  'workouts/fetchWorkoutsByDate',
  async (date: Date, { rejectWithValue }) => {
    try {
      const workouts = await workoutService.getWorkoutsByDate(date);
      return workouts;
    } catch (error) {
      return rejectWithValue(ERROR_MESSAGES.WORKOUT.FETCH_FAILED);
    }
  }
);

export const filterWorkouts = createAsyncThunk(
  'workouts/filterWorkouts',
  async (filters: WorkoutFilters, { rejectWithValue }) => {
    try {
      const workouts = await workoutService.filterWorkouts(filters);
      return workouts;
    } catch (error) {
      return rejectWithValue(ERROR_MESSAGES.WORKOUT.FETCH_FAILED);
    }
  }
);

/**
 * Slice State Interface
 */

interface WorkoutState {
  workouts: Workout[];
  loading: boolean;
  error: string | null;
  selectedWorkout: Workout | null;
  filteredWorkouts: Workout[];
}

const initialState: WorkoutState = {
  workouts: [],
  loading: false,
  error: null,
  selectedWorkout: null,
  filteredWorkouts: [],
};

/**
 * Workout Slice
 */

const workoutSlice = createSlice({
  name: 'workouts',
  initialState,
  reducers: {
    // Sync reducers for non-async operations
    clearError: (state) => {
      state.error = null;
    },
    selectWorkout: (state, action: PayloadAction<Workout>) => {
      state.selectedWorkout = action.payload;
    },
    deselectWorkout: (state) => {
      state.selectedWorkout = null;
    },
    resetWorkouts: (state) => {
      state.workouts = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch workouts
    builder
      .addCase(fetchWorkouts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWorkouts.fulfilled, (state, action) => {
        state.loading = false;
        state.workouts = action.payload;
        state.filteredWorkouts = action.payload;
      })
      .addCase(fetchWorkouts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Create workout
    builder
      .addCase(createWorkout.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createWorkout.fulfilled, (state, action) => {
        state.loading = false;
        state.workouts.push(action.payload);
        state.filteredWorkouts.push(action.payload);
      })
      .addCase(createWorkout.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update workout
    builder
      .addCase(updateWorkout.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateWorkout.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.workouts.findIndex(
          (w) => w.id === action.payload.id
        );
        if (index !== -1) {
          state.workouts[index] = action.payload;
          state.filteredWorkouts = state.filteredWorkouts.map((w) =>
            w.id === action.payload.id ? action.payload : w
          );
        }
        state.selectedWorkout = action.payload;
      })
      .addCase(updateWorkout.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Delete workout
    builder
      .addCase(deleteWorkout.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteWorkout.fulfilled, (state, action) => {
        state.loading = false;
        state.workouts = state.workouts.filter((w) => w.id !== action.payload);
        state.filteredWorkouts = state.filteredWorkouts.filter(
          (w) => w.id !== action.payload
        );
        if (state.selectedWorkout?.id === action.payload) {
          state.selectedWorkout = null;
        }
      })
      .addCase(deleteWorkout.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch by date
    builder
      .addCase(fetchWorkoutsByDate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWorkoutsByDate.fulfilled, (state, action) => {
        state.loading = false;
        state.filteredWorkouts = action.payload;
      })
      .addCase(fetchWorkoutsByDate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Filter workouts
    builder
      .addCase(filterWorkouts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(filterWorkouts.fulfilled, (state, action) => {
        state.loading = false;
        state.filteredWorkouts = action.payload;
      })
      .addCase(filterWorkouts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, selectWorkout, deselectWorkout, resetWorkouts } =
  workoutSlice.actions;

export default workoutSlice.reducer;
