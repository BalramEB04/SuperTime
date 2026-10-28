import React from 'react';
import { FileText, Download, DollarSign, Users, BarChart3, ShieldCheck } from 'lucide-react';

interface AcReportsProps {
  onShowToast: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

export const AcReports: React.FC<AcReportsProps> = ({ onShowToast }) => {
  const reports = [
    {
      id: 'pnl_summary',
      title: 'Profit & Loss Statement (P&L)',
      desc: 'Complete financial statement covering gross revenue, labor cost, SaaS tooling overhead, and project net margins.',
      icon: DollarSign,
      action: 'Export P&L Excel',
      fileType: 'Excel / XLSX',
      color: 'bg-blue-600',
    },
    {
      id: 'billing_ledger',
      title: 'Client Billing & Invoicing Ledger',
      desc: 'Itemized client deliverable timesheet records, billing hours, and agreed billable rates for client invoicing.',
      icon: BarChart3,
      action: 'Export Billing CSV',
      fileType: 'CSV',
      color: 'bg-emerald-600',
    },
    {
      id: 'resource_utilization',
      title: 'Resource Cost & Capacity Report',
      desc: 'Per-employee utilization metrics, allocated billable hours, non-billable overhead, and employee compensation burden.',
      icon: Users,
      action: 'Export Capacity Report',
      fileType: 'PDF / CSV',
      color: 'bg-purple-600',
    },
    {
      id: 'audit_trail',
      title: 'Budget Variance & Health Audit',
      desc: 'Detailed history of contract budget modifications, milestone completion variance, and cost threshold flags.',
      icon: ShieldCheck,
      action: 'Export Audit Log',
      fileType: 'PDF',
      color: 'bg-amber-600',
    },
  ];

  const handleExport = (reportTitle: string, fileType: string) => {
    onShowToast('Report Generation Started', `${reportTitle} is being prepared for download (${fileType}).`, 'success');
  };

  return (
    <div className="space-y-6 text-slate-800">
      {/* Header Banner */}
      <div className="p-5 bg-white border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-sky-600" />
            <span>Financial Reporting &amp; Exports</span>
          </h1>
          <p className="text-xs text-slate-500">
            Download executive financial summaries, client billing ledgers, and capacity audits.
          </p>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((r) => {
          const Icon = r.icon;
          return (
            <div
              key={r.id}
              className="p-6 bg-white border border-slate-200 flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 bg-sky-50 text-sky-700 border border-sky-200">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="px-2.5 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 uppercase border border-slate-200">
                    {r.fileType}
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">{r.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{r.desc}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleExport(r.title, r.fileType)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{r.action}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
