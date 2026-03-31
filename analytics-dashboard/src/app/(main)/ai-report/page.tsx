"use client";

import React, { useEffect, useState } from 'react';
import { dashboardAPI } from '@/lib/api';
import { useDashboardData } from '@/hooks/useDashboard';
import { Printer, Loader2 } from 'lucide-react';

function simpleMarkdownToHtml(md: string) {
  let html = md
    .replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold mt-6 mb-2">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-8 mb-3 border-b pb-2">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-extrabold mt-10 mb-4">$1</h1>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/^\* (.*$)/gim, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^- (.*$)/gim, '<li class="ml-4 list-disc">$1</li>')
    .replace(/\n\n/gim, '</p><p class="mt-4 mb-4 leading-relaxed">')
    .replace(/\n(?!(<li|<\/ul>|<ul|<h|<p|<\/p>))/gim, '<br/>');
  return `<p class="mt-4 mb-4 leading-relaxed">${html}</p>`;
}

export default function AIReportPage() {
  const { selectedTenant } = useDashboardData();
  const tenantId = selectedTenant || 'nexabank';
  const [report, setReport] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      try {
        const md = await dashboardAPI.getAIReport(tenantId);
        setReport(md);
      } catch (err) {
        setReport('# Error\n\nFailed to generate the AI report.');
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [tenantId]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex-1 space-y-6 lg:p-4 print:p-0">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">AI Summary Report</h1>
          <p className="text-muted-foreground relative text-gray-500">
            Dynamically generated deep-dive insights using your private LLM.
          </p>
        </div>
        <button 
          onClick={handlePrint} 
          className="flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700"
        >
          <Printer className="mr-2 h-5 w-5" />
          Print / Save as PDF
        </button>
      </div>

      <div className="rounded-xl border bg-white shadow-sm print:border-0 print:shadow-none w-full max-w-5xl mx-auto min-h-[500px] p-8">
        <div className="mb-6 border-b pb-4 print:hidden">
          <h2 className="text-2xl font-semibold leading-none tracking-tight">Detailed Analytics Summary</h2>
          <p className="text-sm text-gray-500 mt-2">Generated for {tenantId.toUpperCase()}</p>
        </div>
        
        <div className="prose max-w-none prose-headings:font-semibold prose-a:text-blue-600 prose-p:text-gray-800 text-gray-800">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-20 text-gray-400 animate-pulse">
              <Loader2 className="h-12 w-12 animate-spin mb-4" />
              <p className="text-lg">Analyzing your platform's telemetry data...</p>
              <p className="text-sm mt-2 text-gray-300">This may take a moment depending on the local LLM size.</p>
            </div>
          ) : (
            <div className="space-y-2" dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(report) }} />
          )}
        </div>
      </div>
      
      {/* Hidden element for print header to look professional */}
      <div className="hidden print:block mb-8 border-b pb-4">
        <h1 className="text-4xl font-black">NexaBank Analytics</h1>
        <h2 className="text-2xl mt-2 text-gray-500">AI Detailed Summarization Report</h2>
        <p className="mt-1 text-sm text-gray-400">Target Tenant: {tenantId.toUpperCase()}</p>
        <p className="text-sm text-gray-400">Generated on: {new Date().toLocaleDateString()}</p>
      </div>
    </div>
  );
}
