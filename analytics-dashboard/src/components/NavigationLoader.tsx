'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function NavigationLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = useMemo(() => {
    const query = searchParams?.toString() || '';
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  const [loading, setLoading] = useState(false);
  const pendingRouteRef = useRef<string | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#')) return;

      try {
        const nextUrl = new URL(anchor.href, window.location.href);
        const currentUrl = new URL(window.location.href);
        if (nextUrl.origin !== currentUrl.origin) return;

        const nextKey = `${nextUrl.pathname}${nextUrl.search}`;
        const currentKey = `${currentUrl.pathname}${currentUrl.search}`;
        if (nextKey === currentKey) return;

        pendingRouteRef.current = nextKey;
        setLoading(true);

        if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = setTimeout(() => {
          setLoading(false);
          pendingRouteRef.current = null;
        }, 8000);
      } catch {
        // Ignore URL parsing errors and skip loader.
      }
    };

    window.addEventListener('click', onDocumentClick, true);
    return () => window.removeEventListener('click', onDocumentClick, true);
  }, []);

  useEffect(() => {
    if (!loading) return;

    const doneTimer = setTimeout(() => {
      setLoading(false);
      pendingRouteRef.current = null;
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    }, 250);

    return () => clearTimeout(doneTimer);
  }, [routeKey, loading]);

  if (!loading) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[9999]">
      <div className="h-1 w-full bg-blue-100/80">
        <div className="h-full w-1/2 bg-[#1a73e8] animate-pulse" />
      </div>
    </div>
  );
}
