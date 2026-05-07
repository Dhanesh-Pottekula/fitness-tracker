/**
 * Custom Hooks for Redux State
 * Encapsulate component logic and state access
 * @see ARCHITECTURE.md - Hooks section
 */

import {
    selectAllWorkouts,
    selectSelectedWorkout,
    selectWorkoutsError,
    selectWorkoutsLoading,
} from '@/state/selectors/workoutSelectors';
import {
    createWorkout,
    deleteWorkout,
    fetchWorkouts,
    fetchWorkoutsByDate,
    filterWorkouts,
    updateWorkout,
} from '@/state/slices/workoutSlice';
import { AppDispatch } from '@/state/store';
import { WorkoutCreateDTO, WorkoutFilters, WorkoutUpdateDTO } from '@/types';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

/**
 * useWorkouts - Fetch and manage all workouts
 */
export const useWorkouts = () => {
  const dispatch = useDispatch<AppDispatch>();
  const workouts = useSelector(selectAllWorkouts);
  const loading = useSelector(selectWorkoutsLoading);
  const error = useSelector(selectWorkoutsError);

  useEffect(() => {
    dispatch(fetchWorkouts());
  }, [dispatch]);

  return { workouts, loading, error };
};

/**
 * useCreateWorkout - Handle workout creation
 */
export const useCreateWorkout = () => {
  const dispatch = useDispatch<AppDispatch>();
  const loading = useSelector(selectWorkoutsLoading);
  const error = useSelector(selectWorkoutsError);

  const create = (data: WorkoutCreateDTO) => dispatch(createWorkout(data));

  return { create, loading, error };
};

/**
 * useUpdateWorkout - Handle workout updates
 */
export const useUpdateWorkout = () => {
  const dispatch = useDispatch<AppDispatch>();
  const loading = useSelector(selectWorkoutsLoading);
  const error = useSelector(selectWorkoutsError);

  const update = (id: string, data: WorkoutUpdateDTO) =>
    dispatch(updateWorkout({ id, data }));

  return { update, loading, error };
};

/**
 * useDeleteWorkout - Handle workout deletion
 */
export const useDeleteWorkout = () => {
  const dispatch = useDispatch<AppDispatch>();
  const loading = useSelector(selectWorkoutsLoading);
  const error = useSelector(selectWorkoutsError);

  const delete_ = (id: string) => dispatch(deleteWorkout(id));

  return { delete: delete_, loading, error };
};

/**
 * useSelectedWorkout - Get currently selected workout
 */
export const useSelectedWorkout = () => {
  return useSelector(selectSelectedWorkout);
};

/**
 * useWorkoutsByDate - Fetch workouts for a specific date
 */
export const useWorkoutsByDate = (date: Date) => {
  const dispatch = useDispatch<AppDispatch>();
  const workouts = useSelector(selectAllWorkouts);
  const loading = useSelector(selectWorkoutsLoading);
  const error = useSelector(selectWorkoutsError);

  useEffect(() => {
    dispatch(fetchWorkoutsByDate(date));
  }, [dispatch, date]);

  return { workouts, loading, error };
};

/**
 * useFilterWorkouts - Filter workouts based on criteria
 */
export const useFilterWorkouts = () => {
  const dispatch = useDispatch<AppDispatch>();
  const workouts = useSelector(selectAllWorkouts);
  const loading = useSelector(selectWorkoutsLoading);
  const error = useSelector(selectWorkoutsError);

  const filter = (filters: WorkoutFilters) => dispatch(filterWorkouts(filters));

  return { workouts, loading, error, filter };
};
