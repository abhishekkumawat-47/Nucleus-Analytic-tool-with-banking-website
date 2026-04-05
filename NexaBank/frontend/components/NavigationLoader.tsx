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

        setLoading(true);

        if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = setTimeout(() => {
          setLoading(false);
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
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    }, 250);

    return () => clearTimeout(doneTimer);
  }, [routeKey, loading]);

  if (!loading) return null;

    return (
      <div className="pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center bg-white/80 backdrop-blur-sm">
        <div className="w-full max-w-md px-6">
          <div className="rounded-2xl border border-blue-100 bg-white px-6 py-5 shadow-[0_20px_60px_rgba(26,115,232,0.12)]">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 shrink-0">
                <div className="absolute inset-0 rounded-full border-2 border-blue-100" />
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#1a73e8] border-r-[#1a73e8] animate-spin" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Loading NexaBank</p>
                <p className="text-xs text-gray-500">Preparing your next page...</p>
              </div>
            </div>

            <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-blue-50">
              <div className="h-full w-1/2 rounded-full bg-[#1a73e8] animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
}
