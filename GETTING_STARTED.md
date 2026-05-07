# Getting Started Checklist

> Complete this checklist before building features

## ✅ Pre-Development Setup

- [x] Redux Toolkit installed (`@reduxjs/toolkit`)
- [x] React-Redux installed (`react-redux`)
- [x] Axios installed (`axios`)
- [x] Reselect installed (`reselect`)
- [x] Path aliases configured in `tsconfig.json`
- [x] Redux Provider wrapped in `app/_layout.tsx`
- [x] API client configured (`src/api/client.ts`)
- [x] Type definitions created (`src/types/`)

## 📚 Before Writing Code

1. **Read the Architecture**
   - [ ] Read `ARCHITECTURE.md` completely
   - [ ] Read `QUICK_REFERENCE.md` for common patterns
   - [ ] Review `src/screens/ExampleWorkoutListScreen.tsx`

2. **Understand the Flow**
   - [ ] API calls happen in `src/api/services/`
   - [ ] State changes happen in `src/state/slices/`
   - [ ] Components use `src/hooks/`
   - [ ] All types from `src/types/`

3. **Check Project Structure**
   - [ ] `src/api/services/` - API layer exists
   - [ ] `src/state/slices/` - Redux slices exist
   - [ ] `src/hooks/` - Custom hooks exist
   - [ ] `src/types/` - Type definitions exist
   - [ ] `src/utils/` - Utilities exist

## 🚀 When Adding a New Feature

### Step 1: Define Types
```bash
# File: src/types/myfeature.ts
```

### Step 2: Create Service
```bash
# File: src/api/services/myfeatureService.ts
```

### Step 3: Create Slice
```bash
# File: src/state/slices/myfeatureSlice.ts
# - Define state interface
# - Create async thunks
# - Create slice with reducers
```

### Step 4: Create Selectors
```bash
# File: src/state/selectors/myfeatureSelectors.ts
```

### Step 5: Create Hook
```bash
# File: src/hooks/useMyfeature.ts
```

### Step 6: Create Components
```bash
# File: components/features/myfeature/MyfeatureComponent.tsx
```

### Step 7: Update Store
```bash
# File: src/state/store.ts
# Add new slice to reducer
```

## 🛠️ Common Commands

```bash
# Install dependencies
npm install

# Run development server
npm run ios        # iOS
npm run android    # Android
npm run web        # Web

# Lint code
npm run lint

# Type check
npx tsc --noEmit
```

## 📝 Code Review Checklist

Before committing, ensure:

- [ ] All types are defined (no `any`)
- [ ] API calls only in `src/api/services/`
- [ ] State logic only in Redux slices
- [ ] Components use hooks, not direct Redux
- [ ] Selectors created for derived state
- [ ] Error handling in all thunks
- [ ] Loading states tracked
- [ ] Comments added to complex logic
- [ ] No deep imports (use index exports)
- [ ] Consistent file naming
- [ ] Path aliases used (@/*)

## 🔍 Debugging Tips

### Redux DevTools
```bash
# Install Redux DevTools extension in browser
# Automatically enabled in development
```

### Check State
```typescript
const state = useSelector(state => state);
console.log(state); // See entire Redux state
```

### Trace API Calls
```typescript
// Check src/api/client.ts interceptors
// All requests logged to console
```

### Check Selectors
```typescript
const data = useSelector(selectMyData);
// Verify selector is working
```

## 📞 Getting Help

1. **Architecture Questions** → Read `ARCHITECTURE.md`
2. **Quick Questions** → Check `QUICK_REFERENCE.md`
3. **Code Examples** → See `src/screens/ExampleWorkoutListScreen.tsx`
4. **Type Questions** → Check `src/types/`
5. **API Questions** → Check `src/api/services/`

## 🎯 Common Mistakes

### Mistake 1: API calls in components
```typescript
❌ WRONG
useEffect(() => {
  axios.get('/api/workouts').then(setData);
}, []);

✅ CORRECT
const { workouts } = useWorkouts();
```

### Mistake 2: Accessing Redux directly in presentational components
```typescript
❌ WRONG
function MyComponent() {
  const data = useSelector(selectAllData);
  return <View>{data}</View>;
}

✅ CORRECT
function MyComponent() {
  const { data } = useMyHook();
  return <View>{data}</View>;
}
```

### Mistake 3: Not using types
```typescript
❌ WRONG
const data = response.data;

✅ CORRECT
const data: Workout[] = response.data;
```

### Mistake 4: Deep imports
```typescript
❌ WRONG
import { useWorkouts } from '../../hooks/useWorkouts';

✅ CORRECT
import { useWorkouts } from '@/hooks';
```

## 📊 Project Statistics

- **Total Redux Slices**: 4 (workouts, user, auth, stats)
- **Total Custom Hooks**: 10+
- **Total Services**: 3 (workout, user, stats)
- **Total Selectors**: 20+
- **Type Definitions**: 30+

## 🔗 Key Files Reference

| What | Where |
|------|-------|
| Architecture Guide | `/ARCHITECTURE.md` |
| Quick Reference | `/QUICK_REFERENCE.md` |
| Redux Store | `src/state/store.ts` |
| API Client | `src/api/client.ts` |
| Example Component | `src/screens/ExampleWorkoutListScreen.tsx` |
| Type Definitions | `src/types/` |
| Redux Slices | `src/state/slices/` |
| Custom Hooks | `src/hooks/` |
| API Services | `src/api/services/` |

## ✨ Next Steps

1. Read `ARCHITECTURE.md` thoroughly
2. Review the example component
3. Pick a small feature to implement
4. Follow the "When Adding a New Feature" steps above
5. Test thoroughly
6. Submit for code review
7. Get feedback and iterate

---

**Happy Coding! 🚀**

*Last Updated: May 7, 2026*
