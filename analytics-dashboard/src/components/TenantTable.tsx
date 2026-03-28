'use client';

/**
 * Tenant Comparison table component.
 * Displays tenant metrics in a clean table format with usage bars.
 * Matches the FinInsight design with inline progress bars.
 */

import React, { memo } from 'react';
import ChartContainer from './ChartContainer';
import { Tenant } from '@/types';

interface TenantTableProps {
  data: Tenant[];
}

function TenantTable({ data }: TenantTableProps) {
  return (
    <ChartContainer title="Tenant Comparison" id="tenant-comparison-table" className="col-span-full">
      <div className="overflow-x-auto mt-2">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 pr-4">
                Tenant
              </th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 pr-4 w-64">
                Feature Usage
              </th>
              <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 pr-4">
                Errors
              </th>
              <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3">
                Adoption Rate
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((tenant) => (
              <tr
                key={tenant.id}
                className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors cursor-pointer group"
              >
                <td className="py-3 pr-4">
                  <span className="text-[13px] font-medium text-gray-900 group-hover:text-[#1a73e8] transition-colors">
                    {tenant.name}
                  </span>
                </td>

                {/* Feature Usage Bar */}
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#1a73e8] rounded-full transition-all duration-700"
                        style={{ width: `${tenant.featureUsage}%` }}
                      />
                    </div>
                  </div>
                </td>

                {/* Errors */}
                <td className="py-3 pr-4 text-center">
                  <span className="text-sm text-gray-700 font-medium">
                    {tenant.errors}
                  </span>
                </td>

                {/* Adoption Rate */}
                <td className="py-3 text-center">
                  <span className="text-sm font-semibold text-gray-900">
                    {tenant.adoptionRate}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartContainer>
  );
}

export default memo(TenantTable);
