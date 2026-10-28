import { Pagination } from '../common/Pagination';
import React, { useState } from 'react';
import { Project, Milestone } from '../../types';
import { formatINR } from '../../utils/formatters';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ProjectFinancialsProps {
  projects: Project[];
  totalBudget: number;
  totalEarnedValue: number;
  totalCostVariance: number;
  setEditingProject: (p: Project | null) => void;
  setEditBudget: (b: number) => void;
}

export const ProjectFinancials: React.FC<ProjectFinancialsProps> = ({
  projects,
  totalBudget,
  totalEarnedValue,
  totalCostVariance,
  setEditingProject,
  setEditBudget,
}) => {
  const safeProjects = projects || [];
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const paginatedProjects = safeProjects.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  const formatCr = (amount: number): string => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(1)} Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)} L`;
    }
    return formatINR(amount);
  };

  const toggleProject = (id: string) => {
    if (expandedProject === id) {
      setExpandedProject(null);
    } else {
      setExpandedProject(id);
    }
  };

  return (
    <div className="space-y-6 text-slate-800">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Project Financials & Milestones</h1>
          <p className="text-xs text-slate-500 font-medium">
            Detailed contract budget allocations, milestone health, and variance tracking.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {paginatedProjects.map((p) => {
          const isExpanded = expandedProject === p.id;
          const health = p.health || 'GREEN';
          
          return (
            <div key={p.id} className="rounded-2xl bg-white border border-slate-200 shadow-2xs overflow-hidden transition-all">
              {/* Project Header Row */}
              <div 
                className="p-4 sm:p-5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => toggleProject(p.id)}
              >
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">{p.name}</h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${health === 'GREEN'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : health === 'AMBER'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                    >
                      {health}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{p.client}</p>
                </div>
                
                <div className="flex-1 min-w-[150px]">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Budget</p>
                  <p className="text-sm font-black text-slate-800">{formatCr(p.budget)}</p>
                </div>

                <div className="flex-1 min-w-[150px]">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Variance</p>
                  <p className={`text-sm font-black ${p.cost_variance && p.cost_variance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatCr(p.cost_variance || 0)}
                  </p>
                </div>
                
                <div className="flex-1 min-w-[100px] flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingProject(p);
                      setEditBudget(p.budget);
                    }}
                    className="px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold"
                  >
                    Edit Budget
                  </button>
                  <div className="p-1 rounded-full bg-slate-100 text-slate-500">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>
              </div>

              {/* Milestone Details Expansion */}
              {isExpanded && (
                <div className="p-5 border-t border-slate-100 bg-slate-50">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-4">Milestone Health Breakdown</h4>
                  
                  {(!p.milestones || p.milestones.length === 0) ? (
                    <div className="text-center py-4 text-xs font-bold text-slate-500 bg-white rounded-xl border border-slate-200">
                      No milestones defined for this project.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                            <th className="py-2.5 px-3">Milestone</th>
                            <th className="py-2.5 px-3 text-right">Weight</th>
                            <th className="py-2.5 px-3 text-right">PV (Budget)</th>
                            <th className="py-2.5 px-3 text-right">AC (Cost)</th>
                            <th className="py-2.5 px-3 text-right">Variance </th>
                            <th className="py-2.5 px-3 text-center">CPI</th>
                            <th className="py-2.5 px-3 text-center">Delay</th>
                            <th className="py-2.5 px-3 text-right">Forecast</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {p.milestones.map((m: Milestone) => {
                            const pv = m.planned_value || 0;
                            const ev = m.earned_value || 0;
                            const ac = m.actual_cost || 0;
                            const variance = m.cost_variance || 0;
                            const forecast = m.forecast_cost || 0;
                            const delay = m.delay_days || 0;
                            const cpi = m.cpi || 0;
                            
                            return (
                              <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                                <td className="py-2.5 px-3">
                                  <p className="font-bold text-slate-900">{m.name}</p>
                                  <p className="text-[10px] text-slate-400 capitalize">{m.status.replace('_', ' ')} • {m.completion_percentage}% Done</p>
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-slate-700">{m.weight_percentage}%</td>
                                <td className="py-2.5 px-3 text-right text-slate-600">{formatINR(pv)}</td>
                                <td className="py-2.5 px-3 text-right text-slate-700">{formatINR(ac)}</td>
                                <td className={`py-2.5 px-3 text-right font-bold ${variance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {formatINR(variance)}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${cpi >= 1 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                    {cpi.toFixed(2)}x
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  {delay > 0 ? (
                                    <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 text-[10px] font-bold">
                                      {delay}d
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 text-[10px]">-</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-slate-800">{formatINR(forecast)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <Pagination
        currentPage={currentPage}
        totalItems={safeProjects.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setItemsPerPage}
      />
    </div>
  );
};
