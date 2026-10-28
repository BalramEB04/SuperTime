import { Pagination } from '../common/Pagination';
import React, { useState, useMemo, useEffect } from 'react';
import { Project, TimesheetEntry } from '../../types';
import { formatINR } from '../../utils/formatters';
import { Calendar, Download, CreditCard, DollarSign, TrendingUp, ShieldCheck, UserCheck, Rocket, Landmark } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface PortfolioOverviewProps {
  projects: Project[];
  timesheets: TimesheetEntry[];
  totalBudget: number;
  totalCost: number;
  totalEarnedValue: number;
  totalCostVariance: number;
  totalForecastCost: number;
  activeProjectsCount: number;
  onUpdateProjectBudget: (projectId: string, newBudget: number) => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
  setEditingProject: (p: Project | null) => void;
  setEditBudget: (b: number) => void;
  }

export const PortfolioOverview: React.FC<PortfolioOverviewProps> = ({
  projects,
  timesheets,
  totalBudget,
  totalCost,
  totalEarnedValue,
  totalCostVariance,
  totalForecastCost,
  activeProjectsCount,
  onShowToast,
  setEditingProject,
  setEditBudget,
  }) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const currentQuarter = Math.floor(currentMonth / 3) + 1;
  const currentQStr = `Q${currentQuarter} ${currentYear}`;
  
  const [selectedQuarter, setSelectedQuarter] = useState(currentQStr);
  const [chartInterval, setChartInterval] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [snapshotFilter, setSnapshotFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const safeProjects = projects || [];
  const safeTimesheets = timesheets || [];

  const formatCr = (amount: number): string => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(1)} Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)} L`;
    }
    return formatINR(amount);
  };
  
  const totalProfit = totalEarnedValue - totalCost;

  // Generate historical chart data using milestone achievement dates
  const chartData = useMemo(() => {
    const data = [];
    const now = new Date();
    const isMonthly = chartInterval === 'monthly';
    
    // Go back 5 periods
    for (let i = 5; i >= 0; i--) {
      let d: Date;
      let label: string;
      
      if (isMonthly) {
        d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        label = `${d.toLocaleString('default', { month: 'short' })} '${d.getFullYear().toString().slice(-2)}`;
      } else if (chartInterval === 'quarterly') {
        d = new Date(now.getFullYear(), now.getMonth() - (i * 3), 1);
        const q = Math.floor(d.getMonth() / 3) + 1;
        label = `Q${q} '${d.getFullYear().toString().slice(-2)}`;
      } else {
        d = new Date(now.getFullYear() - i, 0, 1);
        label = `${d.getFullYear()}`;
      }
      
      let cumulativeEV = 0;
      let cumulativeAC = 0;
      
      safeProjects.forEach(p => {
        if (p.milestones) {
          p.milestones.forEach(m => {
            if (m.status === 'achieved' && m.actual_achievement_date) {
              const achievedDate = new Date(m.actual_achievement_date);
              
              const isBeforeOrEqual = 
                achievedDate.getFullYear() < d.getFullYear() || 
                (achievedDate.getFullYear() === d.getFullYear() && achievedDate.getMonth() <= d.getMonth());
                
              if (chartInterval === 'yearly') {
                  if (achievedDate.getFullYear() <= d.getFullYear()) {
                      cumulativeEV += m.earned_value || 0;
                      cumulativeAC += m.actual_cost || 0;
                  }
              } else if (isBeforeOrEqual) {
                cumulativeEV += m.earned_value || 0;
                cumulativeAC += m.actual_cost || 0;
              }
            }
          });
        }
      });
      
      data.push({
        name: label,
        Revenue: cumulativeEV,
        Cost: cumulativeAC,
        Profit: cumulativeEV - cumulativeAC
      });
    }
    return data;
  }, [safeProjects, chartInterval]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, snapshotFilter]);

  const filteredSnapshotProjects = safeProjects.filter((p) => {
    if (snapshotFilter === 'active' && p.status !== 'active') return false;
    if (snapshotFilter === 'completed' && p.status !== 'completed') return false;
    if (
      searchQuery &&
      !p.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !p.client.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const paginatedSnapshotProjects = filteredSnapshotProjects.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const activeProjectHealth = safeProjects
    .filter((p) => p.status === 'active')
    .sort((a, b) => (b.budget || 0) - (a.budget || 0))
    .map((p) => {
      const budgetUtil = p.budget_utilization_percentage || 0;
      const costUtil = p.cost_utilization_percentage || 0;
      
      const isOverBudget = costUtil > 100;
      const isAtRisk = costUtil > 85 && costUtil > budgetUtil;
      
      const statusColor = isOverBudget ? 'bg-rose-600' : isAtRisk ? 'bg-amber-500' : 'bg-emerald-600';
      const textColor = isOverBudget ? 'text-rose-600' : isAtRisk ? 'text-amber-600' : 'text-emerald-600';

      return {
        id: p.id,
        name: p.name,
        client: p.client,
        budget: p.budget,
        actual_cost: p.actual_cost,
        forecast_cost: p.forecast_cost,
        budgetUtil,
        costUtil,
        statusColor,
        textColor,
      };
    });

  return (
    <div className="space-y-6 text-slate-800">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Portfolio Overview</h1>
          <p className="text-xs text-slate-500 font-medium">
            Real-time financial performance and resource health.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-xl text-xs font-bold text-foreground shadow-2xs hover:border-slate-300 transition-all cursor-pointer">
              <Calendar className="w-4 h-4 text-primary" />
              <select
                value={selectedQuarter}
                onChange={(e) => setSelectedQuarter(e.target.value)}
                className="bg-transparent text-xs font-bold focus:outline-hidden cursor-pointer pr-1 text-foreground"
              >
                <option value="Q3 FY 2024">Q3 FY 2024</option>
                <option value="Q2 FY 2024">Q2 FY 2024</option>
                <option value="Q1 FY 2024">Q1 FY 2024</option>
                <option value="FY 2024-25">FY 2024-25</option>
              </select>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onShowToast('Exporting Report', 'Generating P&L Portfolio Summary PDF...', 'success')}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground rounded-xl font-bold text-xs shadow-md shadow-primary/20 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 lg:gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-xl bg-primary-subtle text-primary">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-primary-subtle text-primary uppercase">
              Revenue
            </span>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground">Total Revenue (Earned)</p>
            <p className="text-xl font-black text-foreground tracking-tight mt-0.5">{formatCr(totalEarnedValue)}</p>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className={`p-2 rounded-xl bg-slate-50 text-slate-600`}>
              <Landmark className="w-5 h-5" />
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 text-slate-700`}>
              Spend
            </span>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500">Total Actual Cost</p>
            <p className="text-xl font-black text-slate-900 tracking-tight mt-0.5">{formatCr(totalCost)}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className={`p-2 rounded-xl ${totalProfit >= 0 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'} shadow-xs`}>
              <DollarSign className="w-5 h-5" />
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${totalProfit >= 0 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>
              Margin
            </span>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500">Total Profit</p>
            <p className="text-xl font-black text-slate-900 tracking-tight mt-0.5">{formatCr(totalProfit)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Monthly Profit Trend</h3>
              <p className="text-xs text-slate-500">Historical analysis of financial cycles</p>
            </div>
            <div className="p-1 bg-slate-100 rounded-xl flex items-center gap-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setChartInterval('monthly')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${chartInterval === 'monthly'
                  ? 'bg-card text-primary shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setChartInterval('quarterly')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${chartInterval === 'quarterly'
                  ? 'bg-card text-primary shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                Quarterly
              </button>
              <button
                type="button"
                onClick={() => setChartInterval('yearly')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${chartInterval === 'yearly'
                  ? 'bg-card text-primary shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                Yearly
              </button>
            </div>
          </div>
          <div className="pt-4 pb-2 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} dy={10} />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                  tickFormatter={(value) => {
                    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
                    if (value >= 100000) return `₹${(value / 100000).toFixed(0)}L`;
                    if (value >= 1000) return `₹${(value / 1000).toFixed(0)}k`;
                    return `₹${value}`;
                  }}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 700 }}
                  formatter={(value: number) => formatINR(value)}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 700, paddingTop: '10px' }} />
                <Line type="monotone" dataKey="Revenue" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Cost" stroke="#64748b" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Profit" stroke="#059669" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          <div className="sticky top-0 bg-[#f8fafc] pb-2 z-10">
            <h3 className="text-sm font-bold text-slate-900">Project Burn Rates</h3>
            <p className="text-[10px] text-slate-500">Active project cost utilization vs earned value</p>
          </div>
          {activeProjectHealth.map((p) => (
            <div key={p.id} className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-xs text-slate-900">{p.name}</h4>
                  <p className="text-[10px] text-slate-500">{p.client}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-slate-800">{formatCr(p.budget || 0)}</span>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-slate-600">Cost Utilization (Burn)</span>
                    <span className={p.textColor}>{p.costUtil.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${p.statusColor}`} style={{ width: `${Math.min(100, p.costUtil)}%` }} />
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-slate-600">Budget Utilization (Earned)</span>
                    <span className="text-primary">{p.budgetUtil.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${Math.min(100, p.budgetUtil)}%` }} />
                  </div>
                </div>
              </div>
            </div>
          ))}
          {activeProjectHealth.length === 0 && (
            <div className="p-4 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
              No active projects to display.
            </div>
          )}
        </div>
      </div>
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Financial Snapshot</h2>
            <p className="text-xs text-slate-500">
              Project contract budgets, actual costs, earned values and health analysis.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={snapshotFilter}
              onChange={(e) => setSnapshotFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value="all">All Projects</option>
              <option value="active">Active Projects</option>
              <option value="completed">Completed Projects</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Project</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Budget</th>
                <th className="py-3 px-4">Actual Cost</th>
                <th className="py-3 px-4">Earned Value</th>
                <th className="py-3 px-4">CPI</th>
                <th className="py-3 px-4">Health</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {paginatedSnapshotProjects.map((p) => {
                const cost = p.actual_cost || 0;
                const earned_value = p.earned_value || 0;
                const cpi = p.cpi || 0;
                const health = p.health || 'GREEN';

                return (
                  <tr key={p.id} className="hover:bg-secondary/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-foreground">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-primary-subtle text-primary flex items-center justify-center font-black">
                          {p.name.charAt(0)}
                        </div>
                        <div>
                          <div>{p.name}</div>
                          <div className="text-[10px] text-muted-foreground font-normal">Code: {p.code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-foreground font-semibold">{p.client}</td>
                    <td className="py-3.5 px-4 font-bold text-foreground">{formatCr(p.budget)}</td>
                    <td className="py-3.5 px-4 text-muted-foreground">{formatCr(cost)}</td>
                    <td className="py-3.5 px-4 text-success font-bold">{formatCr(earned_value)}</td>
                    <td className="py-3.5 px-4 text-foreground font-bold">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] ${cpi >= 1 ? 'bg-success-subtle text-success' : 'bg-destructive-subtle text-destructive'}`}>
                        {cpi.toFixed(2)}x
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase ${health === 'GREEN'
                          ? 'bg-success-subtle text-success border-success-subtle-border'
                          : health === 'AMBER'
                            ? 'bg-warning-subtle text-warning border-warning-subtle-border'
                            : 'bg-destructive-subtle text-destructive border-destructive-subtle-border'
                          }`}
                      >
                        {health}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProject(p);
                          setEditBudget(p.budget);
                        }}
                        className="px-3 py-1 bg-secondary hover:bg-primary-subtle hover:text-primary text-foreground rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        Edit Budget
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalItems={filteredSnapshotProjects.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(n) => { setItemsPerPage(n); setCurrentPage(1); }}
        />
      </div>
    </div>
  );
};
