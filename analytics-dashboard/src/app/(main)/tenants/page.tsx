'use client';

import React from 'react';
import { useDashboardData } from '@/hooks/useDashboard';
import { DashboardSkeleton } from '@/components/Skeletons';
import TenantTable from '@/components/TenantTable';

export default function TenantsPage() {
  const { isLoading, tenants } = useDashboardData();

  if (isLoading && tenants.length === 0) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-6">Tenants</h1>
      
      <div className="grid grid-cols-1 gap-6">
        <TenantTable data={tenants} />
      </div>
    </div>
  );
}
