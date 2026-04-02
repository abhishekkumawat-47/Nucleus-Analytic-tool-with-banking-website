import axios from 'axios';
import { API_BASE_URL } from '@/lib/api';
import { useFeatureToggles } from '@/components/context/FeatureToggleContext';

export const useEventTracker = () => {
  const { toggles } = useFeatureToggles();

  const track = async (eventType: string, metadata?: Record<string, any>) => {
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
    } catch (e) {
      // Fail silently to avoid interrupting UX
      console.warn(`Failed to track event ${eventType}`, e);
    }
  };

  return { track };
};
