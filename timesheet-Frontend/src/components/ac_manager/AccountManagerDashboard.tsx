import React, { useState } from 'react';
import { Project, User, TimesheetEntry, ProjectTool } from '../../types';
import { ACManagerTab } from '../Sidebar';
import { formatINR } from '../../utils/formatters';
import { useGetProjectFinancialsQuery } from '../../store/api/dataApi';
import { X } from 'lucide-react';

import { PortfolioOverview } from './PortfolioOverview';
import { ProjectFinancials } from './ProjectFinancials';
import { ToolUtilization } from './ToolUtilization';
import { EmployeeUtilization } from './EmployeeUtilization';
import { BudgetVsActual } from './BudgetVsActual';
import { AcReports } from './AcReports';

interface AccountManagerDashboardProps {
  currentUser: User;
  projects: Project[];
  allUsers: User[];
  timesheets: TimesheetEntry[];
  activeTab?: ACManagerTab;
  onNavigateTab?: (tab: ACManagerTab) => void;
  onUpdateProjectBudget: (projectId: string, newBudget: number) => Promise<void> | void;
  onAddToolToMilestone: (milestoneId: string, tool: any) => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

export const AccountManagerDashboard: React.FC<AccountManagerDashboardProps> = React.memo(({
  currentUser,
  projects,
  allUsers,
  timesheets,
  activeTab = 'ac_dashboard',
  onNavigateTab,
  onUpdateProjectBudget,
  onAddToolToMilestone,
  onShowToast,
}) => {
  // Shared Modals state
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editBudget, setEditBudget] = useState(0);
  const { data: analyticsData } = useGetProjectFinancialsQuery();

  const safeProjects = projects || [];
  const safeTimesheets = timesheets || [];
  const safeAllUsers = allUsers || [];

  // Aggregates calculated from frontend data
  const {
    activeProjectsCount,
    totalBudget,
    totalCost,
    totalEarnedValue,
    totalCostVariance,
    totalForecastCost,
  } = React.useMemo(() => {
    const activeCount = safeProjects.filter(p => String(p.status).toLowerCase() === 'active').length;
    const budget = safeProjects.reduce((sum, p) => sum + (p.budget || 0), 0);
    const cost = safeProjects.reduce((sum, p) => sum + (p.actual_cost || 0), 0);
    const earnedVal = safeProjects.reduce((sum, p) => sum + (p.earned_value || 0), 0);
    const costVar = safeProjects.reduce((sum, p) => sum + (p.cost_variance || 0), 0);
    const forecast = safeProjects.reduce((sum, p) => sum + (p.forecast_cost || 0), 0);

    return {
      activeProjectsCount: activeCount,
      totalBudget: budget,
      totalCost: cost,
      totalEarnedValue: earnedVal,
      totalCostVariance: costVar,
      totalForecastCost: forecast,
    };
  }, [safeProjects]);

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    await onUpdateProjectBudget(editingProject.id, editBudget);
    setEditingProject(null);
  };

  return (
    <div className="relative">
      {activeTab === 'ac_dashboard' && (
        <PortfolioOverview
          projects={safeProjects}
          timesheets={safeTimesheets}
          totalBudget={totalBudget}
          totalCost={totalCost}
          totalEarnedValue={totalEarnedValue}
          totalCostVariance={totalCostVariance}
          totalForecastCost={totalForecastCost}
          activeProjectsCount={activeProjectsCount}
          onUpdateProjectBudget={onUpdateProjectBudget}
          onShowToast={onShowToast}
          setEditingProject={setEditingProject}
          setEditBudget={setEditBudget}
        />
      )}

      {activeTab === 'project_financials' && (
        <ProjectFinancials
          projects={safeProjects}
          totalBudget={totalBudget}
          totalEarnedValue={totalEarnedValue}
          totalCostVariance={totalCostVariance}
          setEditingProject={setEditingProject}
          setEditBudget={setEditBudget}
        />
      )}

      {activeTab === 'budget_vs_actual' && (
        <BudgetVsActual projects={safeProjects} />
      )}

      {activeTab === 'tool_utilization' && (
        <ToolUtilization
          projects={safeProjects}
          onAddToolToMilestone={onAddToolToMilestone}
          onShowToast={onShowToast}
        />
      )}

      {activeTab === 'employee_utilization' && (
        <EmployeeUtilization
          projects={safeProjects}
          onShowToast={onShowToast}
        />
      )}

      {activeTab === 'ac_reports' && (
        <AcReports onShowToast={onShowToast} />
      )}

      {/* Shared Edit Budget Modal */}
      {editingProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900">Edit Contract Budget</h3>
              <button
                type="button"
                onClick={() => setEditingProject(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Updating budget parameters for <strong className="text-slate-900">{editingProject.name}</strong> ({editingProject.client}).
            </p>

            <form onSubmit={handleSaveBudget} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Contract Budget Amount (INR ₹)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={editBudget === 0 ? '' : editBudget}
                  onChange={(e) => setEditBudget(e.target.value === '' ? 0 : Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-2 italic">
                  Note: Milestone budgets are automatically calculated from this total project budget based on their weightages. Manual override of individual milestones is disabled.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md"
                >
                  Save Contract
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
});
AccountManagerDashboard.displayName = 'AccountManagerDashboard';

