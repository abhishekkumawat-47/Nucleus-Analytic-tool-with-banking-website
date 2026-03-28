'use client';

/**
 * Top Pages table component.
 * Shows the most visited pages with URL and visit count.
 * Matches the Google Analytics design with clean table styling.
 */

import React, { memo } from 'react';
import { ExternalLink } from 'lucide-react';
import ChartContainer from './ChartContainer';
import { TopPage } from '@/types';

interface TopPagesProps {
  data: TopPage[];
}

function TopPages({ data }: TopPagesProps) {
  return (
    <ChartContainer title="Top Pages" id="top-pages">
      <table className="w-full mt-2">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider pb-2">
              URL
            </th>
            <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider pb-2">
              Visits
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((page) => (
            <tr
              key={page.url}
              className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors group cursor-pointer"
            >
              <td className="py-2.5">
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-sm text-gray-700 group-hover:text-blue-600 transition-colors font-medium">
                    {page.url}
                  </span>
                </div>
              </td>
              <td className="py-2.5 text-right">
                <span className="text-sm text-gray-600 font-semibold">{page.visits}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ChartContainer>
  );
}

export default memo(TopPages);
