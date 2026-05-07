# Fitness Tracker - Architecture Guide

> **READ THIS BEFORE MAKING ANY CODE CHANGES**
> This document defines the application architecture and how to structure all code contributions.

## Table of Contents
1. [Folder Structure](#folder-structure)
2. [Separation of Concerns](#separation-of-concerns)
3. [State Management (Redux Toolkit)](#state-management-redux-toolkit)
4. [API Layer (Axios)](#api-layer-axios)
5. [Component Structure](#component-structure)
6. [Type Safety](#type-safety)
7. [Best Practices](#best-practices)
8. [Common Patterns](#common-patterns)

---

## Folder Structure

```
fitness_tracker/
├── app/                              # Expo Router (Navigation ONLY)
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx                 # Home screen
│   │   ├── explore.tsx               # Features screen
│   │   └── profile.tsx               # Profile screen
│   ├── _layout.tsx
│   └── modal.tsx
│
├── src/
│   ├── api/                          # 🌐 API LAYER
│   │   ├── client.ts                 # Axios instance & interceptors
│   │   ├── endpoints.ts              # API constants
│   │   └── services/                 # Service layer (business logic)
│   │       ├── workoutService.ts
│   │       ├── userService.ts
│   │       ├── statsService.ts
│   │       └── authService.ts
│   │
│   ├── state/                        # 📊 STATE MANAGEMENT (Redux)
│   │   ├── store.ts                  # Redux store configuration
│   │   ├── slices/                   # Redux slices (state + reducers)
│   │   │   ├── userSlice.ts
│   │   │   ├── workoutSlice.ts
│   │   │   ├── statsSlice.ts
│   │   │   └── authSlice.ts
│   │   ├── selectors/                # Memoized selectors
│   │   │   ├── userSelectors.ts
│   │   │   ├── workoutSelectors.ts
│   │   │   └── statsSelectors.ts
│   │   └── thunks/                   # Async Redux thunks
│   │       ├── workoutThunks.ts
│   │       ├── userThunks.ts
│   │       └── statsThunks.ts
│   │
│   ├── types/                        # 📝 TYPESCRIPT TYPES
│   │   ├── index.ts                  # Main types export
│   │   ├── user.ts                   # User-related types
│   │   ├── workout.ts                # Workout-related types
│   │   ├── stats.ts                  # Stats-related types
│   │   ├── api.ts                    # API response types
│   │   └── common.ts                 # Common types
│   │
│   ├── hooks/                        # 🪝 CUSTOM HOOKS
│   │   ├── index.ts
│   │   ├── useWorkouts.ts            # Workout hooks
│   │   ├── useUser.ts                # User hooks
│   │   ├── useStats.ts               # Stats hooks
│   │   └── useAuth.ts                # Auth hooks
│   │
│   ├── utils/                        # 🔧 UTILITIES
│   │   ├── index.ts
│   │   ├── formatters.ts             # Format data (dates, numbers, etc)
│   │   ├── validators.ts             # Validation logic
│   │   ├── date-helpers.ts           # Date utilities
│   │   └── storage.ts                # Local storage helpers
│   │
│   ├── theme/                        # 🎨 DESIGN SYSTEM
│   │   ├── colors.ts
│   │   ├── spacing.ts
│   │   ├── typography.ts
│   │   └── index.ts
│   │
│   ├── constants/                    # ⚙️ APP CONSTANTS
│   │   ├── api.ts                    # API base URLs, timeouts
│   │   ├── errors.ts                 # Error messages
│   │   └── config.ts                 # Feature flags, env vars
│   │
│   └── screens/                      # 📱 FEATURE SCREENS (Optional grouping)
│       ├── workout/
│       │   └── WorkoutScreen.tsx
│       ├── stats/
│       │   └── StatsScreen.tsx
│       └── profile/
│           └── ProfileScreen.tsx
│
├── components/
│   ├── ui/                           # 🧩 REUSABLE UI PRIMITIVES
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Loading.tsx
│   │   ├── ErrorBoundary.tsx
│   │   └── index.ts                  # Export all UI components
│   │
│   └── features/                     # 🎯 FEATURE-SPECIFIC COMPONENTS
│       ├── workout/
│       │   ├── WorkoutCard.tsx
│       │   ├── WorkoutForm.tsx
│       │   └── WorkoutList.tsx
│       ├── stats/
│       │   ├── StatsSummary.tsx
│       │   └── ChartComponent.tsx
│       └── user/
│           ├── UserProfile.tsx
│           └── UserSettings.tsx
│
└── assets/
    └── images/
```

---

## Separation of Concerns

### **1. API Layer** (`src/api/`)
**Responsibility**: Handle all HTTP requests and API communication

```typescript
// ✅ API Layer ONLY does:
// - Make HTTP requests
// - Handle errors and retry logic
// - Transform raw API responses to types
// - NOT modify app state directly

// src/api/client.ts
import axios, { AxiosInstance } from 'axios';

const client: AxiosInstance = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 10000,
});

// Add request interceptor
client.interceptors.request.use((config) => {
  // Add auth token
  return config;
});

// Add response interceptor
client.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error),
);

export default client;
```

### **2. Service Layer** (`src/api/services/`)
**Responsibility**: Business logic that combines API calls

```typescript
// ✅ Services:
// - Wrap API calls with business logic
// - Handle data transformation
// - Coordinate multiple API calls if needed
// - Are STATELESS (no Redux state here)

// src/api/services/workoutService.ts
import client from '../client';
import { Workout, WorkoutCreateDTO } from '@/types';

export const workoutService = {
  async getWorkouts(): Promise<Workout[]> {
    const response = await client.get('/workouts');
    return response.data;
  },

  async createWorkout(data: WorkoutCreateDTO): Promise<Workout> {
    const response = await client.post('/workouts', data);
    return response.data;
  },

  async updateWorkout(id: string, data: Partial<Workout>): Promise<Workout> {
    const response = await client.put(`/workouts/${id}`, data);
    return response.data;
  },

  async deleteWorkout(id: string): Promise<void> {
    await client.delete(`/workouts/${id}`);
  },
};
```

### **3. State Management** (`src/state/`)
**Responsibility**: Manage app-wide state and async operations

```typescript
// ✅ Redux:
// - Stores UI state (loading, error, data)
// - Calls services to fetch data
// - Transforms service responses for components
// - Manages global data cache

// src/state/slices/workoutSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { workoutService } from '@/api/services/workoutService';
import { Workout, WorkoutCreateDTO } from '@/types';

export const fetchWorkouts = createAsyncThunk(
  'workouts/fetchWorkouts',
  async (_, { rejectWithValue }) => {
    try {
      return await workoutService.getWorkouts();
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const createWorkout = createAsyncThunk(
  'workouts/createWorkout',
  async (data: WorkoutCreateDTO, { rejectWithValue }) => {
    try {
      return await workoutService.createWorkout(data);
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

interface WorkoutState {
  workouts: Workout[];
  loading: boolean;
  error: string | null;
  selectedWorkout: Workout | null;
}

const initialState: WorkoutState = {
  workouts: [],
  loading: false,
  error: null,
  selectedWorkout: null,
};

const workoutSlice = createSlice({
  name: 'workouts',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    selectWorkout: (state, action) => {
      state.selectedWorkout = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWorkouts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWorkouts.fulfilled, (state, action) => {
        state.loading = false;
        state.workouts = action.payload;
      })
      .addCase(fetchWorkouts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createWorkout.fulfilled, (state, action) => {
        state.workouts.push(action.payload);
      });
  },
});

export const { clearError, selectWorkout } = workoutSlice.actions;
export default workoutSlice.reducer;
```

### **4. Selectors** (`src/state/selectors/`)
**Responsibility**: Extract and memoize state selections

```typescript
// ✅ Selectors:
// - Create derived state (reselect for memoization)
// - Keep components from accessing state directly
// - Make state shape changes easier

// src/state/selectors/workoutSelectors.ts
import { RootState } from '@/state/store';

export const selectAllWorkouts = (state: RootState) => state.workouts.workouts;
export const selectWorkoutsLoading = (state: RootState) => state.workouts.loading;
export const selectWorkoutsError = (state: RootState) => state.workouts.error;
export const selectWorkoutCount = (state: RootState) => state.workouts.workouts.length;
```

### **5. Hooks** (`src/hooks/`)
**Responsibility**: Encapsulate component logic and Redux interactions

```typescript
// ✅ Custom Hooks:
// - Connect components to Redux
// - Encapsulate complex component logic
// - Are reusable across components
// - Handle side effects (useEffect)

// src/hooks/useWorkouts.ts
import { useDispatch, useSelector } from 'react-redux';
import { useEffect } from 'react';
import { fetchWorkouts, createWorkout } from '@/state/slices/workoutSlice';
import {
  selectAllWorkouts,
  selectWorkoutsLoading,
  selectWorkoutsError,
} from '@/state/selectors/workoutSelectors';

export const useWorkouts = () => {
  const dispatch = useDispatch();
  const workouts = useSelector(selectAllWorkouts);
  const loading = useSelector(selectWorkoutsLoading);
  const error = useSelector(selectWorkoutsError);

  useEffect(() => {
    dispatch(fetchWorkouts() as any);
  }, [dispatch]);

  return { workouts, loading, error };
};

export const useCreateWorkout = () => {
  const dispatch = useDispatch();
  const loading = useSelector(selectWorkoutsLoading);

  const create = (data) => dispatch(createWorkout(data) as any);

  return { create, loading };
};
```

### **6. Components** (`components/`)
**Responsibility**: Render UI and handle user interactions

```typescript
// ✅ Components:
// - Use custom hooks (not direct Redux)
// - Are presentational (pure functions when possible)
// - Don't know about API/Redux internals
// - Accept data via props when feasible

// components/features/workout/WorkoutList.tsx
import { useWorkouts } from '@/hooks/useWorkouts';
import { Loading, Error } from '@/components/ui';
import WorkoutCard from './WorkoutCard';

export default function WorkoutList() {
  const { workouts, loading, error } = useWorkouts();

  if (loading) return <Loading />;
  if (error) return <Error message={error} />;

  return (
    <ScrollView>
      {workouts.map((workout) => (
        <WorkoutCard key={workout.id} workout={workout} />
      ))}
    </ScrollView>
  );
}
```

### **7. Types** (`src/types/`)
**Responsibility**: Define all TypeScript interfaces

```typescript
// ✅ Types:
// - Define all data structures
// - Match API response schemas
// - Are shared across API/State/Components
// - Never have implementation logic

// src/types/workout.ts
export interface Workout {
  id: string;
  userId: string;
  name: string;
  duration: number; // minutes
  calories: number;
  intensity: 'low' | 'medium' | 'high';
  date: Date;
  exercises: Exercise[];
  notes?: string;
}

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight?: number; // kg
}

export interface WorkoutCreateDTO {
  name: string;
  duration: number;
  calories: number;
  intensity: 'low' | 'medium' | 'high';
  exercises: Omit<Exercise, 'id'>[];
}

export interface WorkoutUpdateDTO extends Partial<Omit<Workout, 'id' | 'userId'>> {}
```

---

## State Management (Redux Toolkit)

### Store Setup

```typescript
// src/state/store.ts
import { configureStore } from '@reduxjs/toolkit';
import workoutSlice from './slices/workoutSlice';
import userSlice from './slices/userSlice';
import statsSlice from './slices/statsSlice';
import authSlice from './slices/authSlice';

export const store = configureStore({
  reducer: {
    workouts: workoutSlice,
    user: userSlice,
    stats: statsSlice,
    auth: authSlice,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### Redux Slice Pattern

```typescript
// ALWAYS follow this pattern for new slices:
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

// 1. Define state interface
interface MyState {
  data: any[];
  loading: boolean;
  error: string | null;
}

// 2. Create async thunks
export const fetchData = createAsyncThunk(
  'slice/fetchData',
  async (params, { rejectWithValue }) => {
    try {
      const result = await myService.getData(params);
      return result;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

// 3. Create slice with reducers + extra reducers
const mySlice = createSlice({
  name: 'mySlice',
  initialState,
  reducers: {
    // Sync reducers
  },
  extraReducers: (builder) => {
    // Async thunk handlers
  },
});

export default mySlice.reducer;
```

---

## API Layer (Axios)

### Client Configuration

```typescript
// src/api/client.ts
import axios from 'axios';

const client = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Add auth token
client.interceptors.request.use(
  (config) => {
    const token = getAuthToken(); // from storage
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle errors
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - refresh token or logout
    }
    return Promise.reject(error);
  }
);

export default client;
```

### Service Pattern

```typescript
// ✅ CORRECT: Service layer
export const workoutService = {
  async getWorkouts(userId: string) {
    const { data } = await client.get(`/users/${userId}/workouts`);
    return data;
  },

  async createWorkout(data: WorkoutCreateDTO) {
    const { data: response } = await client.post('/workouts', data);
    return response;
  },
};

// ❌ WRONG: Don't make API calls directly in components
// ❌ WRONG: Don't dispatch to Redux from services
// ❌ WRONG: Don't transform data in components
```

---

## Component Structure

### Screen Component (Connected)

```typescript
// app/(tabs)/index.tsx or src/screens/workout/WorkoutScreen.tsx
import { useWorkouts } from '@/hooks/useWorkouts';
import { ThemedView } from '@/components/themed-view';
import WorkoutList from '@/components/features/workout/WorkoutList';

export default function WorkoutScreen() {
  const { workouts, loading, error } = useWorkouts();

  return (
    <ThemedView style={styles.container}>
      <WorkoutList workouts={workouts} loading={loading} error={error} />
    </ThemedView>
  );
}
```

### Feature Component (Presentational)

```typescript
// components/features/workout/WorkoutList.tsx
import { View, FlatList } from 'react-native';
import { Loading, Error } from '@/components/ui';
import WorkoutCard from './WorkoutCard';

interface WorkoutListProps {
  workouts: Workout[];
  loading: boolean;
  error: string | null;
}

export default function WorkoutList({ workouts, loading, error }: WorkoutListProps) {
  if (loading) return <Loading />;
  if (error) return <Error message={error} />;
  if (!workouts.length) return <EmptyState />;

  return (
    <FlatList
      data={workouts}
      renderItem={({ item }) => <WorkoutCard workout={item} />}
      keyExtractor={(item) => item.id}
    />
  );
}
```

### UI Component (Reusable Primitive)

```typescript
// components/ui/Button.tsx
import { Pressable, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
}

export default function Button({ label, onPress, variant = 'primary', loading }: ButtonProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      style={[styles.button, styles[variant], { backgroundColor: colors[variant] }]}
      onPress={onPress}
      disabled={loading}
    >
      <Text style={styles.text}>{loading ? 'Loading...' : label}</Text>
    </Pressable>
  );
}
```

---

## Type Safety

### Never do this:

```typescript
❌ const data: any = response.data;
❌ const workouts = response.data as Workout[];
❌ type MyType = {
  [key: string]: any;
};
```

### Always do this:

```typescript
✅ const workouts: Workout[] = response.data;
✅ export interface Workout {
  id: string;
  name: string;
  // ... all properties typed
}
✅ Use discriminated unions for state types
```

---

## Best Practices

### 1. **File Naming**
- Slices: `<feature>Slice.ts`
- Services: `<feature>Service.ts`
- Selectors: `<feature>Selectors.ts`
- Hooks: `use<Feature>.ts`
- Types: `<feature>.ts`
- Components: `<PascalCase>.tsx`

### 2. **Index Files**
Always export public APIs from index files:

```typescript
// src/hooks/index.ts
export { useWorkouts } from './useWorkouts';
export { useUser } from './useUser';
export { useStats } from './useStats';

// src/types/index.ts
export * from './workout';
export * from './user';
export * from './stats';

// src/api/services/index.ts
export { workoutService } from './workoutService';
export { userService } from './userService';
```

### 3. **Error Handling**
- Always catch API errors in thunks
- Store error messages in state
- Display errors in components
- Never silently fail

### 4. **Loading States**
- Track loading in Redux
- Show loaders while fetching
- Disable buttons during requests
- Display meaningful messages

### 5. **No Direct API Calls in Components**
```typescript
❌ WRONG
useEffect(() => {
  axios.get('/workouts').then(setData);
}, []);

✅ CORRECT
const { workouts, loading } = useWorkouts();
```

---

## Common Patterns

### Pattern 1: Fetch Data on Mount
```typescript
// hooks/useWorkouts.ts
export const useWorkouts = () => {
  const dispatch = useDispatch();
  const workouts = useSelector(selectAllWorkouts);
  const loading = useSelector(selectWorkoutsLoading);

  useEffect(() => {
    dispatch(fetchWorkouts() as any);
  }, [dispatch]);

  return { workouts, loading };
};
```

### Pattern 2: Form Submission
```typescript
const { create, loading } = useCreateWorkout();

const handleSubmit = async (formData) => {
  const result = await dispatch(createWorkout(formData));
  if (!result.error) {
    showSuccess('Workout created!');
    navigation.goBack();
  }
};
```

### Pattern 3: Conditional Rendering
```typescript
if (loading) return <Loading />;
if (error) return <Error message={error} />;
if (!data.length) return <EmptyState />;

return <DataList data={data} />;
```

### Pattern 4: Selector with Filtering
```typescript
// selectors/workoutSelectors.ts
export const selectWorkoutsByDate = (date: Date) => (state: RootState) =>
  state.workouts.workouts.filter((w) => isSameDay(w.date, date));
```

---

## Environment Variables

```bash
# .env
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_APP_NAME=Fitness Tracker
EXPO_PUBLIC_LOG_LEVEL=info
```

---

## Quick Checklist Before Committing

- [ ] All types defined in `src/types/`
- [ ] No `any` types used
- [ ] API calls only in `src/api/services/`
- [ ] State logic only in Redux slices/thunks
- [ ] Components only use hooks, not direct Redux
- [ ] Selectors used for state access
- [ ] Error handling in all thunks
- [ ] Loading states tracked
- [ ] No direct imports from node_modules in components
- [ ] All exports in index files
- [ ] Consistent file naming

---

**Last Updated**: May 7, 2026
**Version**: 1.0
