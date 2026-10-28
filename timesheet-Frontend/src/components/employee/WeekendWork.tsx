import { Pagination } from '../common/Pagination';
import React, { useState } from 'react';
import { User, Project, WeekendWorkRequest } from '../../types';
import {
  Moon,
  Plus,
  Calendar,
  Clock,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sparkles,
  Zap,
} from 'lucide-react';

interface WeekendWorkProps {
  currentUser: User;
  projects: Project[];
  weekendRequests: WeekendWorkRequest[];
  holidays: any[];
  onRequestWeekendWork: (request: Omit<WeekendWorkRequest, 'id'>) => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

export const WeekendWork: React.FC<WeekendWorkProps> = ({
  currentUser,
  projects,
  weekendRequests,
  holidays,
  onRequestWeekendWork,
  onShowToast,
}) => {
  const safeProjects = projects || [];
  const assignedProjects = safeProjects.filter((p) => p.assignedUserIds?.includes(currentUser.id) && p.isActive !== false && p.is_active !== false);
  const [projectId, setProjectId] = useState(assignedProjects[0]?.id || '');
  const [workDate, setWorkDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Work Summary & Hours state
  const [billableHours, setBillableHours] = useState<number>(6.0);
  const [billableSummary, setBillableSummary] = useState('');
  const [nonBillableHours, setNonBillableHours] = useState<number>(0);
  const [nonBillableSummary, setNonBillableSummary] = useState('');
  const [objective, setObjective] = useState('');

  const totalHours = (Number(billableHours) || 0) + (Number(nonBillableHours) || 0);

  const userRequests = (weekendRequests || []).filter((r) => r.userId === currentUser.id);

  const approvedHours = userRequests
    .filter((r) => r.status === 'approved')
    .reduce((sum, r) => sum + (r.plannedHours || (r.billableHours || 0) + (r.nonBillableHours || 0)), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!projectId) {
      onShowToast('Project Required', 'Please select an assigned project.', 'error');
      return;
    }

    if (totalHours <= 0) {
      onShowToast('Hours Required', 'Please specify billable or non-billable hours worked.', 'error');
      return;
    }

    if (billableHours > 0 && !billableSummary.trim()) {
      onShowToast('Summary Required', 'Please provide a summary for billable hours worked.', 'error');
      return;
    }

    const selectedProj = assignedProjects.find((p) => p.id === projectId);
    const mainObjective = objective.trim() || billableSummary.trim() || nonBillableSummary.trim() || 'Weekend Overtime Work';

    onRequestWeekendWork({
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      projectId,
      projectName: selectedProj?.name || 'Project Assignment',
      workDate,
      plannedHours: totalHours,
      billableHours: Number(billableHours) || 0,
      billableWorkSummary: billableSummary.trim(),
      nonBillableHours: Number(nonBillableHours) || 0,
      nonBillableWorkSummary: nonBillableSummary.trim(),
      deliverableObjective: mainObjective,
      status: 'pending',
      requestedOn: new Date().toISOString().split('T')[0],
    });

    onShowToast(
      'Weekend Request Submitted',
      'Request with work summary submitted. Once approved by your PM, it will automatically reflect in your timesheet.',
      'success'
    );

    // Reset form
    setBillableSummary('');
    setNonBillableSummary('');
    setObjective('');
  };

  return (
    <div className="space-y-6 text-slate-900 font-sans pb-12">
      {/* Page Header (No Hero Banner) */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Weekend Work &amp; Overtime Requests
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Submit your weekend work with task summaries. Once your PM approves, it automatically populates your timesheet logs.
          </p>
        </div>

        <span className="inline-flex items-center gap-2 rounded-lg bg-white border border-slate-200 px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-2xs">
          <Zap className="w-4 h-4 text-indigo-600" />
          <span>Auto-Timesheet on PM Approval</span>
        </span>
      </div>

      {/* Grid Form & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form 2/3 */}
        <div className="lg:col-span-2 p-6 rounded-xl border border-slate-200/90 bg-white shadow-xs space-y-5 text-xs">
          <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-indigo-50/80 via-violet-50/40 to-white rounded-2xl border border-indigo-100/80">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/25">
                <Moon className="w-4 h-4" />
              </div>
              <h3 className="font-black text-sm text-slate-900 tracking-wide uppercase">
                Submit Weekend Work &amp; Timesheet Details
              </h3>
            </div>
            <span className="text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-3 py-1 rounded-full">
              Total: {totalHours.toFixed(1)} hrs
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Project Dropdown */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Assigned Project <span className="text-rose-500">*</span>
                </label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full h-10 bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-200 rounded-xl px-3 text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none cursor-pointer transition-colors shadow-2xs"
                  required
                >
                  {assignedProjects.length === 0 ? (
                    <option value="">No active project assignments</option>
                  ) : (
                    assignedProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Work Date */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Weekend Date (Sat / Sun / Holiday) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={workDate}
                  onChange={(e) => setWorkDate(e.target.value)}
                  className="w-full h-10 bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-200 rounded-xl px-3 text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none cursor-pointer transition-colors shadow-2xs"
                  required
                />
              </div>
            </div>

            {/* Billable Section */}
            <div className="p-4 rounded-2xl bg-emerald-50/35 border-2 border-emerald-200/90 shadow-2xs space-y-3 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/15 transition-all">
              <div className="flex items-center justify-between">
                <span className="font-black text-emerald-950 text-xs flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Billable Client Work</span>
                </span>
                <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border-2 border-emerald-300 shadow-2xs">
                  <label className="text-[11px] font-black text-emerald-900 uppercase tracking-wider">Hours:</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    value={billableHours === 0 ? '' : billableHours}
                    onChange={(e) => setBillableHours(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-16 h-7 text-center bg-emerald-50/80 hover:bg-white focus:bg-white border border-emerald-300 text-emerald-950 font-black rounded-md text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-2xs transition-colors"
                  />
                  <span className="text-[11px] font-extrabold text-emerald-800">hrs</span>
                </div>
              </div>

              <textarea
                rows={2}
                value={billableSummary}
                onChange={(e) => setBillableSummary(e.target.value)}
                placeholder="Describe client deliverable tasks completed (features built, bugs fixed, deploy work)..."
                className="w-full bg-white/95 border border-emerald-200/90 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none text-xs transition-colors"
              />
            </div>

            {/* Non-Billable Section */}
            <div className="p-4 rounded-2xl bg-slate-100/50 border border-slate-200/90 shadow-2xs space-y-3 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-400/15 transition-all">
              <div className="flex items-center justify-between">
                <span className="font-black text-slate-800 text-xs flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>Non-Billable Internal Work (Optional)</span>
                </span>
                <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-300 shadow-2xs">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Hours:</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    value={nonBillableHours === 0 ? '' : nonBillableHours}
                    onChange={(e) => setNonBillableHours(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-16 h-7 text-center bg-slate-100 hover:bg-white focus:bg-white border border-slate-300 text-slate-900 font-extrabold rounded-md text-xs focus:ring-2 focus:ring-slate-400 focus:outline-none shadow-2xs transition-colors"
                  />
                  <span className="text-[11px] font-bold text-slate-600">hrs</span>
                </div>
              </div>

              <textarea
                rows={2}
                value={nonBillableSummary}
                onChange={(e) => setNonBillableSummary(e.target.value)}
                placeholder="Internal sync, documentation, tech research, or setup..."
                className="w-full bg-white/95 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-slate-400 focus:border-slate-400 focus:outline-none text-xs transition-colors"
              />
            </div>

            {/* General Reason / Objective */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                Overall Justification / Reason <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="e.g. Critical release deployment and performance tuning for milestone delivery"
                className="w-full bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-colors shadow-2xs"
                required
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={assignedProjects.length === 0}
                className="flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-xs shadow-lg shadow-indigo-500/25 transition-all hover:-translate-y-0.5 active:scale-[0.99] cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Submit Weekend Work Request</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Stats 1/3 */}
        <div className="space-y-4">
          {/* Approved Hours KPI */}
          <div className="rounded-[22px] border border-amber-200/70 bg-gradient-to-br from-white via-amber-50/50 to-orange-50/70 p-5 shadow-[0_8px_25px_rgba(245,158,11,0.08)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-amber-300 hover:shadow-[0_14px_35px_rgba(245,158,11,0.18)]">
            <div className="flex items-start justify-between">
              <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 text-white shadow-md shadow-amber-500/25">
                <Clock className="h-5 w-5" />
              </div>
              <span className="rounded-full border border-amber-200/60 bg-gradient-to-r from-amber-500/15 to-orange-500/15 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-700">
                Approved
              </span>
            </div>
            <p className="mt-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Approved Weekend Hours
            </p>
            <div className="mt-0.5 text-2xl font-black text-slate-950">
              {approvedHours.toFixed(1)} hrs
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Automatically reflected in your timesheet
            </p>
          </div>

          {/* Pending Requests KPI */}
          <div className="rounded-[22px] border border-indigo-200/70 bg-gradient-to-br from-white via-indigo-50/50 to-violet-50/70 p-5 shadow-[0_8px_25px_rgba(99,102,241,0.08)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-[0_14px_35px_rgba(99,102,241,0.18)]">
            <div className="flex items-start justify-between">
              <div className="rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 p-2.5 text-white shadow-md shadow-indigo-500/25">
                <Moon className="h-5 w-5" />
              </div>
              <span className="rounded-full border border-indigo-200/60 bg-gradient-to-r from-indigo-500/15 to-violet-500/15 px-2.5 py-0.5 text-[10px] font-extrabold text-indigo-700">
                Pending
              </span>
            </div>
            <p className="mt-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Pending PM Approval
            </p>
            <div className="mt-0.5 text-2xl font-black text-slate-950">
              {userRequests.filter((r) => r.status === 'pending').length} Requests
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Waiting for manager sign-off
            </p>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="p-6 rounded-[24px] border border-slate-200/90 bg-white/95 backdrop-blur-sm shadow-[0_10px_35px_rgba(30,50,90,0.055)] space-y-4 text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="text-base font-black text-slate-950">Weekend Work History</h3>
          <span className="text-xs text-slate-500 font-extrabold">
            Total Requests: {userRequests.length}
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[9px] font-black bg-gradient-to-r from-slate-100/90 via-indigo-50/40 to-slate-100/90">
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Project</th>
                <th className="py-3 px-3">Billable Work</th>
                <th className="py-3 px-3 text-center">Billable / Non-Billable</th>
                <th className="py-3 px-3 text-right">Total Hours</th>
                <th className="py-3 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {userRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                    No weekend work requests submitted yet.
                  </td>
                </tr>
              ) : (
                userRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="py-3.5 px-3 font-extrabold text-slate-900 whitespace-nowrap">
                      {req.workDate}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="w-fit rounded-full border border-indigo-200/60 bg-gradient-to-r from-indigo-50 to-violet-50 px-2.5 py-1 text-[9px] font-extrabold text-indigo-700 inline-block">
                        {req.projectName}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-slate-700 max-w-xs">
                      <p className="font-semibold text-slate-800 truncate" title={req.deliverableObjective}>
                        {req.deliverableObjective}
                      </p>
                      {req.billableWorkSummary && req.billableWorkSummary !== req.deliverableObjective && (
                        <p className="text-[10px] text-slate-500 truncate" title={req.billableWorkSummary}>
                          {req.billableWorkSummary}
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-center whitespace-nowrap font-medium text-slate-600">
                      <span className="text-emerald-700 font-black">{req.billableHours || 0}h</span>
                      <span className="text-slate-300"> / </span>
                      <span className="text-slate-600">{req.nonBillableHours || 0}h</span>
                    </td>
                    <td className="py-3.5 px-3 text-right font-black text-slate-900">
                      {(req.plannedHours || (req.billableHours || 0) + (req.nonBillableHours || 0)).toFixed(1)}h
                    </td>
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold capitalize border ${
                          req.status === 'approved'
                            ? 'border-emerald-200/60 bg-gradient-to-r from-emerald-500/15 to-teal-500/15 text-emerald-700'
                            : req.status === 'pending'
                            ? 'border-amber-200/60 bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-amber-700'
                            : 'border-rose-200/60 bg-gradient-to-r from-rose-500/15 to-pink-500/15 text-rose-700'
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
