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

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayoutClient({ children }: DashboardLayoutProps) {
  const { sidebarCollapsed } = useAppSelector((state: RootState) => state.dashboard);

  return (
    <AuthGuard>
    <div className="min-h-screen bg-[#f8f9fa] font-sans">
      {/* Sidebar - hidden on mobile via CSS, toggled via Redux */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      <div className="lg:hidden">
        {!sidebarCollapsed && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-20" />
            <Sidebar />
          </>
        )}
      </div>

      {/* Main Content Area */}
      <div
        className={`transition-all duration-300 ${
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-56'
        }`}
      >
        <TopNavbar />
        <main className="p-4 lg:p-6 max-w-[1600px] mx-auto">{children}</main>
      </div>
    </div>
    </AuthGuard>
  );
}
