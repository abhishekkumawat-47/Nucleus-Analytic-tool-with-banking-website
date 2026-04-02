'use client';

import React from 'react';
import { useDashboardData } from '@/hooks/useDashboard';
import { DashboardSkeleton } from '@/components/Skeletons';
import { FunnelStep } from '@/types';

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function toTitleCase(label: string) {
  return label
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function buildStageDiagnostics(funnelData: FunnelStep[]) {
  const entry = funnelData[0]?.value || 0;
  const maxValue = entry || 1;

  return funnelData.map((step, index) => {
    const nextStep = funnelData[index + 1];
    const reachesPct = (step.value / maxValue) * 100;
    const usersLostToNext = nextStep ? Math.max(step.value - nextStep.value, 0) : 0;
    const lossSeverity =
      step.dropOff >= 45 ? 'Critical' : step.dropOff >= 30 ? 'High' : step.dropOff >= 15 ? 'Medium' : 'Low';

    return {
      step,
      index,
      reachesPct,
      usersLostToNext,
      lossSeverity,
      nextStepLabel: nextStep?.label || null,
    };
  });
}

export default function FunnelPage() {
  const { isLoading, funnelData, selectedTenant, timeRange } = useDashboardData();

  if (isLoading && funnelData.length === 0) {
    return <DashboardSkeleton />;
  }

  const entryCount = funnelData[0]?.value || 0;
  const completedCount = funnelData[funnelData.length - 1]?.value || 0;
  const overallConversion = entryCount > 0 ? (completedCount / entryCount) * 100 : 0;
  const totalDropOff = Math.max(100 - overallConversion, 0);
  const diagnostics = buildStageDiagnostics(funnelData);
  const actionableStages = diagnostics.filter((item) => item.index < diagnostics.length - 1);

  const largestLeak = actionableStages.reduce(
    (worst, current) => (current.step.dropOff > worst.step.dropOff ? current : worst),
    actionableStages[0] || {
      step: { label: 'N/A', value: 0, dropOff: 0, color: '#1A73E8' },
      index: 0,
      reachesPct: 0,
      usersLostToNext: 0,
      lossSeverity: 'Low',
      nextStepLabel: null,
    }
  );

  const funnelHealthScore = Math.max(0, Math.round(100 - totalDropOff * 1.05 - largestLeak.step.dropOff * 0.35));
  const projectedRecoveredUsers = Math.round(largestLeak.usersLostToNext * 0.2);
  const projectedNewCompletions = completedCount + projectedRecoveredUsers;
  const projectedConversion = entryCount > 0 ? (projectedNewCompletions / entryCount) * 100 : 0;

  const metricCards = [
    {
      label: 'Entry Users',
      value: entryCount.toLocaleString(),
      note: `${funnelData.length}-step journey`,
      color: 'from-sky-50 to-blue-100',
      border: 'border-sky-200',
    },
    {
      label: 'Overall Conversion',
      value: formatPercent(overallConversion),
      note: `${completedCount.toLocaleString()} users reached final step`,
      color: 'from-emerald-50 to-lime-100',
      border: 'border-emerald-200',
    },
    {
      label: 'Biggest Leak',
      value: `${toTitleCase(largestLeak.step.label)} (${largestLeak.step.dropOff}%)`,
      note: `${largestLeak.usersLostToNext.toLocaleString()} users lost to next stage`,
      color: 'from-rose-50 to-orange-100',
      border: 'border-rose-200',
    },
    {
      label: 'Funnel Health Score',
      value: `${funnelHealthScore}/100`,
      note:
        funnelHealthScore >= 80
          ? 'Strong progression across stages'
          : funnelHealthScore >= 60
            ? 'Stable but with clear optimization headroom'
            : 'Urgent intervention needed at critical leaks',
      color: 'from-violet-50 to-indigo-100',
      border: 'border-indigo-200',
    },
  ];

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <section>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Funnel Analysis</h1>
        <p className="mt-1 text-sm text-gray-500">
          Diagnose conversion drop-offs and prioritize interventions by estimated business impact.
        </p>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">Tenant</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">{toTitleCase(selectedTenant)}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">Time Window</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">{timeRange}</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 stagger-children">
        {metricCards.map((card) => (
          <article
            key={card.label}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{card.value}</p>
            <p className="mt-2 text-xs text-gray-500">{card.note}</p>
          </article>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm xl:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight text-gray-900">Progression Map</h2>
            <p className="text-xs text-gray-500">Each bar is normalized against entry volume</p>
          </div>

          <div className="mt-6 space-y-4">
            {diagnostics.map((item) => {
              const barWidth = Math.max(item.reachesPct, 18);
              const stageLabel = toTitleCase(item.step.label);

              return (
                <div key={item.step.label} className="space-y-1">
                  <div className="flex items-end justify-between text-xs text-gray-500">
                    <span className="font-medium text-gray-700">Stage {item.index + 1}: {stageLabel}</span>
                    <span>{item.step.value.toLocaleString()} users ({formatPercent(item.reachesPct)})</span>
                  </div>
                  <div className="relative h-9 overflow-hidden rounded-lg border border-gray-200 bg-gray-100/80">
                    <div
                      className="h-full rounded-lg bg-gradient-to-r from-[#1a73e8] to-[#4285F4] transition-all duration-700"
                      style={{ width: `${barWidth}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-between px-3 text-xs font-medium text-black">
                      <span>{stageLabel}</span>
                      {item.nextStepLabel ? <span>Drop: {item.step.dropOff}%</span> : <span>Final step</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm xl:col-span-2">
          <h2 className="text-lg font-semibold tracking-tight text-gray-900">Leakage Matrix</h2>
          <p className="mt-1 text-xs text-gray-500">Prioritized by observed drop-off intensity</p>

          <div className="mt-5 space-y-3">
            {actionableStages
              .slice()
              .sort((a, b) => b.step.dropOff - a.step.dropOff)
              .map((stage) => (
                <div key={stage.step.label} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900">{toTitleCase(stage.step.label)}</p>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        stage.lossSeverity === 'Critical'
                          ? 'bg-rose-100 text-rose-700'
                          : stage.lossSeverity === 'High'
                            ? 'bg-orange-100 text-orange-700'
                            : stage.lossSeverity === 'Medium'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {stage.lossSeverity}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-600">
                    {stage.usersLostToNext.toLocaleString()} users lost before {toTitleCase(stage.nextStepLabel || 'next step')}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-gray-500">Drop-off</span>
                    <span className="font-semibold text-gray-900">{stage.step.dropOff}%</span>
                  </div>
                </div>
              ))}
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight text-gray-900">Executive Brief</h2>
          <p className="mt-2 text-sm text-gray-600">
            Current completion rate stands at <span className="font-semibold text-gray-900">{formatPercent(overallConversion)}</span>,
            with the largest friction observed at <span className="font-semibold text-gray-900">{toTitleCase(largestLeak.step.label)}</span>.
            If this stage drop-off improves by 20%, projections indicate <span className="font-semibold text-emerald-700">+{projectedRecoveredUsers.toLocaleString()}</span>{' '}
            recovered users and a potential conversion lift to <span className="font-semibold text-emerald-700">{formatPercent(projectedConversion)}</span>.
          </p>

          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Estimated opportunity</p>
            <p className="mt-1 text-sm text-emerald-900">
              Recovering leakage at the primary bottleneck can improve completion volume by approximately{' '}
              <span className="font-semibold">{Math.max(projectedConversion - overallConversion, 0).toFixed(1)} percentage points</span>.
            </p>
          </div>
        </article>

        <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight text-gray-900">Recommended Experiments</h2>
          <div className="mt-4 space-y-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-sm font-semibold text-gray-900">1. Streamline {toTitleCase(largestLeak.step.label)} flow</p>
              <p className="mt-1 text-xs text-gray-600">
                Reduce form fields, tighten validation messaging, and introduce trust signals where drop-off is highest.
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-sm font-semibold text-gray-900">2. Trigger intent-based nudges</p>
              <p className="mt-1 text-xs text-gray-600">
                Launch in-session prompts for users inactive for 30-45 seconds before moving to the next stage.
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-sm font-semibold text-gray-900">3. Segment and retarget leavers</p>
              <p className="mt-1 text-xs text-gray-600">
                Re-engage users who exit at high-friction stages with contextual follow-up journeys.
              </p>
            </div>
          </div>
        </article>
      </section>

      <div className="text-xs text-gray-500">
        Modeled from {funnelData.length} funnel steps in the active analytics window. Figures update with your selected tenant and time range.
      </div>
    </div>
  );
}
