'use client';

/**
 * App Selector Landing Page
 * Role-based content:
 *   super_admin  → Links to detailed dashboard + app interaction
 *   company_admin → Links to cloud summaries + global admin
 *   user         → Redirected away by AuthGuard (never reaches here)
 */

import Link from 'next/link';
import { useEffect } from 'react';
import { BarChart3, ArrowRight, Zap, Shield, Cloud, LayoutDashboard, Eye } from 'lucide-react';
import { APP_REGISTRY } from '@/lib/feature-map';
import { useAppDispatch, useAppSelector } from '@/lib/store';
import { fetchDeploymentInfo } from '@/lib/dashboardSlice';

import { useSession } from 'next-auth/react';
import AuthGuard from '@/components/AuthGuard';

export default function AppSelectorPage() {
  const dispatch = useAppDispatch();
  const { deploymentMode } = useAppSelector((state) => state.dashboard);
  const { data: session } = useSession();

  useEffect(() => {
    dispatch(fetchDeploymentInfo());
  }, [dispatch]);

  const apps = Object.values(APP_REGISTRY);
  const userRole = session?.user?.role || 'user';

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-6">
      
      {/* Role Badge */}
      <div className="absolute top-6 right-6 flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
        {userRole === 'super_admin' ? (
          <><Cloud className="w-4 h-4 text-blue-400" /><span className="text-sm font-medium text-blue-100">Super Admin</span></>
        ) : (
          <><Shield className="w-4 h-4 text-orange-400" /><span className="text-sm font-medium text-orange-100">App Admin</span></>
        )}
      </div>

      <div className="text-center mb-12">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Zap className="w-8 h-8 text-blue-400" />
          <h1 className="text-4xl font-bold text-white tracking-tight">Nucleus</h1>
        </div>
        <p className="text-gray-400 text-lg max-w-md mx-auto">
          Feature Intelligence &amp; Usage Analytics Platform
        </p>
        <p className="text-gray-500 text-sm mt-2">
          {userRole === 'super_admin' 
            ? 'View aggregated cloud summaries for all connected apps'
            : 'Select an app to view detailed analytics or interact with it'
          }
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl w-full">
        {apps.map((app) => (
          <div
            key={app.appId}
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 group"
          >
            <div className="flex items-center space-x-3 mb-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: app.color + '20' }}
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" style={{ color: app.color }}>
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{app.displayName}</h2>
                <p className="text-gray-400 text-sm">{app.description}</p>
              </div>
            </div>

            <div className="space-y-2">
              {/* Super Admin: Detailed Dashboard + Open App */}
              {userRole === 'app_admin' && (
                <>
                  <Link
                    href="/dashboard"
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-white transition-all duration-200 group/btn"
                    style={{ backgroundColor: app.color }}
                  >
                    <div className="flex items-center space-x-2">
                      <LayoutDashboard size={16} />
                      <span>View Detailed Dashboard</span>
                    </div>
                    <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                  </Link>

                  <Link
                    href={`/${app.appId}`}
                    className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-medium text-gray-300 transition-all duration-200"
                  >
                    <span>Open App</span>
                    <ArrowRight size={16} />
                  </Link>
                </>
              )}

              {/* Company Admin: Cloud Summary Only */}
              {userRole === 'super_admin' && (
                <Link
                  href={`/apps/${app.appId}`}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-white transition-all duration-200 group/btn"
                  style={{ backgroundColor: app.color }}
                >
                  <div className="flex items-center space-x-2">
                    <Eye size={16} />
                    <span>View Cloud Summary</span>
                  </div>
                  <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                </Link>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-xs text-gray-500">
                Tracking: {app.routes.length} routes • Funnel: {app.funnelSteps.length} steps
              </p>
            </div>
          </div>
        ))}

        {/* Placeholder for future apps */}
        <div className="bg-white/5 backdrop-blur-sm border border-dashed border-white/20 rounded-2xl p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl text-gray-500">+</span>
            </div>
            <p className="text-gray-400 font-medium">Add New App</p>
            <p className="text-gray-500 text-xs mt-1">
              Add entries to feature-map.ts to connect more apps
            </p>
          </div>
        </div>
      </div>

      {/* Super Admin: Global Admin link */}
      {userRole === 'super_admin' && (
        <div className="mt-8">
          <Link
            href="/admin"
            className="flex items-center space-x-2 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-sm font-medium text-white transition-all duration-300"
          >
            <Cloud size={16} className="text-blue-400" />
            <span>Global Admin Overview →</span>
          </Link>
        </div>
      )}
    </div>
    </AuthGuard>
  );
}
