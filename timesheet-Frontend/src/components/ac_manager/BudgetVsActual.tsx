import { Pagination } from '../common/Pagination';
import React, { useState, useMemo, useEffect } from 'react';
import { Project } from '../../types';
import { formatINR } from '../../utils/formatters';
import { TrendingUp, AlertTriangle, CheckCircle2, Search, DollarSign, PieChart, ArrowUpRight, ArrowDownRight, BarChart2 } from 'lucide-react';

interface BudgetVsActualProps {
  projects: Project[];
}

export const BudgetVsActual: React.FC<BudgetVsActualProps> = ({ projects }) => {
  const safeProjects = projects || [];
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'under' | 'over' | 'warning'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const formatCr = (amount: number): string => {
    if (Math.abs(amount) >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`;
    } else if (Math.abs(amount) >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} L`;
    }
    return formatINR(amount);
  };

  // Aggregate Metrics
  const summary = useMemo(() => {
    let totalBudget = 0;
    let totalActual = 0;

    safeProjects.forEach((p) => {
      totalBudget += p.budget || 0;
      totalActual += p.actual_cost || 0;
    });

    const netVariance = totalBudget - totalActual;
    const burnRate = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;

    return {
      totalBudget,
      totalActual,
      netVariance,
      burnRate,
    };
  }, [safeProjects]);

  // Filtered Projects
  useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter]);

  const filteredProjects = useMemo(() => {
    return safeProjects.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      const budget = p.budget || 0;
      const actual = p.actual_cost || 0;
      const pct = budget > 0 ? (actual / budget) * 100 : 0;

      if (statusFilter === 'under') return pct <= 80;
      if (statusFilter === 'warning') return pct > 80 && pct <= 100;
      if (statusFilter === 'over') return pct > 100;
      return true;
    });
  }, [safeProjects, searchTerm, statusFilter]);

  const paginatedProjects = filteredProjects.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6 text-slate-800">
      {/* Header Banner */}
      <div className="p-5 bg-white border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <TrendingUp className="w-6 h-6 text-sky-600" />
            <span>Budget vs Actual Cost Analysis</span>
          </h1>
          <p className="text-xs text-slate-500">
            Real-time tracking of contract allocations against actual labor and software overhead expenses.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-sky-50 text-sky-800 border border-sky-200 text-xs font-bold">
            {safeProjects.length} Active Portfolios
          </span>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Budget */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              Total Budget
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{formatCr(summary.totalBudget)}</div>
          <p className="text-[11px] text-slate-500">Committed contract budgets</p>
        </div>

        {/* Total Actual Cost */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              Total Actual Cost
            </span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{formatCr(summary.totalActual)}</div>
          <p className="text-[11px] text-slate-500">Direct labor & tool expenses</p>
        </div>

        {/* Net Cost Variance */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              Net Cost Variance
            </span>
            <div
              className={`p-2 rounded-xl ${
                summary.netVariance >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              }`}
            >
              {summary.netVariance >= 0 ? (
                <ArrowDownRight className="w-4 h-4" />
              ) : (
                <ArrowUpRight className="w-4 h-4" />
              )}
            </div>
          </div>
          <div
            className={`text-2xl font-black ${
              summary.netVariance >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {formatCr(summary.netVariance)}
          </div>
          <p className="text-[11px] text-slate-500">
            {summary.netVariance >= 0 ? 'Under total budget threshold' : 'Budget overrun risk'}
          </p>
        </div>

        {/* Overall Burn Rate */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              Overall Burn Rate
            </span>
            <div
              className={`p-2 rounded-xl ${
                summary.burnRate > 100
                  ? 'bg-rose-50 text-rose-600'
                  : summary.burnRate > 80
                  ? 'bg-amber-50 text-amber-600'
                  : 'bg-indigo-50 text-indigo-600'
              }`}
            >
              {summary.burnRate > 100 ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{summary.burnRate.toFixed(1)}%</div>
          <p className="text-[11px] text-slate-500">Portfolio consumption avg</p>
        </div>
      </div>

      {/* Table & Filtering Toolbar */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-2">
          {/* Search */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search project or client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full sm:w-auto overflow-x-auto text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({safeProjects.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('under')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                statusFilter === 'under'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Under Budget (&le;80%)
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('warning')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                statusFilter === 'warning'
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Approaching (80-100%)
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('over')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                statusFilter === 'over'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Over Budget (&gt;100%)
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                <th className="py-3 px-3">Project & Client</th>
                <th className="py-3 px-3">Planned Budget</th>
                <th className="py-3 px-3">Actual Spend</th>
                <th className="py-3 px-3">Variance</th>
                <th className="py-3 px-3">Budget Burn</th>
                <th className="py-3 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                    No matching projects found.
                  </td>
                </tr>
              ) : (
                paginatedProjects.map((p) => {
                  const budget = p.budget || 0;
                  const actual = p.actual_cost || 0;
                  const variance = budget - actual;
                  const percentBurn = budget > 0 ? (actual / budget) * 100 : 0;

                  let badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                  let statusLabel = 'On Track';
                  let barColor = 'bg-emerald-500';

                  if (percentBurn > 100) {
                    badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
                    statusLabel = 'Over Budget';
                    barColor = 'bg-rose-500';
                  } else if (percentBurn >= 80) {
                    badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                    statusLabel = 'Warning (80%+)';
                    barColor = 'bg-amber-500';
                  }

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-900">{p.name}</div>
                        <div className="text-[11px] text-slate-500">{p.client}</div>
                      </td>
                      <td className="py-3.5 px-3 font-extrabold text-slate-900">
                        {formatCr(budget)}
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-slate-700">
                        {formatCr(actual)}
                      </td>
                      <td className="py-3.5 px-3 font-bold">
                        <span className={variance >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {formatCr(variance)}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 min-w-[140px]">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 mb-1">
                          <span>{percentBurn.toFixed(1)}%</span>
                          <span className="text-slate-400">{formatCr(actual)}</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${barColor}`}
                            style={{ width: `${Math.min(percentBurn, 100)}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border uppercase ${badgeColor}`}
                        >
                          {statusLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalItems={filteredProjects.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(n) => { setItemsPerPage(n); setCurrentPage(1); }}
        />
      </div>
    </div>
  );
};
