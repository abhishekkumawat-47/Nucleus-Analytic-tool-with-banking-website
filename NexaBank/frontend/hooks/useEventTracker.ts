import axios from 'axios';
import { useCallback } from 'react';
import { API_BASE_URL } from '@/lib/api';
import { useFeatureToggles } from '@/components/context/FeatureToggleContext';

export interface EventMetadata {
  responseTime?: number;
  error?: string | unknown;
  amount?: number;
  currency?: string;
  [key: string]: unknown;
}

export const useEventTracker = () => {
  const { toggles } = useFeatureToggles();

  const track = useCallback(async (eventType: string, metadata?: EventMetadata) => {
    // If the toggle is explicitly set to false, skip tracking
    if (toggles && toggles[eventType] === false) {
      console.log(`Tracking disabled for feature: ${eventType}`);
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/events/track`, {
        eventType,
        metadata
      }, { withCredentials: true });
    } catch (e: unknown) {
      // Fail silently to avoid interrupting UX
      console.warn(`Failed to track event ${eventType}`, e);
    }
  }, [toggles]);

  const measureAndTrack = useCallback(async <T,>(
    eventType: string, 
    action: () => Promise<T>, 
    baseMetadata?: EventMetadata
  ): Promise<T> => {
    const start = performance.now();
    try {
      const result = await action();
      const end = performance.now();
      await track(`${eventType}.success`, { ...baseMetadata, responseTime: Math.round(end - start) });
      return result;
    } catch (error: unknown) {
      const end = performance.now();
      await track(`${eventType}.error`, { 
        ...baseMetadata, 
        responseTime: Math.round(end - start), 
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }, [track]);

  return { track, measureAndTrack };
};
