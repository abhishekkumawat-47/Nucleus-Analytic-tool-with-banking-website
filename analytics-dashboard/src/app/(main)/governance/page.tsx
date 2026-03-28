'use client';

import { useDashboardData } from '@/hooks/useDashboard';
import { DashboardSkeleton } from '@/components/Skeletons';
import ChartContainer from '@/components/ChartContainer';

export default function GovernancePage() {
  const { isLoading, auditLogs } = useDashboardData();

  if (isLoading && auditLogs.length === 0) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-[22px] font-medium text-gray-900 tracking-tight">Governance & Security</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Toggles */}
        <div className="lg:col-span-1 space-y-6">
          <ChartContainer title="Data Privacy" id="privacy-controls">
            <div className="space-y-4 mt-2">
              <div className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:border-gray-200 transition-colors">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">PII Masking</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Scrub emails & IPs automatically.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1a73e8]"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:border-gray-200 transition-colors">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Cookie Consent</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Enforce banner compliance tracking.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1a73e8]"></div>
                </label>
              </div>
            </div>
          </ChartContainer>
        </div>

        {/* Right Column: Audit Logs */}
        <div className="lg:col-span-2">
          <ChartContainer title="Audit Logs" id="audit-logs">
            <div className="overflow-x-auto cursor-pointer mt-2">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="text-[13px] text-gray-500 font-medium border-y border-gray-200 bg-gray-50/50">
                  <tr>
                    <th className="px-4 py-3 font-medium">Timestamp</th>
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                    <th className="px-4 py-3 font-medium">Resource</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log, index) => (
                    <tr 
                      key={log.id} 
                      className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${index === auditLogs.length - 1 ? 'border-b-0' : ''}`}
                    >
                      <td className="px-4 py-3 text-gray-400 font-medium whitespace-nowrap">{log.timestamp}</td>
                      <td className="px-4 py-3 text-gray-900 font-medium">{log.user}</td>
                      <td className="px-4 py-3">{log.action}</td>
                      <td className="px-4 py-3 font-mono text-xs">{log.resource}</td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-500">No logs found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </ChartContainer>
        </div>
      </div>
    </div>
  );
}
