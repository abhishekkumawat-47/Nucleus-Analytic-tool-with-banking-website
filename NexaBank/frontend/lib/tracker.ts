import axios from 'axios';

const INGESTION_API_URL = 'http://localhost:8000/events';
const TENANT_ID = 'nexabank';

class NexaBankTracker {
  userId: string;
  role: string;
  email: string;

  constructor() {
    this.userId = 'anonymous';
    this.role = 'user';
    this.email = '';
  }

  setUser(userId: string, role: string, email?: string) {
    this.userId = userId;
    this.role = role.toLowerCase();
    this.email = email || '';
  }

  async track(eventName: string, metadata: Record<string, any> = {}) {
    const device =
      typeof window !== 'undefined' && window.innerWidth < 768
        ? 'mobile'
        : 'desktop';

    const payload = {
      event_name: eventName,
      tenant_id: TENANT_ID,
      user_id: this.userId,
      timestamp: Date.now() / 1000,
      channel: 'web',
      metadata: {
        role: this.role,
        device_type: device,
        email: this.email,
        ...metadata,
      },
    };

    try {
      await axios.post(INGESTION_API_URL, payload, { timeout: 3000 });
      console.log(`[NexaBank Analytics] Tracked: ${eventName}`);
    } catch (error) {
      // Fail silently — analytics should never break the banking app
      console.warn(`[NexaBank Analytics] Failed: ${eventName}`);
    }
  }
}

export const nexaTracker = new NexaBankTracker();
