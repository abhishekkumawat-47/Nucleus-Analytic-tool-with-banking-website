'use client';

/**
 * Top Pages table component.
 * Shows the most visited pages (URL-based) with total events and feature list.
 * Each row is a page URL with the cumulative event count and features underneath.
 */

import React, { memo } from 'react';
import { ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';
import ChartContainer from './ChartContainer';
import { TopPage } from '@/types';
import { resolveFeature, resolveUrlFromFeature } from '@/lib/feature-map';

interface TopPagesProps {
  data: TopPage[];
}

function TopPages({ data }: TopPagesProps) {
  const baseUrl = process.env.NEXT_PUBLIC_NEXABANK_URL || 'http://localhost:3002';
  const [expandedPage, setExpandedPage] = React.useState<string | null>(null);

  return (
    <ChartContainer title="Top Pages" id="top-pages">
      <table className="w-full mt-2">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider pb-2">
              Page URL
            </th>
            <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider pb-2">
              Events
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((page) => {
            if (!page.pageUrl) return null;

            const pageUrl = page.pageUrl;
            const isExpanded = expandedPage === pageUrl;
            const features = page.features || [];

            // Try to resolve clickable URL
            const taxonomyFeatureName = pageUrl.startsWith('/') ? pageUrl.substring(1) : pageUrl;
            const mappedUrl = resolveUrlFromFeature(taxonomyFeatureName) || resolveUrlFromFeature(taxonomyFeatureName.replace(/-/g, '_'));
            const actualUrl = mappedUrl || pageUrl;
            const isClickable = !!mappedUrl || pageUrl.startsWith('/');

            return (
              <React.Fragment key={pageUrl}>
                <tr
                  className={`border-b border-gray-50 last:border-0 transition-colors group ${
                    isClickable ? 'hover:bg-gray-50/50 cursor-pointer' : ''
                  }`}
                >
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      {features.length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedPage(isExpanded ? null : pageUrl);
                          }}
                          className="p-0.5 hover:bg-gray-100 rounded transition-colors cursor-pointer"
                        >
                          {isExpanded
                            ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                            : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                          }
                        </button>
                      )}
                      {isClickable && (
                        <ExternalLink
                          className="w-3.5 h-3.5 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          onClick={() => window.open(`${baseUrl}${actualUrl}`, '_blank')}
                        />
                      )}
                      <span
                        className={`text-sm font-medium transition-colors ${
                          isClickable ? 'text-gray-700 group-hover:text-blue-600' : 'text-gray-500'
                        }`}
                        onClick={() => {
                          if (isClickable) window.open(`${baseUrl}${actualUrl}`, '_blank');
                        }}
                      >
                        {actualUrl}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 text-right">
                    <span className="text-sm text-gray-600 font-semibold">
                      {typeof page.totalEvents === 'number' ? page.totalEvents.toLocaleString() : page.totalEvents}
                    </span>
                  </td>
                </tr>

                {/* Expanded features list */}
                {isExpanded && features.length > 0 && (
                  <tr>
                    <td colSpan={2} className="pb-2">
                      <div className="ml-8 pl-3 border-l-2 border-blue-100 space-y-1 py-1">
                        {features.map((feature: string) => (
                          <div key={feature} className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-300 flex-shrink-0" />
                            <span className="font-mono">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </ChartContainer>
  );
}

export default memo(TopPages);
