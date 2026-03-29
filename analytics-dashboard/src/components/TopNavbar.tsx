'use client';

/**
 * Top navigation bar component.
 * Contains tenant selector, time range filter, search, notifications, and profile.
 * Matches the FinInsight design with clean, minimal styling.
 */

import React, { memo, useState, useRef, useEffect } from 'react';
import {
  Search,
  ChevronDown,
  Calendar,
  Cloud,
  Server,
  Menu,
  ShieldAlert,
  X
} from 'lucide-react';
import Image from 'next/image';
import { useAppDispatch, useAppSelector } from '@/lib/store';
import { dashboardAPI } from '@/lib/api';
import { useSession, signOut } from 'next-auth/react';
import {
  setTimeRange,
  setSelectedTenant,
  toggleSidebar,
} from '@/lib/dashboardSlice';
import { TimeRange, DeploymentMode } from '@/types';

const timeRanges: TimeRange[] = ['Last 7 Days', 'Last 30 Days', 'Last 90 Days', 'Custom'];
const tenantOptions = ['twitter', 'Beta Industries', 'Gamma Ltd'];

function TopNavbar() {
  const dispatch = useAppDispatch();
  const { timeRange, selectedTenant, deploymentMode } = useAppSelector(
    (state) => state.dashboard
  );
  const { data: session } = useSession();

  const [showTenantDropdown, setShowTenantDropdown] = useState(false);
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  
  const [showTransparency, setShowTransparency] = useState(false);
  const [transparencyData, setTransparencyData] = useState<any>(null);
  const [transparencyLoading, setTransparencyLoading] = useState(false);

  const tenantRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const transparencyRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tenantRef.current && !tenantRef.current.contains(event.target as Node)) {
        setShowTenantDropdown(false);
      }
      if (timeRef.current && !timeRef.current.contains(event.target as Node)) {
        setShowTimeDropdown(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
      if (transparencyRef.current && !transparencyRef.current.contains(event.target as Node)) {
        setShowTransparency(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTransparencyClick = async () => {
    setShowTransparency(!showTransparency);
    if (!showTransparency && !transparencyData) {
      setTransparencyLoading(true);
      const data = await dashboardAPI.getTransparencyInfo(selectedTenant || 'twitter');
      setTransparencyData(data);
      setTransparencyLoading(false);
    }
  };

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-4 lg:px-6 h-16">
        {/* Left Section: Mobile menu + Tenant Selector */}
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-500"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo Branding (Mobile/Small screens) */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="relative w-7 h-7">
              <Image
                src="/logo1.png"
                alt="FinInsight Logo"
                fill
                className="object-contain"
                sizes="28px"
              />
            </div>
            <span className="text-base font-semibold text-gray-900 tracking-tight">Nucleus</span>
          </div>

          {/* Tenant Selector Dropdown */}
          <div ref={tenantRef} className="relative">
            <button
              onClick={() => setShowTenantDropdown(!showTenantDropdown)}
              className="flex items-center cursor-pointer gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-gray-300 transition-colors"
              id="tenant-selector"
            >
              {selectedTenant}
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {showTenantDropdown && (
              <div className="absolute cursor-pointer top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                {tenantOptions.map((tenant) => (
                  <button
                    key={tenant}
                    onClick={() => {
                      dispatch(setSelectedTenant(tenant));
                      setShowTenantDropdown(false);
                    }}
                    className={`w-full cursor-pointer text-left px-4 py-2 text-sm transition-colors ${
                      tenant === selectedTenant
                        ? 'bg-blue-50 text-blue-600 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {tenant}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center Section: Time Range + Deployment Toggle */}
        <div className="hidden md:flex items-center gap-3">
          {/* Time Range Selector */}
          <div ref={timeRef} className="relative">
            <button
              onClick={() => setShowTimeDropdown(!showTimeDropdown)}
              className="flex items-center cursor-pointer gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-gray-300 transition-colors"
              id="time-range-selector"
            >
              <Calendar className="w-4 h-4 text-gray-400" />
              {timeRange}
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {showTimeDropdown && (
              <div className="absolute cursor-pointer top-full right-0 mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                {timeRanges.map((range) => (
                  <button
                    key={range}
                    onClick={() => {
                      dispatch(setTimeRange(range));
                      setShowTimeDropdown(false);
                    }}
                    className={`w-full cursor-pointer text-left px-4 py-2 text-sm transition-colors ${
                      range === timeRange
                        ? 'bg-blue-50 text-blue-600 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Transparency Info Button */}
          <div className="relative" ref={transparencyRef}>
            <button
              onClick={handleTransparencyClick}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 shadow-sm`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Data Sync & Transparency</span>
            </button>

            {showTransparency && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="text-sm font-bold text-gray-900">Cloud Sync Status</h3>
                  <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${deploymentMode === 'cloud' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                    {deploymentMode === 'cloud' ? 'Cloud Mode' : 'On-Prem Mode'}
                  </div>
                </div>

                <div className="p-4">
                  {transparencyLoading ? (
                    <div className="text-sm text-center py-4 text-gray-500">Loading transparency boundaries...</div>
                  ) : transparencyData ? (
                    <div className="space-y-4">
                      <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-100 font-medium">
                        {transparencyData.message}
                      </p>
                      
                      <div className="space-y-3">
                        {transparencyData.visible_categories.map((cat: any, ix: number) => (
                          <div key={ix} className="text-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`w-2 h-2 rounded-full ${cat.is_synced ? 'bg-blue-500' : 'bg-gray-300'}`}></span>
                              <strong className={cat.is_synced ? 'text-blue-900' : 'text-gray-500'}>{cat.category}</strong>
                            </div>
                            <p className="text-gray-500 line-clamp-2 pl-4">{cat.details}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-center py-4 text-gray-500">Data unavailable.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Section: Search, Notifications, Profile */}
        {/* Right Section: Search, Notifications, Profile */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 bg-[#f1f3f4] px-3 py-2 rounded-lg border border-transparent focus-within:bg-white focus-within:shadow-[0_1px_2px_rgba(0,0,0,0.1)] focus-within:border-gray-300 transition-all duration-200">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent text-[14px] text-gray-700 placeholder-gray-500 outline-none focus:ring-0 focus:outline-none w-32 md:w-48 lg:w-64 border-none"
              id="global-search"
            />
          </div>

          {/* Profile Avatar with Dropdown */}
          <div ref={profileRef} className="relative">
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="w-8 h-8 cursor-pointer rounded-full bg-[#1a73e8] flex items-center justify-center text-white text-[13px] font-medium hover:bg-blue-700 transition-colors duration-200 uppercase"
              id="profile-btn"
            >
              {session?.user?.name ? session.user.name.charAt(0) : session?.user?.email?.charAt(0) || 'U'}
            </button>
            {showProfileDropdown && (
              <div className="absolute cursor-pointer right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-left">
                <div className="px-4 py-3 cursor-pointer border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{session?.user?.name || 'Admin User'}</p>
                  <p className="text-xs text-gray-500 truncate">{session?.user?.email}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded uppercase tracking-wide">
                    {session?.user?.role?.replace('_', ' ')}
                  </span>
                </div>
                <div className="py-1">
                  <button className="w-full cursor-pointer text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Account Settings</button>
                  <button className="w-full cursor-pointer text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Preferences</button>
                </div>
                <div className="border-t cursor-pointer border-gray-100 py-1">
                  <button onClick={() => signOut()} className="w-full cursor-pointer text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50">Sign Out</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default memo(TopNavbar);
