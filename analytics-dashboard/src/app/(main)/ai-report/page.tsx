"use client";

import React, { useEffect, useState } from 'react';
import { dashboardAPI } from '@/lib/api';
import { useDashboardData } from '@/hooks/useDashboard';
import { Printer, Loader2 } from 'lucide-react';

function simpleMarkdownToHtml(md: string) {
  let html = md
    .replace(/^### (.*$)/gim, '<h3 class="text-2xl font-bold mt-8 mb-3 text-slate-800 print:text-black">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-3xl font-bold mt-10 mb-4 border-b pb-2 text-slate-900 print:text-black">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-4xl font-extrabold mt-12 mb-6 text-slate-900 print:text-black">$1</h1>')
    .replace(/\*\*(.*)\*\*/gim, '<strong class="font-semibold text-slate-900 print:text-black">$1</strong>')
    .replace(/\*(.*)\*/gim, '<em class="italic text-slate-700 print:text-black">$1</em>')
    .replace(/^\* (.*$)/gim, '<li class="ml-6 list-disc mb-2 text-slate-700 print:text-black">$1</li>')
    .replace(/^- (.*$)/gim, '<li class="ml-6 list-disc mb-2 text-slate-700 print:text-black">$1</li>')
    .replace(/<mark>(.*?)<\/mark>/gim, '<mark class="bg-yellow-200 px-1 rounded text-yellow-900 font-semibold">$1</mark>')
    .replace(/\n\n/gim, '</p><p class="mt-5 mb-5 leading-relaxed text-lg text-slate-700 print:text-black">')
    .replace(/\n(?!(<li|<\/ul>|<ul|<h|<p|<\/p>|<div|<\/div>|<span|<\/span>|<hr|<table|<\/table>|<\/tbody>|<tbody>|<tr|<\/tr>|<td|<\/td>|<th|<\/th>|<mark|<\/mark>))/gim, '<br/>');
  return `<p class="mt-5 mb-5 leading-relaxed text-lg text-slate-700 print:text-black">${html}</p>`;
}

export default function AIReportPage() {
  const { selectedTenant } = useDashboardData();
  const tenantId = selectedTenant || 'nexabank';
  const [report, setReport] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const fetchReport = async () => {
      setLoading(true);
      while (isMounted) {
        try {
          const md = await dashboardAPI.getAIReport(tenantId);
          if (isMounted) {
            setReport(md);
            setLoading(false);
            break;
          }
        } catch (err) {
          console.warn("Retrying AI report fetch in 5 seconds...", err);
          // Wait 5 seconds before retrying
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    };
    fetchReport();
    
    return () => {
      isMounted = false;
    };
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

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm print:border-0 print:shadow-none w-full max-w-[1000px] mx-auto min-h-[500px] p-10 print:p-0">
        <div className="mb-8 border-b border-slate-100 pb-5 print:hidden">
          <h2 className="text-2xl font-semibold leading-none tracking-tight">Detailed Analytics Summary</h2>
          <p className="text-sm text-gray-500 mt-2">Generated for {tenantId.toUpperCase()}</p>
        </div>
        
        <div className="prose max-w-none prose-headings:font-semibold prose-a:text-blue-600 prose-p:text-gray-800 text-gray-800">
          {loading ? (
            <div className="animate-pulse w-full">
              {/* Fake KPI Cards */}
              <div className="mb-8">
                <div className="h-6 w-64 bg-slate-200 rounded mb-5"></div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm">
                      <div className="h-3 w-24 bg-slate-200 rounded mb-4"></div>
                      <div className="h-8 w-16 bg-slate-300 rounded"></div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Fake Heatmap */}
              <div className="mb-10 p-8 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex gap-2 items-center mb-6">
                  <div className="w-1 h-5 bg-blue-500 rounded-sm"></div>
                  <div className="h-5 w-48 bg-slate-200 rounded"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="p-5 bg-white rounded-xl border border-slate-100">
                      <div className="flex justify-between mb-3">
                        <div className="h-3 w-32 bg-slate-200 rounded"></div>
                        <div className="h-3 w-10 bg-slate-200 rounded"></div>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded overflow-hidden">
                         <div className={`h-full bg-slate-300 rounded`} style={{ width: `${Math.random() * 40 + 30}%`}}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fake Geographical Data */}
              <div className="mb-10 p-8 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex gap-2 items-center mb-6">
                  <div className="w-1 h-5 bg-emerald-500 rounded-sm"></div>
                  <div className="h-5 w-64 bg-slate-200 rounded"></div>
                </div>
                <div className="flex flex-col gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="h-3 w-24 bg-slate-200 rounded"></div>
                      <div className="flex-1 h-2 bg-slate-200 rounded"></div>
                      <div className="h-3 w-10 bg-slate-300 rounded"></div>
                      <div className="h-3 w-16 bg-slate-200 rounded"></div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="my-10 border-t border-slate-100"></div>
              
              {/* Fake Markdown text */}
              <div className="space-y-6">
                 <div className="flex items-center gap-3 text-blue-600 mb-8 p-4 bg-blue-50 bg-opacity-50 rounded-lg">
                   <Loader2 className="h-6 w-6 animate-spin" />
                   <span className="font-semibold">AI is analyzing drop-offs and structural interaction data...</span>
                 </div>
                 <div className="h-8 w-1/3 bg-slate-300 rounded mb-4"></div>
                 <div className="h-4 w-full bg-slate-200 rounded"></div>
                 <div className="h-4 w-5/6 bg-slate-200 rounded"></div>
                 <div className="h-4 w-4/6 bg-slate-200 rounded"></div>
                 
                 <div className="h-6 w-1/4 bg-slate-300 rounded mt-10 mb-4"></div>
                 <div className="h-4 w-full bg-slate-200 rounded"></div>
                 <div className="h-4 w-full bg-slate-200 rounded"></div>
                 <div className="h-4 w-3/4 bg-slate-200 rounded"></div>
              </div>
            </div>
          ) : (
            <div className="space-y-2" dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(report) }} />
          )}
        </div>
      </div>
      
      {/* Hidden element for print header to look professional */}
      <div className="hidden print:block mb-10 border-b-2 border-slate-900 pb-6">
        <h1 className="text-5xl font-black text-black tracking-tight">NexaBank Analytics</h1>
        <h2 className="text-2xl mt-4 font-semibold text-slate-700">Strategic Critical Analysis & Insights</h2>
        <p className="mt-2 text-base text-slate-600 font-medium">Target Tenant: {tenantId.toUpperCase()}</p>
        <p className="text-base text-slate-600 font-medium">Generated on: {new Date().toLocaleDateString()}</p>
      </div>
    </div>
  );
}
