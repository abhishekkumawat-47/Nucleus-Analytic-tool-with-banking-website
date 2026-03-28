/**
 * Redux store configuration using Redux Toolkit.
 * Provides typed hooks and centralized state management
 * for the analytics dashboard.
 */

import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import dashboardReducer from './dashboardSlice';

/** Root Redux store */
export const store = configureStore({
  reducer: {
    dashboard: dashboardReducer,
  },
  // Middleware is configured by default with RTK (thunk included)
  devTools: process.env.NODE_ENV !== 'production',
});

/** Infer the `RootState` and `AppDispatch` types from the store itself */
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

/** Typed dispatch hook - use this instead of plain `useDispatch` */
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();

/** Typed selector hook - use this instead of plain `useSelector` */
export const useAppSelector = useSelector.withTypes<RootState>();
