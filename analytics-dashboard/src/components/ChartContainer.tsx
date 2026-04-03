'use client';

/**
 * Reusable chart wrapper component.
 * Provides consistent card styling, title, and optional controls
 * for all chart components in the dashboard.
 */

import React, { memo, ReactNode } from 'react';

interface ChartContainerProps {
  title: string;
  children: ReactNode;
  /** Optional right-side actions/controls */
  actions?: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Container ID for testing */
  id?: string;
}

function ChartContainer({
  title,
  children,
  actions,
  className = '',
  id,
}: ChartContainerProps) {
  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden ${className}`}
      id={id}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 sm:px-5 sm:pt-4 border-b border-gray-100 mb-4">
        <h3 className="text-[15px] font-medium text-gray-800 tracking-tight">{title}</h3>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {/* Chart Content */}
      <div className="px-4 pb-4 sm:px-8 sm:pb-5">{children}</div>
    </div>
  );
}

export default memo(ChartContainer);
