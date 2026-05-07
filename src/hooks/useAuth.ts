/**
 * Custom Hooks for User and Auth
 */

import {
    selectAuthError,
    selectAuthLoading,
    selectAuthUser,
    selectIsAuthenticated,
} from '@/state/selectors/authSelectors';
import {
    selectUserError,
    selectUserLoading,
    selectUserPreferences,
    selectUserProfile,
    selectUserStats,
} from '@/state/selectors/userSelectors';
import { login, logout, register } from '@/state/slices/authSlice';
import {
    fetchUserPreferences,
    fetchUserProfile,
    fetchUserStats,
    updateUserProfile,
} from '@/state/slices/userSlice';
import { AppDispatch } from '@/state/store';
import { UserLoginDTO, UserRegisterDTO, UserUpdateDTO } from '@/types';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

/**
 * useUserProfile - Get and manage user profile
 */
export const useUserProfile = () => {
  const dispatch = useDispatch<AppDispatch>();
  const profile = useSelector(selectUserProfile);
  const loading = useSelector(selectUserLoading);
  const error = useSelector(selectUserError);

  useEffect(() => {
    dispatch(fetchUserProfile());
  }, [dispatch]);

  const update = (data: UserUpdateDTO) => dispatch(updateUserProfile(data));

  return { profile, loading, error, update };
};

/**
 * useUserPreferences - Get user preferences
 */
export const useUserPreferences = () => {
  const dispatch = useDispatch<AppDispatch>();
  const preferences = useSelector(selectUserPreferences);
  const loading = useSelector(selectUserLoading);

  useEffect(() => {
    dispatch(fetchUserPreferences());
  }, [dispatch]);

  return { preferences, loading };
};

/**
 * useUserStats - Get user statistics
 */
export const useUserStats = () => {
  const dispatch = useDispatch<AppDispatch>();
  const stats = useSelector(selectUserStats);
  const loading = useSelector(selectUserLoading);

  useEffect(() => {
    dispatch(fetchUserStats());
  }, [dispatch]);

  return { stats, loading };
};

/**
 * useAuth - Authentication hook
 */
export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector(selectAuthUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);

  const loginUser = (credentials: UserLoginDTO) => dispatch(login(credentials));
  const registerUser = (data: UserRegisterDTO) => dispatch(register(data));
  const logoutUser = () => dispatch(logout());

  return {
    user,
    isAuthenticated,
    loading,
    error,
    login: loginUser,
    register: registerUser,
    logout: logoutUser,
  };
};
