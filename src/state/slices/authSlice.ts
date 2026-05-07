/**
 * Auth Slice
 * Manages authentication state
 */

import { userService } from '@/api/services/userService';
import { ERROR_MESSAGES } from '@/constants/errors';
import { User, UserLoginDTO, UserRegisterDTO } from '@/types';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: UserLoginDTO, { rejectWithValue }) => {
    try {
      const response = await userService.login(credentials);
      // TODO: Save token to storage
      return response.user;
    } catch (error) {
      return rejectWithValue(ERROR_MESSAGES.USER.LOGIN_FAILED);
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (data: UserRegisterDTO, { rejectWithValue }) => {
    try {
      const response = await userService.register(data);
      // TODO: Save token to storage
      return response.user;
    } catch (error) {
      return rejectWithValue(ERROR_MESSAGES.VALIDATION);
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await userService.logout();
      // TODO: Clear token from storage
    } catch (error) {
      return rejectWithValue(ERROR_MESSAGES.USER.LOGOUT_FAILED);
    }
  }
);

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Register
    builder
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Logout
    builder
      .addCase(logout.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(logout.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
        state.isAuthenticated = false;
      })
      .addCase(logout.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
