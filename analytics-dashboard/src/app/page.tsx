'use client';

/**
 * App Selector Landing Page
 * Lists all registered applications from the Feature Map config.
 * Provides links to both the app itself and its analytics dashboard.
 */

import Link from 'next/link';
import { BarChart3, ArrowRight, Zap } from 'lucide-react';
import { APP_REGISTRY } from '@/lib/feature-map';

export default function AppSelectorPage() {
  const apps = Object.values(APP_REGISTRY);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-6">
      <div className="text-center mb-12">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Zap className="w-8 h-8 text-blue-400" />
          <h1 className="text-4xl font-bold text-white tracking-tight">Nucleus</h1>
        </div>
        <p className="text-gray-400 text-lg max-w-md mx-auto">
          Feature Intelligence &amp; Usage Analytics Platform
        </p>
        <p className="text-gray-500 text-sm mt-2">
          Select an app to interact with it, then view its live analytics dashboard
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
              <Link
                href={`/${app.appId}`}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-white transition-all duration-200 group/btn"
                style={{ backgroundColor: app.color }}
              >
                <span>Open App</span>
                <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
              </Link>

              <Link
                href={`/apps/${app.appId}`}
                className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-medium text-gray-300 transition-all duration-200"
              >
                <div className="flex items-center space-x-2">
                  <BarChart3 size={16} />
                  <span>View Analytics Dashboard</span>
                </div>
                <ArrowRight size={16} />
              </Link>
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

      <div className="mt-8">
        <Link
          href="/dashboard"
          className="text-gray-500 hover:text-gray-300 text-sm transition flex items-center space-x-1"
        >
          <span>Or view the global analytics dashboard →</span>
        </Link>
      </div>
    </div>
  );
}
