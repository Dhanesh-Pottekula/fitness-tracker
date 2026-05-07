/**
 * Stats Slice
 * Manages statistics state
 */

import { statsService } from '@/api/services/statsService';
import { ERROR_MESSAGES } from '@/constants/errors';
import { StatsOverview, StatsPeriod } from '@/types';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

export const fetchStatsOverview = createAsyncThunk(
  'stats/fetchOverview',
  async (_, { rejectWithValue }) => {
    try {
      return await statsService.getOverview();
    } catch (error) {
      return rejectWithValue(ERROR_MESSAGES.UNKNOWN);
    }
  }
);

export const fetchStatsByPeriod = createAsyncThunk(
  'stats/fetchByPeriod',
  async (period: 'day' | 'week' | 'month' | 'year', { rejectWithValue }) => {
    try {
      return await statsService.getStatsByPeriod(period);
    } catch (error) {
      return rejectWithValue(ERROR_MESSAGES.UNKNOWN);
    }
  }
);

interface StatsState {
  overview: StatsOverview | null;
  periodStats: StatsPeriod | null;
  loading: boolean;
  error: string | null;
}

const initialState: StatsState = {
  overview: null,
  periodStats: null,
  loading: false,
  error: null,
};

const statsSlice = createSlice({
  name: 'stats',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch overview
    builder
      .addCase(fetchStatsOverview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStatsOverview.fulfilled, (state, action) => {
        state.loading = false;
        state.overview = action.payload;
      })
      .addCase(fetchStatsOverview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch by period
    builder
      .addCase(fetchStatsByPeriod.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStatsByPeriod.fulfilled, (state, action) => {
        state.loading = false;
        state.periodStats = action.payload;
      })
      .addCase(fetchStatsByPeriod.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = statsSlice.actions;
export default statsSlice.reducer;
