import axios from 'axios';

const INGESTION_API_URL = 'http://localhost:8000/events';
const TENANT_ID = 'twitter';

class AnalyticsTracker {
  userId: string;

  constructor() {
    this.userId = typeof window !== 'undefined' ? localStorage.getItem('userEmail') || 'anonymous' : 'anonymous';
  }

  setSession(session: any) {
    if (session?.user?.email) {
      this.userId = session.user.email;
      if (typeof window !== 'undefined') {
        localStorage.setItem('userEmail', session.user.email);
        localStorage.setItem('userName', session.user.name || '');
      }
    }
  }

  async track(eventName: string, metadata: any = {}) {
    // Retrieve real user details from storage
    const email = typeof window !== 'undefined' ? localStorage.getItem('userEmail') : 'guest@example.com';
    const name = typeof window !== 'undefined' ? localStorage.getItem('userName') : 'Guest';
    const device = typeof window !== 'undefined' && window.innerWidth < 768 ? 'mobile' : 'desktop';
    
    // IP and Location can be derived from session if using advanced NextAuth, keeping mock proxy here
    const defaultIp = email?.includes('admin') ? '12.34.56.78' : '98.76.54.32'; 
    const finalIp = metadata.ip || defaultIp;
    
    // Configurable location variable fetched via LocationConsent
    const storedLocation = typeof window !== 'undefined' ? localStorage.getItem('userCountry') : null;
    const defaultLocation = storedLocation || 'Unknown';
    const finalLocation = metadata.location || defaultLocation;

    const payload = {
      event_name: eventName,
      tenant_id: TENANT_ID,
      user_id: this.userId,
      timestamp: Date.now() / 1000,
      channel: 'web',
      metadata: {
        role: email?.includes('admin') ? 'admin' : 'user',
        device_type: device,
        email,
        name,
        ...metadata,
        ip: finalIp,
        location: finalLocation,
      },
    };

    try {
      await axios.post(INGESTION_API_URL, payload);
      console.log(`[Analytics] Tracked: ${eventName}`, payload);
    } catch (error) {
      console.error(`[Analytics] Failed: ${eventName}`, error);
    }
  }
}

export const tracker = new AnalyticsTracker();
