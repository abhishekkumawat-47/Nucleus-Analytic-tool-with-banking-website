import axios from 'axios';
import { API_BASE_URL } from '@/lib/api';

export const useEventTracker = () => {
  const track = async (eventType: string, metadata?: Record<string, any>) => {
    try {
      await axios.post(`${API_BASE_URL}/events/track`, {
        eventType,
        metadata
      }, { withCredentials: true });
    } catch (e) {
      // Fail silently to avoid interrupting UX
      console.warn(`Failed to track event ${eventType}`, e);
    }
  };

  return { track };
};
