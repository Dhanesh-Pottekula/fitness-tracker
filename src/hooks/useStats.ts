/**
 * Custom Hooks for Stats
 */

import {
    selectStatsError,
    selectStatsLoading,
    selectStatsOverview,
    selectStatsPeriod,
} from '@/state/selectors/statsSelectors';
import { fetchStatsByPeriod, fetchStatsOverview } from '@/state/slices/statsSlice';
import { AppDispatch } from '@/state/store';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

/**
 * useStatsOverview - Get overall statistics
 */
export const useStatsOverview = () => {
  const dispatch = useDispatch<AppDispatch>();
  const overview = useSelector(selectStatsOverview);
  const loading = useSelector(selectStatsLoading);
  const error = useSelector(selectStatsError);

  useEffect(() => {
    dispatch(fetchStatsOverview());
  }, [dispatch]);

  return { overview, loading, error };
};

/**
 * useStatsByPeriod - Get stats for a specific period
 */
export const useStatsByPeriod = (period: 'day' | 'week' | 'month' | 'year') => {
  const dispatch = useDispatch<AppDispatch>();
  const stats = useSelector(selectStatsPeriod);
  const loading = useSelector(selectStatsLoading);
  const error = useSelector(selectStatsError);

  useEffect(() => {
    dispatch(fetchStatsByPeriod(period));
  }, [dispatch, period]);

  return { stats, loading, error };
};
