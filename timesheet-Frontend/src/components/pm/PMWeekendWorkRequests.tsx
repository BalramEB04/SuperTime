import { Pagination } from '../common/Pagination';
import React, { useState, useEffect } from 'react';
import { User, WeekendWorkRequest, Project } from '../../types';
import {
  CalendarX,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  AlertCircle,
  MessageSquare,
  X,
  FileText,
  Zap,
} from 'lucide-react';

interface PMWeekendWorkRequestsProps {
  currentUser: User;
  projects?: Project[];
  allUsers?: User[];
  weekendRequests: WeekendWorkRequest[];
  onApproveWeekendWork: (id: string) => void;
  onRejectWeekendWork: (id: string, comment?: string) => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

export const PMWeekendWorkRequests: React.FC<PMWeekendWorkRequestsProps> = ({
  currentUser,
  weekendRequests = [],
  onApproveWeekendWork,
  onRejectWeekendWork,
  onShowToast,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [rejectingRequest, setRejectingRequest] = useState<WeekendWorkRequest | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => { setCurrentPage(1); }, [statusFilter, searchTerm]);

  const filteredRequests = weekendRequests.filter((req) => {
    const matchesSearch =
      (req.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (req.projectName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (req.deliverableObjective || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (req.billableWorkSummary || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const paginatedRequests = filteredRequests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingRequest) return;

    onRejectWeekendWork(rejectingRequest.id, rejectComment);
    onShowToast('Request Declined', `Declined weekend work for ${rejectingRequest.userName}`, 'info');
    setRejectingRequest(null);
    setRejectComment('');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarX className="w-6 h-6 text-sky-600" />
            <span>Weekend Work &amp; Overtime Approvals</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Review and approve weekend work requests. Approving a request automatically generates and logs the employee's timesheet.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-600" />
            <span>{weekendRequests.filter((r) => r.status === 'pending').length} Pending Review</span>
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search employee, project, or task summary..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-xs font-bold text-slate-600 shrink-0">Filter:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer w-full sm:w-auto"
          >
            <option value="all">All Requests</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Request Cards Grid */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <p className="font-bold text-slate-700 text-sm">No weekend work requests found.</p>
            <p className="text-xs text-slate-400">No submissions matching the selected status filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paginatedRequests.map((req) => {
              const totalHours = req.plannedHours || (req.billableHours || 0) + (req.nonBillableHours || 0);

              return (
                <div
                  key={req.id}
                  className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3.5 hover:border-blue-300 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={req.userAvatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80'}
                          alt={req.userName}
                          className="w-9 h-9 rounded-full object-cover ring-2 ring-blue-500/20"
                        />
                        <div>
                          <h3 className="font-extrabold text-slate-900 text-sm">{req.userName}</h3>
                          <p className="text-[11px] font-bold text-blue-600">{req.projectName}</p>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black capitalize ${
                          req.status === 'pending'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : req.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>

                    <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <div className="flex justify-between items-center text-slate-600 font-medium">
                        <span>Weekend Work Date:</span>
                        <span className="font-bold text-slate-900 font-mono">{req.workDate}</span>
                      </div>

                      <div className="flex justify-between items-center text-slate-600 font-medium pb-2 border-b border-slate-200">
                        <span>Total Overtime:</span>
                        <span className="font-black text-indigo-700 text-xs">
                          {totalHours.toFixed(1)} Hours ({req.billableHours || 0}h Billable / {req.nonBillableHours || 0}h Non-Billable)
                        </span>
                      </div>

                      {/* Billable summary */}
                      {(req.billableHours || 0) > 0 && (
                        <div>
                          <span className="text-[10px] uppercase font-extrabold text-blue-700">
                            Billable Tasks ({req.billableHours}h):
                          </span>
                          <p className="font-medium text-slate-800 mt-0.5 leading-relaxed bg-white p-2 rounded-lg border border-blue-100 text-[11px]">
                            {req.billableWorkSummary || req.deliverableObjective}
                          </p>
                        </div>
                      )}

                      {/* Non-Billable summary */}
                      {(req.nonBillableHours || 0) > 0 && (
                        <div>
                          <span className="text-[10px] uppercase font-extrabold text-slate-600">
                            Non-Billable Tasks ({req.nonBillableHours}h):
                          </span>
                          <p className="font-medium text-slate-700 mt-0.5 leading-relaxed bg-white p-2 rounded-lg border border-slate-200 text-[11px]">
                            {req.nonBillableWorkSummary}
                          </p>
                        </div>
                      )}

                      {/* General Objective */}
                      {req.deliverableObjective && (!req.billableWorkSummary || req.deliverableObjective !== req.billableWorkSummary) && (
                        <div className="pt-1 border-t border-slate-200/80">
                          <span className="text-[10px] uppercase font-bold text-slate-500">Objective / Justification:</span>
                          <p className="font-medium text-slate-700 mt-0.5 leading-relaxed text-[11px]">
                            {req.deliverableObjective}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-slate-400 font-medium">
                      Requested on: {req.requestedOn}
                    </span>

                    {req.status === 'pending' ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            onApproveWeekendWork(req.id);
                            onShowToast(
                              'Request Approved & Timesheet Generated',
                              `Approved weekend work for ${req.userName}. Timesheet has been automatically created and approved.`,
                              'success'
                            );
                          }}
                          className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-2xs cursor-pointer transition-colors"
                        >
                          Approve & Generate Timesheet
                        </button>
                        <button
                          onClick={() => setRejectingRequest(req)}
                          className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 cursor-pointer transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] font-bold text-slate-500">
                        Reviewed by: {req.reviewedBy || currentUser.name}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* REJECT COMMENTS MODAL */}
      {rejectingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form
            onSubmit={handleConfirmReject}
            className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4 text-xs font-sans"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-black text-slate-900">
                Reject Overtime • {rejectingRequest.userName}
              </h3>
              <button
                type="button"
                onClick={() => setRejectingRequest(null)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-slate-600">
                Please provide feedback for declining weekend work on {rejectingRequest.workDate} ({rejectingRequest.plannedHours}h).
              </p>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Reason for Rejection
                </label>
                <textarea
                  rows={3}
                  value={rejectComment}
                  onChange={(e) => setRejectComment(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectingRequest(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer transition-colors"
              >
                Confirm Decline
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
