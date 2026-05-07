/**
 * Stats Selectors
 */

import { RootState } from '../store';

export const selectStatsOverview = (state: RootState) => state.stats.overview;
export const selectStatsPeriod = (state: RootState) => state.stats.periodStats;
export const selectStatsLoading = (state: RootState) => state.stats.loading;
export const selectStatsError = (state: RootState) => state.stats.error;
