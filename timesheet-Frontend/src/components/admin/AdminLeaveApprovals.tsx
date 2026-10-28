import { Pagination } from '../common/Pagination';
import React, { useState, useEffect } from 'react';
import { User, LeaveRequest } from '../../types';
import {
  Palmtree,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Calendar,
  User as UserIcon,
  MessageSquare,
  ShieldAlert,
  Download,
  AlertCircle,
  Check,
  X,
  Eye,
  ChevronDown,
  Info,
  CalendarX,
  FileText,
  UserCheck,
} from 'lucide-react';

interface AdminLeaveApprovalsProps {
  currentUser: User;
  leaveRequests: LeaveRequest[];
  users: User[];
  onApproveLeave: (id: string, comment?: string) => void;
  onRejectLeave: (id: string, comment?: string) => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminLeaveApprovals: React.FC<AdminLeaveApprovalsProps> = ({
  currentUser,
  leaveRequests = [],
  users = [],
  onApproveLeave,
  onRejectLeave,
  onShowToast,
}) => {
  const [selectedStatusTab, setSelectedStatusTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'days_desc'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modal states
  const [reviewingRequest, setReviewingRequest] = useState<LeaveRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [reviewComment, setReviewComment] = useState<string>('');

  const [detailRequest, setDetailRequest] = useState<LeaveRequest | null>(null);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // User details helper map
  const userMap = new Map<string, User>(users.map((u) => [u.id, u]));

  // Metrics
  const pendingCount = leaveRequests.filter((r) => r.status === 'pending').length;
  const approvedCount = leaveRequests.filter((r) => r.status === 'approved').length;
  const rejectedCount = leaveRequests.filter((r) => r.status === 'rejected').length;
  const totalDaysApproved = leaveRequests
    .filter((r) => r.status === 'approved')
    .reduce((sum, r) => sum + r.daysCount, 0);

  // Departments list from users
  const departments = Array.from(new Set(users.map((u) => u.department).filter(Boolean)));

  // Filtered requests
  useEffect(() => { setCurrentPage(1); }, [searchQuery, selectedStatusTab, selectedTypeFilter, selectedDepartment, sortBy]);

  const filteredRequests = leaveRequests.filter((req) => {
    // Status filter
    if (selectedStatusTab !== 'all' && req.status !== selectedStatusTab) return false;

    // Type filter
    if (selectedTypeFilter !== 'all' && req.type !== selectedTypeFilter) return false;

    // Department filter
    if (selectedDepartment !== 'all') {
      const u = userMap.get(req.userId);
      if (!u || u.department !== selectedDepartment) return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = req.userName.toLowerCase().includes(q);
      const matchType = req.type.toLowerCase().includes(q);
      const matchReason = req.reason.toLowerCase().includes(q);
      const matchBackup = (req.backupContact || '').toLowerCase().includes(q);
      if (!matchName && !matchType && !matchReason && !matchBackup) return false;
    }

    return true;
  });

  const paginatedRequests = filteredRequests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Sorted requests
  const sortedRequests = [...filteredRequests].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.appliedOn).getTime() - new Date(a.appliedOn).getTime();
    }
    if (sortBy === 'oldest') {
      return new Date(a.appliedOn).getTime() - new Date(b.appliedOn).getTime();
    }
    if (sortBy === 'days_desc') {
      return b.daysCount - a.daysCount;
    }
    return 0;
  });

  // Checkbox handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(sortedRequests.map((r) => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkApprove = () => {
    selectedIds.forEach((id) => {
      onApproveLeave(id, 'Bulk approved by Admin');
    });
    onShowToast(
      'Bulk Approved',
      `Approved ${selectedIds.length} leave requests successfully.`,
      'success'
    );
    setSelectedIds([]);
  };

  const handleBulkReject = () => {
    selectedIds.forEach((id) => {
      onRejectLeave(id, 'Bulk rejected by Admin');
    });
    onShowToast(
      'Bulk Rejected',
      `Rejected ${selectedIds.length} leave requests.`,
      'info'
    );
    setSelectedIds([]);
  };

  const openReviewModal = (req: LeaveRequest, action: 'approve' | 'reject') => {
    setReviewingRequest(req);
    setReviewAction(action);
    setReviewComment(
      action === 'approve'
        ? 'Approved by Admin.'
        : 'Leave request rejected. Please consult with your manager regarding schedule conflict.'
    );
  };

  const submitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingRequest) return;

    if (reviewAction === 'approve') {
      onApproveLeave(reviewingRequest.id, reviewComment);
      onShowToast(
        'Leave Approved',
        `Approved leave request for ${reviewingRequest.userName}`,
        'success'
      );
    } else {
      onRejectLeave(reviewingRequest.id, reviewComment);
      onShowToast(
        'Leave Rejected',
        `Rejected leave request for ${reviewingRequest.userName}`,
        'info'
      );
    }

    setReviewingRequest(null);
    setReviewComment('');
  };

  const handleExportCSV = () => {
    const headers =
      'ID,Employee,Type,StartDate,EndDate,DaysCount,Reason,BackupContact,Status,AppliedOn,ReviewedBy,ReviewComment\n';
    const rows = sortedRequests
      .map(
        (r) =>
          `"${r.id}","${r.userName}","${r.type}","${r.startDate}","${r.endDate}",${
            r.daysCount
          },"${r.reason.replace(/"/g, '""')}","${(r.backupContact || '').replace(
            /"/g,
            '""'
          )}","${r.status}","${r.appliedOn}","${r.reviewedBy || ''}","${(
            r.reviewComment || ''
          ).replace(/"/g, '""')}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Employee_Leave_Approvals_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    onShowToast('Export Complete', 'Exported leave requests summary log to CSV.', 'success');
  };

  return (
    <div className="space-y-6 text-slate-900 font-sans">
      {/* Header Section */}
      <div className="p-5 bg-white border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-cyan-50 text-cyan-800 border border-cyan-200 mb-1">
            <Palmtree className="w-3.5 h-3.5 text-cyan-600" />
            <span>Employee Time Off &amp; Leave Governance</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Palmtree className="w-6 h-6 text-cyan-600" />
            <span>Employee Leave Approvals</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Review, approve, or reject employee leave applications and monitor coverage and leave allocations across all departments.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Export CSV Report</span>
          </button>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Pending Approvals */}
        <button
          type="button"
          onClick={() => setSelectedStatusTab('pending')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            selectedStatusTab === 'pending'
              ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-400/20 shadow-md'
              : 'bg-white border-slate-200 hover:border-amber-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
            <span className="flex items-center gap-1 text-[10px] font-extrabold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Action Required</span>
            </span>
          </div>
          <p className="text-[10px] font-black uppercase tracking-wider text-amber-900/80">
            Pending Approvals
          </p>
          <h3 className="text-2xl font-black text-amber-600 mt-1">{pendingCount} Requests</h3>
          <p className="text-[11px] text-amber-800/90 font-medium mt-0.5">Awaiting manager decision</p>
        </button>

        {/* Approved Requests */}
        <button
          type="button"
          onClick={() => setSelectedStatusTab('approved')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            selectedStatusTab === 'approved'
              ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-400/20 shadow-md'
              : 'bg-white border-slate-200 hover:border-emerald-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200">
              Approved
            </span>
          </div>
          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-900/80">
            Approved Requests
          </p>
          <h3 className="text-2xl font-black text-emerald-600 mt-1">{approvedCount} Requests</h3>
          <p className="text-[11px] text-emerald-800/90 font-medium mt-0.5">Scheduled leave balance</p>
        </button>

        {/* Rejected Requests */}
        <button
          type="button"
          onClick={() => setSelectedStatusTab('rejected')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            selectedStatusTab === 'rejected'
              ? 'bg-rose-50/80 border-rose-400 ring-2 ring-rose-400/20 shadow-md'
              : 'bg-white border-slate-200 hover:border-rose-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
              <XCircle className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-extrabold text-rose-800 bg-rose-100/80 px-2 py-0.5 rounded-full border border-rose-200">
              Rejected
            </span>
          </div>
          <p className="text-[10px] font-black uppercase tracking-wider text-rose-900/80">
            Rejected Requests
          </p>
          <h3 className="text-2xl font-black text-rose-600 mt-1">{rejectedCount} Requests</h3>
          <p className="text-[11px] text-rose-800/90 font-medium mt-0.5">Declined leave applications</p>
        </button>

        {/* Days Approved Total */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <Calendar className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-extrabold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded-full border border-indigo-200">
              Approved
            </span>
          </div>
          <p className="text-[10px] font-black uppercase tracking-wider text-indigo-900/80">
            Approved Leave Days
          </p>
          <h3 className="text-2xl font-black text-indigo-700 mt-1">{totalDaysApproved} Days</h3>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">Cumulative time off</p>
        </div>
      </div>

      {/* Main Container */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-4">
        {/* Status Tabs Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200">
            <button
              type="button"
              onClick={() => setSelectedStatusTab('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedStatusTab === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Requests ({leaveRequests.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatusTab('pending')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedStatusTab === 'pending'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Pending</span>
              {pendingCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatusTab('approved')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedStatusTab === 'approved'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Approved ({approvedCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatusTab('rejected')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedStatusTab === 'rejected'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rejected ({rejectedCount})
            </button>
          </div>

          {/* Bulk Action Bar when items selected */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 p-2 rounded-xl border border-amber-200">
              <span className="text-xs font-bold text-amber-900 px-2">
                {selectedIds.length} Selected
              </span>
              <button
                type="button"
                onClick={handleBulkApprove}
                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Approve Selected</span>
              </button>
              <button
                type="button"
                onClick={handleBulkReject}
                className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reject Selected</span>
              </button>
            </div>
          )}
        </div>

        {/* Filters and Search Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search employee, reason, backup..."
              className="w-full bg-slate-50 border border-slate-300 text-xs text-slate-900 rounded-xl pl-9 pr-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
            />
          </div>

          {/* Leave Type Filter */}
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-xs text-slate-900 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold"
          >
            <option value="all">All Leave Types</option>
            <option value="Annual Leave">Annual Leave</option>
            <option value="Sick Leave">Sick Leave</option>
            <option value="Parental Leave">Parental Leave</option>
            <option value="Compensatory Off">Compensatory Off</option>
            <option value="Casual Leave">Casual Leave</option>
          </select>

          {/* Department Filter */}
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-xs text-slate-900 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold"
          >
            <option value="all">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-50 border border-slate-300 text-xs text-slate-900 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold"
          >
            <option value="newest">Sort: Newest Applied</option>
            <option value="oldest">Sort: Oldest Applied</option>
            <option value="days_desc">Sort: Longest Duration</option>
          </select>
        </div>

        {/* Requests Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] bg-slate-50">
                <th className="py-3 px-3 w-8 text-center">
                  <input
                    type="checkbox"
                    checked={
                      sortedRequests.length > 0 &&
                      selectedIds.length === sortedRequests.length
                    }
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="py-3 px-3">Employee</th>
                <th className="py-3 px-3">Leave Type</th>
                <th className="py-3 px-3">Dates & Duration</th>
                <th className="py-3 px-3">Reason & Backup</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sortedRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Palmtree className="w-8 h-8 text-slate-300" />
                      <p className="font-bold text-slate-600">No leave requests found</p>
                      <p className="text-[11px] text-slate-400">
                        Try adjusting your status filter or search query.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedRequests.map((req) => {
                  const emp = userMap.get(req.userId);
                  const isSelected = selectedIds.includes(req.id);

                  return (
                    <tr
                      key={req.id}
                      className={`hover:bg-blue-50/30 transition-colors ${
                        isSelected ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <td className="py-3.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(req.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>

                      {/* Employee Column */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5">
                          {req.userAvatar ? (
                            <img
                              src={req.userAvatar}
                              alt={req.userName}
                              className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-100"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-extrabold text-xs flex items-center justify-center">
                              {req.userName.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-slate-900">{req.userName}</p>
                            <p className="text-[10px] text-slate-500 font-medium">
                              {emp?.title || 'Team Member'} {emp?.department ? `• ${emp.department}` : ''}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Leave Type */}
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-extrabold ${
                            req.type === 'Annual Leave'
                              ? 'bg-blue-100 text-blue-800'
                              : req.type === 'Sick Leave'
                              ? 'bg-amber-100 text-amber-800'
                              : req.type === 'Parental Leave'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          <Palmtree className="w-3 h-3" />
                          <span>{req.type}</span>
                        </span>
                      </td>

                      {/* Dates & Duration */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-900">
                            {req.startDate} {req.startDate !== req.endDate ? `→ ${req.endDate}` : ''}
                          </p>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-extrabold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                              {req.daysCount} {req.daysCount === 1 ? 'Day' : 'Days'}
                            </span>
                            {req.isHalfDay && (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                Half Day
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Reason & Backup */}
                      <td className="py-3.5 px-3 max-w-xs">
                        <div className="space-y-1">
                          <p className="text-slate-800 font-medium truncate" title={req.reason}>
                            {req.reason}
                          </p>
                          {req.backupContact && (
                            <p className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                              <UserCheck className="w-3 h-3 text-blue-600 shrink-0" />
                              <span className="truncate">Backup: {req.backupContact}</span>
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold capitalize ${
                              req.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : req.status === 'pending'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {req.status === 'approved' && <CheckCircle2 className="w-3 h-3" />}
                            {req.status === 'pending' && <Clock className="w-3 h-3 animate-spin" />}
                            {req.status === 'rejected' && <XCircle className="w-3 h-3" />}
                            <span>{req.status}</span>
                          </span>
                          {req.reviewedBy && (
                            <span className="text-[9px] text-slate-400 mt-0.5 font-medium">
                              By {req.reviewedBy}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {req.status === 'pending' ? (
                            <>
                              {/* 
                              <button
                                type="button"
                                onClick={() => openReviewModal(req, 'approve')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                                title="Approve Request"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => openReviewModal(req, 'reject')}
                                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[11px] shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                                title="Reject Request"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                              */}
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openReviewModal(req, req.status === 'approved' ? 'reject' : 'approve')}
                              className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors cursor-pointer"
                              title="Change Approval Status"
                            >
                              Change Status
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setDetailRequest(req)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                            title="View Full Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* APPROVE / REJECT REVIEW MODAL */}
      {reviewingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div
                  className={`p-2 rounded-xl ${
                    reviewAction === 'approve'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {reviewAction === 'approve' ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <XCircle className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {reviewAction === 'approve' ? 'Approve Leave Request' : 'Reject Leave Request'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Employee: <span className="font-bold text-slate-800">{reviewingRequest.userName}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReviewingRequest(null)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Leave Details Summary Box */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/90 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700">{reviewingRequest.type}</span>
                <span className="font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {reviewingRequest.daysCount} Days
                </span>
              </div>
              <p className="text-slate-600 font-medium">
                <span className="font-bold text-slate-800">Dates: </span>
                {reviewingRequest.startDate} → {reviewingRequest.endDate}
              </p>
              <p className="text-slate-600 font-medium">
                <span className="font-bold text-slate-800">Reason: </span>
                {reviewingRequest.reason}
              </p>
              {reviewingRequest.backupContact && (
                <p className="text-slate-500 italic">
                  <span className="font-bold text-slate-700">Backup Contact: </span>
                  {reviewingRequest.backupContact}
                </p>
              )}
            </div>

            <form onSubmit={submitReview} className="space-y-4 text-xs font-medium">
              {/* Decision Toggle */}
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Action Decision</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewAction('approve')}
                    className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      reviewAction === 'approve'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>Approve Leave</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewAction('reject')}
                    className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      reviewAction === 'reject'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <X className="w-4 h-4" />
                    <span>Reject Leave</span>
                  </button>
                </div>
              </div>

              {/* Remarks / Comments */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {reviewAction === 'approve' ? 'Approval Note (Optional)' : 'Rejection Reason / Note'}
                </label>
                <textarea
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder={
                    reviewAction === 'approve'
                      ? 'Add any comments for the employee...'
                      : 'Provide reason for rejecting this leave request...'
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required={reviewAction === 'reject'}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReviewingRequest(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-white font-extrabold rounded-xl shadow-md transition-all cursor-pointer ${
                    reviewAction === 'approve'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                      : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                  }`}
                >
                  {reviewAction === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL LEAVE REQUEST DETAIL MODAL */}
      {detailRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Palmtree className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-extrabold text-slate-900">
                  Leave Request Detail
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailRequest(null)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                {detailRequest.userAvatar ? (
                  <img
                    src={detailRequest.userAvatar}
                    alt={detailRequest.userName}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-500/20"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-black text-sm flex items-center justify-center">
                    {detailRequest.userName.charAt(0)}
                  </div>
                )}
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">
                    {detailRequest.userName}
                  </h4>
                  <p className="text-slate-500 font-medium">
                    Applied on: {detailRequest.appliedOn}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-700">
                <div className="p-2.5 bg-slate-50 rounded-lg">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">Type</span>
                  <span className="font-extrabold text-slate-900">{detailRequest.type}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">Duration</span>
                  <span className="font-extrabold text-blue-600">{detailRequest.daysCount} Days</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <span className="block text-[10px] text-slate-400 font-bold uppercase">
                  Leave Date Window
                </span>
                <p className="font-extrabold text-slate-900">
                  {detailRequest.startDate} to {detailRequest.endDate}
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <span className="block text-[10px] text-slate-400 font-bold uppercase">Reason</span>
                <p className="font-medium text-slate-800 leading-relaxed">{detailRequest.reason}</p>
              </div>

              {detailRequest.backupContact && (
                <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">
                    Backup Coverage Contact
                  </span>
                  <p className="font-semibold text-slate-800">{detailRequest.backupContact}</p>
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <span className="block text-[10px] text-slate-400 font-bold uppercase">
                  Approval Status
                </span>
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold capitalize ${
                      detailRequest.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : detailRequest.status === 'pending'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {detailRequest.status}
                  </span>
                  {detailRequest.reviewedBy && (
                    <span className="text-slate-500 text-[11px] font-medium">
                      Reviewed by: {detailRequest.reviewedBy}
                    </span>
                  )}
                </div>
                {detailRequest.reviewComment && (
                  <p className="text-[11px] text-slate-600 italic mt-1 bg-white p-2 rounded border border-slate-200">
                    "{detailRequest.reviewComment}"
                  </p>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              {detailRequest.status === 'pending' && (
                <>
                  {/* 
                  <button
                    type="button"
                    onClick={() => {
                      const req = detailRequest;
                      setDetailRequest(null);
                      openReviewModal(req, 'approve');
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs cursor-pointer"
                  >
                    Approve Request
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const req = detailRequest;
                      setDetailRequest(null);
                      openReviewModal(req, 'reject');
                    }}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-xs cursor-pointer"
                  >
                    Reject Request
                  </button>
                  */}
                </>
              )}
              <button
                type="button"
                onClick={() => setDetailRequest(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
