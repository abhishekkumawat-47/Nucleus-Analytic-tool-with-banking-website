'use client';

/**
 * Auto-instrumentation hook for page tracking.
 * Drop this into any page component to automatically track page views
 * using the feature mapping config. Zero manual effort required.
 */

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { resolveFeature } from './feature-map';
import { tracker } from './tracker';

export function useAutoTrack() {
  const pathname = usePathname();
  const startTime = useRef(Date.now());

  useEffect(() => {
    const responseTime = Date.now() - startTime.current;
    const resolved = resolveFeature(pathname);

    if (resolved) {
      tracker.trackPageView(pathname, resolved.appId, resolved.featureName, responseTime);
    }
  }, [pathname]);
}
