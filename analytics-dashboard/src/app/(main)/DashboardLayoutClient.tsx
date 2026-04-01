'use client';

/**
 * Dashboard layout component.
 * Wraps dashboard pages with sidebar and top navbar.
 * Handles responsive sidebar behavior.
 */

import { ReactNode } from 'react';
import Sidebar from '@/components/Sidebar';
import TopNavbar from '@/components/TopNavbar';
import { useAppSelector, RootState } from '@/lib/store';
import AuthGuard from '@/components/AuthGuard';
import { useRealtimeEvents } from '@/hooks/useRealtimeEvents';
import { Activity, Wifi } from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayoutClient({ children }: DashboardLayoutProps) {
  const { sidebarCollapsed } = useAppSelector((state: RootState) => state.dashboard);
  const { isConnected, lastEvent } = useRealtimeEvents();

  return (
    <AuthGuard>
    <div className="min-h-screen bg-[#f8f9fa] font-sans relative">
      {/* Sidebar - hidden on mobile via CSS, toggled via Redux */}
      <div className="hidden lg:block print:hidden">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      <div className="lg:hidden print:hidden">
        {!sidebarCollapsed && (
          <>
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-20 print:hidden" />
            <Sidebar />
          </>
        )}
      </div>

      {/* Main Content Area */}
      <div
        className={`transition-all duration-300 print:ml-0 ${
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-56'
        }`}
      >
        <div className="print:hidden">
          <TopNavbar />
        </div>
        <main className="p-4 lg:p-6 max-w-[1600px] mx-auto print:p-0 print:max-w-none">{children}</main>
      </div>

      {/* Realtime Event Feed Overlay */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none items-end print:hidden">
        {lastEvent && (
          <div key={lastEvent.timestamp} className="animate-in slide-in-from-bottom-5 fade-in duration-500 bg-white p-3 rounded-xl shadow-2xl border border-zinc-100 flex items-center gap-4 self-end pointer-events-auto min-w-[250px]">
            <div className="bg-blue-100 text-blue-600 p-2 rounded-lg flex-shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-zinc-500 font-bold uppercase mb-0.5 tracking-wide">Live Event</p>
              <p className="text-sm font-bold text-zinc-900 truncate">
                {lastEvent.data.eventName.replace(/_/g, ' ').toUpperCase()}
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
    </AuthGuard>
  );
}
