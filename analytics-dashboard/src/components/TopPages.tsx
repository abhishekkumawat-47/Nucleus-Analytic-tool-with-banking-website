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
import { resolveFeature, resolveUrlFromFeature } from '@/lib/feature-map';

interface TopPagesProps {
  data: TopPage[];
}

function TopPages({ data }: TopPagesProps) {
  const baseUrl = process.env.NEXT_PUBLIC_NEXABANK_URL || 'http://localhost:3002';

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
          {data.map((page) => {
            const taxonomyFeatureName = page.url.substring(1); 
            const underscoreFeatureName = page.url.substring(1).replace(/-/g, '_');
            
            let actualUrl = page.url;
            let isClickable = false;

            const mappedUrl = resolveUrlFromFeature(taxonomyFeatureName) || resolveUrlFromFeature(underscoreFeatureName);
            
            if (mappedUrl) {
                actualUrl = mappedUrl;
                isClickable = true;
            } else {
                const mappedFeature = resolveFeature(page.url);
                if (mappedFeature) {
                    isClickable = true;
                }
            }

            return (
              <tr
                key={page.url}
                onClick={() => {
                  if (isClickable) {
                    window.open(`${baseUrl}${actualUrl}`, '_blank');
                  }
                }}
                className={`border-b border-gray-50 last:border-0 transition-colors group ${
                  isClickable ? 'hover:bg-gray-50/50 cursor-pointer' : ''
                }`}
              >
                <td className="py-2.5">
                  <div className="flex items-center gap-2">
                    {isClickable && <ExternalLink className="w-3.5 h-3.5 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />}
                    <span 
                      className={`text-sm font-medium transition-colors ${
                        isClickable ? 'text-gray-700 group-hover:text-blue-600' : 'text-gray-500'
                      }`}
                    >
                      {actualUrl}
                    </span>
                  </div>
                </td>
                <td className="py-2.5 text-right">
                  <span className="text-sm text-gray-600 font-semibold">{page.visits}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </ChartContainer>
  );
}

export default memo(TopPages);
