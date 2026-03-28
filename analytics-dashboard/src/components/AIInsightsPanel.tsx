'use client';

/**
 * AI Insights panel component.
 * Displays generated insights in a professional, engaging card-based layout.
 */

import React, { memo } from 'react';
import { TrendingUp, AlertCircle, CheckCircle, Info, Zap } from 'lucide-react';
import ChartContainer from './ChartContainer';
import { AIInsight } from '@/types';

interface AIInsightsPanelProps {
  insights: AIInsight[];
}

const insightStyles: Record<string, { 
  icon: React.ElementType; 
  borderColor: string;
  bgColor: string;
  badgeBg: string;
  badgeText: string;
  iconColor: string;
}> = {
  warning: { 
    icon: AlertCircle, 
    borderColor: 'border-amber-100', 
    bgColor: 'bg-amber-50/30',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-700',
    iconColor: 'text-amber-500'
  },
  success: { 
    icon: CheckCircle, 
    borderColor: 'border-emerald-100', 
    bgColor: 'bg-emerald-50/30',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-700',
    iconColor: 'text-emerald-500'
  },
  info: { 
    icon: Info, 
    borderColor: 'border-blue-100', 
    bgColor: 'bg-blue-50/30',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-700',
    iconColor: 'text-blue-500'
  },
};

function AIInsightsPanel({ insights }: AIInsightsPanelProps) {
  return (
    <ChartContainer title="AI Insights" id="ai-insights-panel">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
        {insights.map((insight) => {
          const style = insightStyles[insight.type] || insightStyles.info;
          const Icon = style.icon;

          return (
            <div
              key={insight.id}
              className={`flex flex-col gap-3 p-4 rounded-xl border ${style.borderColor} ${style.bgColor} hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer relative overflow-hidden`}
            >
              {/* Decorative Accent */}
              <div className={`absolute top-0 right-0 w-24 h-24 -mt-8 -mr-8 opacity-[0.03] ${style.iconColor}`}>
                <Zap className="w-full h-full rotate-12" />
              </div>

              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-lg ${style.badgeBg} ${style.iconColor}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${style.badgeBg} ${style.badgeText}`}>
                  {insight.type === 'warning' ? 'Urgent' : insight.type === 'success' ? 'Growth' : 'Strategic'}
                </span>
              </div>

              <div className="space-y-1 relative z-10">
                <p className="text-[14px] text-gray-800 font-medium leading-tight group-hover:text-gray-900 line-clamp-2">
                  {insight.message}
                </p>
                <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100 mt-2">
                  <TrendingUp className={`w-3 h-3 ${style.iconColor}`} />
                  <span className="text-[11px] text-gray-500 font-medium italic">Confidence: High</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ChartContainer>
  );
}

export default memo(AIInsightsPanel);
