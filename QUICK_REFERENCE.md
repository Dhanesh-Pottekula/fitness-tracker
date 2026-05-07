# Quick Reference Guide

> **ALWAYS READ** `ARCHITECTURE.md` for complete details

## File Locations

```
API Layer         → src/api/services/
State Logic       → src/state/slices/
Components        → components/ (features, ui)
Custom Hooks      → src/hooks/
Types             → src/types/
Utilities         → src/utils/
Constants         → src/constants/
```

---

## Common Tasks

### 1. Create a New Slice (State Management)

```typescript
// src/state/slices/featureSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// 1. Create async thunk
export const fetchFeature = createAsyncThunk('feature/fetch', async () => {
  return await featureService.get();
});

// 2. Define state interface
interface FeatureState {
  data: any[];
  loading: boolean;
  error: string | null;
}

// 3. Create slice
const slice = createSlice({
  name: 'feature',
  initialState,
  reducers: { /* sync actions */ },
  extraReducers: (builder) => {
    builder.addCase(fetchFeature.fulfilled, (state, action) => {
      state.data = action.payload;
    });
  },
});

export default slice.reducer;
```

### 2. Create a Service

```typescript
// src/api/services/featureService.ts
import client from '../client';
import { API_ENDPOINTS } from '../endpoints';

export const featureService = {
  async get() {
    const { data } = await client.get(API_ENDPOINTS.FEATURE.LIST);
    return data;
  },
};
```

### 3. Create a Custom Hook

```typescript
// src/hooks/useFeature.ts
import { useDispatch, useSelector } from 'react-redux';
import { useEffect } from 'react';
import { fetchFeature } from '@/state/slices/featureSlice';
import { selectFeatureData } from '@/state/selectors/featureSelectors';

export const useFeature = () => {
  const dispatch = useDispatch();
  const data = useSelector(selectFeatureData);

  useEffect(() => {
    dispatch(fetchFeature());
  }, [dispatch]);

  return { data };
};
```

### 4. Create Selectors

```typescript
// src/state/selectors/featureSelectors.ts
import { RootState } from '../store';

export const selectFeatureData = (state: RootState) => state.feature.data;
export const selectFeatureLoading = (state: RootState) => state.feature.loading;
export const selectFeatureError = (state: RootState) => state.feature.error;
```

### 5. Use in Component

```typescript
// Container Component (Connected)
import { useFeature } from '@/hooks/useFeature';

export default function FeatureScreen() {
  const { data, loading, error } = useFeature();
  return <FeatureList data={data} loading={loading} error={error} />;
}

// Presentational Component (Pure)
function FeatureList({ data, loading, error }) {
  if (loading) return <Loading />;
  if (error) return <Error message={error} />;
  return <View>{/* render data */}</View>;
}
```

---

## Import Cheatsheet

```typescript
// Types
import { Workout, User, Stats } from '@/types';

// Hooks
import { useWorkouts, useAuth, useStats } from '@/hooks';

// Utilities
import { formatDate, formatDuration, isValidEmail } from '@/utils';

// Selectors
import { selectAllWorkouts } from '@/state/selectors/workoutSelectors';

// Redux
import { store } from '@/state/store';
import { useDispatch, useSelector } from 'react-redux';

// API
import { workoutService } from '@/api/services';

// Components
import { Button, Card } from '@/components/ui';
```

---

## Redux Flow Diagram

```
Component
   ↓
Custom Hook (useWorkouts)
   ↓
Redux Dispatch (fetchWorkouts)
   ↓
Async Thunk
   ↓
API Service (workoutService.get())
   ↓
Axios Client → API
   ↓
Response → Thunk → Reducer → State
   ↓
Selector
   ↓
Component (re-render)
```

---

## Error Handling Pattern

```typescript
export const fetchWorkouts = createAsyncThunk(
  'workouts/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const data = await workoutService.getWorkouts();
      return data;
    } catch (error) {
      return rejectWithValue(ERROR_MESSAGES.WORKOUT.FETCH_FAILED);
    }
  }
);
```

---

## Loading States Pattern

```typescript
if (loading) return <Loading />;
if (error) return <Error message={error} />;
if (!data.length) return <EmptyState />;

return <DataView data={data} />;
```

---

## DO's ✅

- Use custom hooks in components
- Create selectors for derived state
- Store error messages in constants
- Use types everywhere
- Handle loading/error states
- Add comments to complex logic
- Export from index files

## DON'Ts ❌

- Never call API directly in components
- Never use `any` type
- Never skip error handling
- Never store UI state outside Redux
- Never import deeply nested files (use index exports)
- Never dispatch Redux from services
- Never modify state outside reducers

---

## Key Files to Know

| File | Purpose |
|------|---------|
| `ARCHITECTURE.md` | Complete architecture guide |
| `src/state/store.ts` | Redux store setup |
| `src/api/client.ts` | Axios configuration |
| `src/constants/errors.ts` | Error messages |
| `src/types/index.ts` | All type exports |
| `app/_layout.tsx` | Redux Provider wrapper |

---

## Environment Variables

```bash
# .env file location: root directory
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

---

**For detailed information, refer to ARCHITECTURE.md**
