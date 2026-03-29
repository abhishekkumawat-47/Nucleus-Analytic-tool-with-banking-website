'use client';

import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { canAccessRoute } from '@/lib/rbac';
import { Zap } from 'lucide-react';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      router.replace('/login');
      return;
    }

    if (session?.user?.role) {
      if (!canAccessRoute(session.user.role, pathname)) {
        router.replace('/unauthorized');
        return;
      }
      setAuthorized(true);
    }
  }, [session, status, pathname, router]);

  if (status === 'loading' || !authorized) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50 flex-col space-y-4">
        <Zap className="w-10 h-10 text-blue-500 animate-pulse" />
        <p className="text-sm font-medium text-gray-400">Verifying permissions...</p>
      </div>
    );
  }

  return <>{children}</>;
}
