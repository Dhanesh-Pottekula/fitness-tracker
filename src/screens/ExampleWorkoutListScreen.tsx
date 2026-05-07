/**
 * ARCHITECTURE EXAMPLE - DO NOT DELETE
 * This file demonstrates how to use the Redux + Axios architecture
 * 
 * Key Points:
 * 1. Uses custom hooks from src/hooks/ (NOT direct Redux)
 * 2. Components are presentational (clean and reusable)
 * 3. All state logic in Redux slices
 * 4. API calls only through services
 * 5. Types from src/types/
 * 
 * @see ARCHITECTURE.md for detailed guidelines
 */

import { useWorkouts } from '@/hooks/useWorkouts';
import { Workout } from '@/types';
import { formatCalories, formatDate, formatDuration } from '@/utils';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

interface WorkoutListProps {
  workouts: Workout[];
  loading: boolean;
  error: string | null;
}

/**
 * Example: Presentational Component
 * Pure component - receives all data via props
 * No Redux knowledge needed
 */
function WorkoutListComponent({ workouts, loading, error }: WorkoutListProps) {
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!workouts.length) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>No workouts yet. Start by creating one!</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {workouts.map((workout) => (
        <View key={workout.id} style={styles.card}>
          <Text style={styles.title}>{workout.name}</Text>
          <View style={styles.statsRow}>
            <Text style={styles.stat}>{formatDate(new Date(workout.date))}</Text>
            <Text style={styles.stat}>{formatDuration(workout.duration)}</Text>
            <Text style={styles.stat}>{formatCalories(workout.calories)}</Text>
          </View>
          <Text style={[styles.intensity, styles[`intensity_${workout.intensity}`]]}>
            {workout.intensity.toUpperCase()}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

/**
 * Example: Container Component
 * Connects to Redux using custom hooks
 * Handles data fetching and state management
 */
export default function ExampleWorkoutListScreen() {
  // ✅ CORRECT: Use custom hook
  const { workouts, loading, error } = useWorkouts();

  return <WorkoutListComponent workouts={workouts} loading={loading} error={error} />;
}

/**
 * COMMON MISTAKES TO AVOID:
 * 
 * ❌ WRONG - Direct API calls in component:
 * useEffect(() => {
 *   axios.get('/workouts').then(setData);
 * }, []);
 * 
 * ✅ CORRECT - Use hook:
 * const { workouts } = useWorkouts();
 * 
 * ---
 * 
 * ❌ WRONG - Selector directly in presentational component:
 * const workouts = useSelector(selectAllWorkouts);
 * 
 * ✅ CORRECT - Pass via hook:
 * const { workouts } = useWorkouts();
 * 
 * ---
 * 
 * ❌ WRONG - No types:
 * const data = response.data;
 * 
 * ✅ CORRECT - Use types:
 * const data: Workout[] = response.data;
 * 
 * ---
 * 
 * ❌ WRONG - Business logic in component:
 * const totalCalories = workouts.reduce(...);
 * 
 * ✅ CORRECT - Use selectors:
 * const totalCalories = useSelector(selectTotalCalories);
 */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  stat: {
    fontSize: 14,
    color: '#666',
  },
  intensity: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  intensity_low: {
    color: '#34C759',
  },
  intensity_medium: {
    color: '#FF9500',
  },
  intensity_high: {
    color: '#FF3B30',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
});
