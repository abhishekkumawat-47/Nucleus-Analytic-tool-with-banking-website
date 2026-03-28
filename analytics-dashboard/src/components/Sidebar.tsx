'use client';

/**
 * Sidebar navigation component.
 * Provides the main navigation for the dashboard with icon + label items.
 * Matches the FinInsight design with blue active state highlighting.
 */

import React, { memo } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import {
  LayoutDashboard,
  BarChart3,
  Filter,
  Users,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/lib/store';
import { toggleSidebar } from '@/lib/dashboardSlice';
import Link from 'next/link';

/** Maps icon string identifiers to Lucide icon components */
const iconMap: Record<string, React.ElementType> = {
  'layout-dashboard': LayoutDashboard,
  'bar-chart-3': BarChart3,
  filter: Filter,
  users: Users,
  settings: Settings,
  shield: Shield,
};

interface SidebarProps {}

function Sidebar(_props: SidebarProps) {
  const dispatch = useAppDispatch();
  const { sidebarCollapsed } = useAppSelector((state) => state.dashboard);
  const pathname = usePathname();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard', href: '/dashboard' },
    { id: 'features', label: 'Feature Analytics', icon: 'bar-chart-3', href: '/features' },
    { id: 'funnel', label: 'Funnel Analysis', icon: 'filter', href: '/funnel' },
    { id: 'tenants', label: 'Tenants', icon: 'users', href: '/tenants' },
    { id: 'config', label: 'Configuration', icon: 'settings', href: '/settings' },
    { id: 'governance', label: 'Governance', icon: 'shield', href: '/governance' },
  ];

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-white border-r border-gray-100 z-30 flex flex-col transition-all duration-300 ${
        sidebarCollapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Logo / Brand */}
      <div className={`flex items-center gap-2 border-b border-gray-100 h-16 ${sidebarCollapsed ? 'justify-center' : 'px-6'}`}>
        <Link href="/dashboard" className="relative w-10 h-10 flex-shrink-0 transition-transform duration-300">
          <Image
            src="/logo1.png"
            alt="FinInsight Logo"
            fill
            className="object-contain"
            priority
            sizes="40px"
          />
        </Link>
        {!sidebarCollapsed && (
          <span className="text-[18px] font-bold text-gray-900 tracking-tight">
            <span className='text-[#1a73e8] font-bold'>Fin</span>Insight
          </span>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 py-4 space-y-1">
        {navItems.map((item) => {
          const IconComponent = iconMap[item.icon] || LayoutDashboard;
          const isActive = pathname === item.href || (item.id === 'dashboard' && pathname === '/');

          return (
            <a
              key={item.id}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 mx-3 rounded-lg text-[13px] font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-[#f1f3f4] text-[#1a73e8]'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <IconComponent
                className={`w-[18px] h-[18px] flex-shrink-0 transition-colors ${
                  isActive ? 'text-[#1a73e8]' : 'text-gray-500 group-hover:text-gray-700'
                }`}
              />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </a>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={() => dispatch(toggleSidebar())}
        className="mx-3 mb-4  cursor-pointer p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center"
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {sidebarCollapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>
    </aside>
  );
}

export default memo(Sidebar);
