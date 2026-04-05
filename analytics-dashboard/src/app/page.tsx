'use client';

/**
 * App Selector Landing Page
 * Role-based content:
 *   app_admin    → Links to detailed dashboard + app interaction
 *   super_admin  → Links to cloud summaries + global admin
 *   user         → Redirected away by AuthGuard (never reaches here)
 */

import Link from 'next/link';
import Image from 'next/image';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Cloud,
  LayoutDashboard,
  Eye,
  Wallet,
  ExternalLink,
} from 'lucide-react';
import { APP_REGISTRY } from '@/lib/feature-map';
import { useAppDispatch, useAppSelector } from '@/lib/store';
import { setSelectedTenants } from '@/lib/dashboardSlice';
import { useSession } from 'next-auth/react';
import AuthGuard from '@/components/AuthGuard';

export default function AppSelectorPage() {
  const dispatch = useAppDispatch();
  const { deploymentMode } = useAppSelector((state) => state.dashboard);
  const { data: session, status } = useSession();
  const router = useRouter();

  // Deployment info is now fetched via React Query / API — no thunk needed

  const handleViewDashboard = (appId: string) => {
    dispatch(setSelectedTenants([appId]));
    router.push('/dashboard');
  };

  const allApps = Object.values(APP_REGISTRY);
  const userRole = session?.user?.role || 'user';
  const adminApps: string[] = session?.user?.adminApps || [];

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (userRole === 'super_admin') {
      router.replace('/admin');
    }
  }, [status, userRole, router]);

  const apps =
    userRole === 'super_admin'
      ? allApps
      : allApps.filter((app) => adminApps.includes(app.appId));

  if (status === 'authenticated' && userRole === 'super_admin') {
    return (
      <AuthGuard>
        <div className="flex h-screen items-center justify-center bg-white">
          <Image src="/logo1.png" alt="FinInsights" width={48} height={48} className="animate-pulse" />
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-white flex flex-col">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Image src="/logo1.png" alt="FinInsights Logo" width={32} height={32} className="object-contain" />
              <span className="text-lg font-bold text-gray-900 tracking-tight">
                <span className="text-[#1a73e8]">Fin</span>Insights
              </span>
            </div>
            <div className="flex items-center gap-3">
              {userRole === 'super_admin' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100">
                  Super Admin
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-gray-100 text-gray-700 border border-gray-200">
                  App Admin
                </span>
              )}
              {session?.user?.name && (
                <span className="text-sm text-gray-500 hidden md:inline">
                  {session.user.name}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-5xl mx-auto px-6 py-12 w-full">
          <div className="mb-10">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">
              Your Applications
            </h1>
            <p className="text-gray-500 text-sm max-w-lg">
              {userRole === 'super_admin'
                ? 'View aggregated cloud summaries for all connected applications.'
                : 'Select an application to view detailed analytics or interact with it.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {apps.map((app) => (
              <div
                key={app.appId}
                className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-[#1a73e8]/30 hover:shadow-lg hover:shadow-blue-50 transition-all duration-300 group"
              >
                {/* App Header */}
                <div className="flex items-center gap-3 mb-5">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: app.color + '15' }}
                  >
                    {app.icon === 'wallet' ? (
                      <Wallet className="w-5 h-5" style={{ color: app.color }} />
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        className="w-5 h-5 fill-current"
                        style={{ color: app.color }}
                      >
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-gray-900 group-hover:text-[#1a73e8] transition-colors">
                      {app.displayName}
                    </h2>
                    <p className="text-gray-400 text-xs">{app.description}</p>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="flex items-center gap-4 mb-5 pb-5 border-b border-gray-100">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span>{app.routes.length} routes tracked</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span>{app.funnelSteps.length}-step funnel</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2">
                  {userRole === 'app_admin' && (
                    <>
                      <button
                        onClick={() => handleViewDashboard(app.appId)}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 cursor-pointer"
                        style={{ backgroundColor: app.color }}
                      >
                        <span className="flex items-center gap-2">
                          <LayoutDashboard className="w-4 h-4" />
                          View Dashboard
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <Link
                        href={app.appUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 hover:bg-gray-100 rounded-xl text-sm font-medium text-gray-700 transition-all duration-200 cursor-pointer"
                      >
                        <span>Open App</span>
                        <ExternalLink className="w-4 h-4 text-gray-400" />
                      </Link>
                    </>
                  )}
                  {userRole === 'super_admin' && (
                    <Link
                      href={`/apps/${app.appId}`}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:opacity-90"
                      style={{ backgroundColor: app.color }}
                    >
                      <span className="flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        View Cloud Summary
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              </div>
            ))}

            {/* Add New App Card */}
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 flex items-center justify-center hover:border-[#1a73e8]/30 transition-colors">
              <div className="text-center">
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl text-gray-400 font-light">+</span>
                </div>
                <p className="text-gray-500 font-semibold text-sm">Add New App</p>
                <p className="text-gray-400 text-xs mt-1">
                  Configure in feature-map.ts to connect more apps
                </p>
              </div>
            </div>
          </div>

          {/* Super Admin: Global Admin Link */}
          {userRole === 'super_admin' && (
            <div className="mt-8 flex justify-center">
              <Link
                href="/admin"
                className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
              >
                <Cloud className="w-4 h-4 text-blue-400" />
                Global Admin Overview
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
