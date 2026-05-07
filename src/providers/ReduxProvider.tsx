/**
 * Redux Provider Wrapper
 * Wraps the app with Redux store
 */

import { store } from '@/state/store';
import React from 'react';
import { Provider } from 'react-redux';

interface ReduxProviderProps {
  children: React.ReactNode;
}

export const ReduxProvider: React.FC<ReduxProviderProps> = ({ children }) => (
  <Provider store={store}>{children}</Provider>
);
