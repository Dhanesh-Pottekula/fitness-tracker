/**
 * User Selectors
 */

import { RootState } from '../store';

export const selectUserProfile = (state: RootState) => state.user.profile;
export const selectUserPreferences = (state: RootState) => state.user.preferences;
export const selectUserStats = (state: RootState) => state.user.stats;
export const selectUserLoading = (state: RootState) => state.user.loading;
export const selectUserError = (state: RootState) => state.user.error;

export const selectUserName = (state: RootState) => state.user.profile?.name;
export const selectUserEmail = (state: RootState) => state.user.profile?.email;
