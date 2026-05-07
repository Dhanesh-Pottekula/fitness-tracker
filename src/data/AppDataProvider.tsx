import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { SEED } from './seed';
import { loadAppData, resetAppData, saveAppData } from './storage';
import type { AppData } from './types';

interface AppDataContextValue {
  data: AppData;
  hydrated: boolean;
  setData: (next: AppData | ((previous: AppData) => AppData)) => void;
  resetData: () => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [data, setDataState] = useState<AppData>(SEED);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadAppData().then((loaded) => {
      if (!mounted) return;
      setDataState(loaded);
      setHydrated(true);
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveAppData(data).catch((error) => console.warn('saveAppData failed', error));
  }, [data, hydrated]);

  const value = useMemo<AppDataContextValue>(
    () => ({
      data,
      hydrated,
      setData: (next) => setDataState((previous) => (typeof next === 'function' ? next(previous) : next)),
      resetData: async () => {
        const seed = await resetAppData();
        setDataState(seed);
      },
    }),
    [data, hydrated],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) throw new Error('useAppData must be used inside AppDataProvider');
  return context;
}
