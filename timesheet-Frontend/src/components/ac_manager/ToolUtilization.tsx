import React, { useState } from 'react';
import { Project, ProjectTool } from '../../types';
import { formatINR } from '../../utils/formatters';
import { Plus, X, Wrench, Package } from 'lucide-react';

interface ToolUtilizationProps {
  projects: Project[];
  onAddToolToMilestone: (milestoneId: string, tool: Omit<ProjectTool, 'id'>) => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  Cloud: 'bg-sky-50 text-sky-700 border-sky-200',
  Design: 'bg-purple-50 text-purple-700 border-purple-200',
  Dev: 'bg-blue-50 text-blue-700 border-blue-200',
  AI: 'bg-violet-50 text-violet-700 border-violet-200',
  SaaS: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Testing: 'bg-amber-50 text-amber-700 border-amber-200',
};

export const ToolUtilization: React.FC<ToolUtilizationProps> = ({
  projects,
  onAddToolToMilestone,
  onShowToast,
}) => {
  const [showAddToolModal, setShowAddToolModal] = useState(false);
  const [selectedToolMilestoneId, setSelectedToolMilestoneId] = useState('');
  const [newToolName, setNewToolName] = useState('');
  const [newToolCategory, setNewToolCategory] = useState<'Cloud' | 'Design' | 'Dev' | 'AI' | 'SaaS' | 'Testing'>('Cloud');
  const [newToolCost, setNewToolCost] = useState(15000);

  const safeProjects = projects || [];

  // Flatten all tools with project reference
  const allTools = safeProjects.flatMap((p) =>
    (p.tools || []).map((t) => ({ ...t, projectId: p.id, projectName: p.name }))
  );

  // Summary stats
  const totalMonthlyCost = allTools.reduce((sum, t) => sum + (t.monthlyCost || 0), 0);

  const handleCreateTool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedToolMilestoneId || !newToolName) return;
    onAddToolToMilestone(selectedToolMilestoneId, {
      name: newToolName,
      category: newToolCategory,
      monthlyCost: newToolCost,
      assignedUsersCount: 0,
      seats: 1,
    });
    onShowToast('SaaS Tool Added', `Added ${newToolName} to project.`, 'success');
    setShowAddToolModal(false);
    setNewToolName('');
    setNewToolCost(15000);
    setSelectedToolMilestoneId('');
  };

  return (
    <div className="space-y-6 text-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Tool Utilization</h1>
          <p className="text-xs text-slate-500 font-medium">
            SaaS licenses, cloud infrastructure, and tool expenses allocated per project.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddToolModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Allocate SaaS Tool</span>
        </button>
      </div>

      {/* Summary strip */}
      {allTools.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <div className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs text-xs flex items-center gap-2.5">
            <Package className="w-4 h-4 text-blue-500" />
            <span className="text-slate-500 font-semibold">{allTools.length} Tools Allocated</span>
            <span className="font-black text-slate-900">{formatINR(totalMonthlyCost)}/mo</span>
            <span className="text-slate-400">·</span>
            <span className="font-bold text-slate-600">{formatINR(totalMonthlyCost * 12)}/yr</span>
          </div>
          <div className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs text-xs flex items-center gap-2.5">
            <Wrench className="w-4 h-4 text-amber-500" />
            <span className="text-slate-500 font-semibold">Hourly Burn Rate:</span>
            <span className="font-black text-slate-900">
              {formatINR(Math.round(totalMonthlyCost / 22 / 8))}/hr
            </span>
            <span className="text-[10px] text-slate-400">(Cost / 22 days / 8 hrs)</span>
          </div>
        </div>
      )}

      {/* Tool Cards Grid */}
      {allTools.length === 0 ? (
        <div className="py-20 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Wrench className="w-7 h-7 text-slate-300" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-600">No SaaS Tools Allocated</p>
            <p className="text-xs text-slate-400 mt-1">
              Allocate SaaS tools, cloud plans, or software licenses to your projects to track tool burn rates.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddToolModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Allocate First Tool</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {allTools.map((t) => {
            const categoryClass = CATEGORY_COLORS[t.category] || 'bg-slate-50 text-slate-700 border-slate-200';
            return (
              <div
                key={`${t.projectId}-${t.id}`}
                className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3 hover:border-slate-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border uppercase tracking-wider ${categoryClass}`}>
                    {t.category}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400">{t.projectName} - {t.milestoneName || ((t as any).milestone_name || t.milestoneName) || 'Milestone'}</span>
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">{t.name}</h3>
                  <p className="text-2xl font-black text-slate-900 mt-1.5 tracking-tight">
                    {formatINR(t.monthlyCost)}<span className="text-sm font-semibold text-slate-400">/mo</span>
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block font-medium">Hourly Rate</span>
                    <span className="font-bold text-slate-800">
                      {formatINR(Math.round(t.monthlyCost / 22 / 8))}/hr
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block font-medium">Yearly</span>
                    <span className="font-bold text-slate-800">{formatINR(t.monthlyCost * 12)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Tool Modal */}
      {showAddToolModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900">Allocate SaaS Tool</h3>
              <button
                type="button"
                onClick={() => setShowAddToolModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTool} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Milestone</label>
                <select
                  value={selectedToolMilestoneId}
                  onChange={(e) => setSelectedToolMilestoneId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                >
                  <option value="">-- Select Milestone --</option>
                  {safeProjects.map((p) => (
                    <optgroup key={p.id} label={`${p.name} (${p.client})`}>
                      {p.milestones?.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tool Name</label>
                <input
                  type="text"
                  placeholder="e.g. Figma Enterprise, AWS Cloud, OpenAI API"
                  value={newToolName}
                  onChange={(e) => setNewToolName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={newToolCategory}
                    onChange={(e) => setNewToolCategory(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Cloud">Cloud</option>
                    <option value="Design">Design</option>
                    <option value="Dev">Dev</option>
                    <option value="AI">AI</option>
                    <option value="SaaS">SaaS</option>
                    <option value="Testing">Testing</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Monthly Cost (₹)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={newToolCost === 0 ? '' : newToolCost}
                    onChange={(e) => setNewToolCost(e.target.value === '' ? 0 : Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <p className="text-[10px] text-slate-400 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                Hourly burn rate = Monthly Cost ÷ 22 working days ÷ 8 hours. This is applied per logged hour on each milestone.
              </p>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddToolModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md"
                >
                  Allocate Tool
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
