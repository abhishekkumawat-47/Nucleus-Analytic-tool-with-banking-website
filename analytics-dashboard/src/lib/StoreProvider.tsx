'use client';

/**
 * Redux Provider wrapper for Next.js App Router.
 * Wraps the application with the Redux store provider.
 */

import { Provider } from 'react-redux';
import { store } from '@/lib/store';
import { ReactNode } from 'react';

interface StoreProviderProps {
  children: ReactNode;
}

export default function StoreProvider({ children }: StoreProviderProps) {
  return <Provider store={store}>{children}</Provider>;
}
