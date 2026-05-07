/**
 * User Slice
 * Manages user profile and preferences state
 */

import { userService } from '@/api/services/userService';
import { ERROR_MESSAGES } from '@/constants/errors';
import { User, UserPreferences, UserStats, UserUpdateDTO } from '@/types';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

export const fetchUserProfile = createAsyncThunk(
  'user/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      return await userService.getProfile();
    } catch (error) {
      return rejectWithValue(ERROR_MESSAGES.USER.FETCH_FAILED);
    }
  }
);

export const updateUserProfile = createAsyncThunk(
  'user/updateProfile',
  async (data: UserUpdateDTO, { rejectWithValue }) => {
    try {
      return await userService.updateProfile(data);
    } catch (error) {
      return rejectWithValue(ERROR_MESSAGES.USER.UPDATE_FAILED);
    }
  }
);

export const fetchUserPreferences = createAsyncThunk(
  'user/fetchPreferences',
  async (_, { rejectWithValue }) => {
    try {
      return await userService.getPreferences();
    } catch (error) {
      return rejectWithValue(ERROR_MESSAGES.USER.FETCH_FAILED);
    }
  }
);

export const fetchUserStats = createAsyncThunk(
  'user/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      return await userService.getStats();
    } catch (error) {
      return rejectWithValue(ERROR_MESSAGES.USER.FETCH_FAILED);
    }
  }
);

interface UserState {
  profile: User | null;
  preferences: UserPreferences | null;
  stats: UserStats | null;
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  profile: null,
  preferences: null,
  stats: null,
  loading: false,
  error: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearUser: (state) => {
      state.profile = null;
      state.preferences = null;
      state.stats = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch profile
    builder
      .addCase(fetchUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update profile
    builder
      .addCase(updateUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch preferences
    builder
      .addCase(fetchUserPreferences.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchUserPreferences.fulfilled, (state, action) => {
        state.loading = false;
        state.preferences = action.payload;
      })
      .addCase(fetchUserPreferences.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch stats
    builder
      .addCase(fetchUserStats.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchUserStats.fulfilled, (state, action) => {
        state.loading = false;
        state.stats = action.payload;
      })
      .addCase(fetchUserStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearUser } = userSlice.actions;
export default userSlice.reducer;
