import axios from 'axios';

const INGESTION_API_URL = process.env.NEXT_PUBLIC_INGESTION_URL || 'http://localhost:8000/events';

function toAnalyticsTenantId(tenantId?: string): string {
  const normalized = String(tenantId || '').trim().toLowerCase();
  if (normalized === 'bank_a' || normalized === 'jbank') return 'jbank';
  if (normalized === 'bank_b' || normalized === 'obank') return 'obank';
  if (normalized === 'javabank') return 'jbank';
  return normalized || 'jbank';
}

class JavaBankTracker {
  userId: string;
  role: string;
  email: string;
  tenantId: string;

  constructor() {
    this.userId = 'anonymous';
    this.role = 'user';
    this.email = '';
    this.tenantId = 'jbank';
  }

  setUser(userId: string, role: string, email?: string, tenantId?: string) {
    this.userId = userId;
    this.role = role.toLowerCase();
    this.email = email || '';
    this.tenantId = toAnalyticsTenantId(tenantId);
  }

  async track(eventName: string, metadata: Record<string, any> = {}) {
    const device =
      typeof window !== 'undefined' && window.innerWidth < 768
        ? 'mobile'
        : 'desktop';

    const payload = {
      event_name: eventName,
      tenant_id: this.tenantId,
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
      console.log(`[JavaBank Analytics] Tracked: ${eventName}`);
    } catch (error) {
      // Fail silently — analytics should never break the banking app
      console.warn(`[JavaBank Analytics] Failed: ${eventName}`);
    }
  }
}

export const nexaTracker = new JavaBankTracker();
