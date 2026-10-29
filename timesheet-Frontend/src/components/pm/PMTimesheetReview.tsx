import { Pagination } from '../common/Pagination';
import React, { useState, useEffect, useMemo } from 'react';
import {
  useGetUpcomingLeavesQuery,
  useGetDailyEodPreviewQuery,
  useSendDailyEodToSlackMutation,
  useGetHolidaysQuery,
  useGetLeaveRequestsQuery,
  DailyEodEntry,
} from '../../store/api/dataApi';
import { Project, User, TimesheetEntry } from '../../types';
import {
  CheckSquare,
  Search,
  Filter,
  Users,
  Briefcase,
  Calendar,
  Clock,
  Eye,
  FileText,
  Sparkles,
  Info,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  CalendarDays,
  Building2,
  RefreshCw,
  Layers,
  Send,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  X,
  AlertTriangle,
} from 'lucide-react';

interface PMTimesheetReviewProps {
  currentUser: User;
  projects: Project[];
  allUsers: User[];
  timesheets: TimesheetEntry[];
}

export const PMTimesheetReview: React.FC<PMTimesheetReviewProps> = React.memo(({
  currentUser,
  projects = [],
  allUsers = [],
  timesheets = [],
}) => {
  const today = new Date().toISOString().split('T')[0];
  const [activeTab, setActiveTab] = useState<'compliance_calendar' | 'eod' | 'review'>('compliance_calendar');

  // Queries for Compliance Calendar
  const { data: holidays = [] } = useGetHolidaysQuery();
  const { data: leaveRequests = [] } = useGetLeaveRequestsQuery();

  // Compliance Calendar State
  const currentDate = new Date();
  const [complianceYear, setComplianceYear] = useState<number>(currentDate.getFullYear());
  const [complianceMonth, setComplianceMonth] = useState<number>(currentDate.getMonth()); // 0-indexed
  const [complianceProjectFilter, setComplianceProjectFilter] = useState<string>('all');
  const [complianceUserSearch, setComplianceUserSearch] = useState<string>('');
  const [complianceDrilldown, setComplianceDrilldown] = useState<{
    user: User;
    dateStr: string;
    entries: TimesheetEntry[];
    isMissing: boolean;
    holidayName?: string;
    leaveReason?: string;
  } | null>(null);
  const [copiedReminder, setCopiedReminder] = useState<boolean>(false);

  // Review Tab State
  const { data: upcomingLeaves = [] } = useGetUpcomingLeavesQuery();

  // Consolidate leave requests and upcoming leaves to ensure complete and robust coverage
  const consolidatedLeaves = useMemo(() => {
    const list: Array<{ userId: string; status: string; startDate: string; endDate: string; reason?: string; type?: string }> = [];
    const seen = new Set<string>();

    leaveRequests.forEach((l) => {
      const id = String(l.id || (String(l.userId) + "-" + String(l.startDate)));
      if (!seen.has(id)) {
        seen.add(id);
        list.push({
          userId: String(l.userId),
          status: (l.status || '').toLowerCase(),
          startDate: l.startDate,
          endDate: l.endDate,
          reason: l.reason,
          type: l.type,
        });
      }
    });

    upcomingLeaves.forEach((l: any) => {
      const id = String(l.id || (String(l.user_id || l.userId) + "-" + String(l.start_date || l.startDate)));
      if (!seen.has(id)) {
        seen.add(id);
        list.push({
          userId: String(l.user_id || l.userId),
          status: (l.status || '').toLowerCase(),
          startDate: l.start_date || l.startDate,
          endDate: l.end_date || l.endDate,
          reason: l.reason,
          type: l.leave_type?.name || l.type || 'Leave',
        });
      }
    });

    return list;
  }, [leaveRequests, upcomingLeaves]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [viewingDesc, setViewingDesc] = useState<{ billable: string; nonBillable: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // EOD Tab State
  const [eodDate, setEodDate] = useState<string>(today);
  const [eodSearch, setEodSearch] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [eodCurrentPage, setEodCurrentPage] = useState<number>(1);
  const [eodItemsPerPage, setEodItemsPerPage] = useState<number>(10);
  const [slackFeedback, setSlackFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [sendDailyEodToSlack, { isLoading: isSendingSlack }] = useSendDailyEodToSlackMutation();

  const {
    data: eodPreviewData,
    isLoading: isEodLoading,
    refetch: refetchEod,
  } = useGetDailyEodPreviewQuery(eodDate, {
    skip: activeTab !== 'eod',
  });

  // PM's projects (all projects managed by PM, for timesheet record resolution)
  const allPmProjects = useMemo(() => {
    return (projects || []).filter((p) => {
      if (currentUser?.role === 'admin') return true;
      if (p.project_manager_id && currentUser?.id && String(p.project_manager_id) === String(currentUser.id)) return true;
      if (p.pmName && currentUser?.name && p.pmName.trim().toLowerCase() === currentUser.name.trim().toLowerCase()) return true;
      return false;
    });
  }, [projects, currentUser]);

  // Active PM Projects (only active projects should be visible in filters and compliance monitoring)
  const pmProjects = useMemo(() => {
    return allPmProjects.filter((p) => p.isActive !== false && p.is_active !== false);
  }, [allPmProjects]);

  const allPmProjectIds = useMemo(() => allPmProjects.map((p) => p.id), [allPmProjects]);

  // Filter timesheets for PM's managed projects
  const pmTimesheets = useMemo(() => {
    return (timesheets || []).filter((t) => {
      if (currentUser?.role === 'admin') return true;
      return allPmProjectIds.includes(t.projectId);
    });
  }, [timesheets, allPmProjectIds, currentUser]);

  // Apply filters for review tab
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedProject, selectedUser, dateFilter]);

  const filteredTimesheets = useMemo(() => {
    const search = searchTerm.toLowerCase();
    return pmTimesheets.filter((t) => {
      const matchesSearch =
        !search ||
        t.userName.toLowerCase().includes(search) ||
        t.projectName.toLowerCase().includes(search) ||
        t.description.toLowerCase().includes(search) ||
        (t.billableDescription && t.billableDescription.toLowerCase().includes(search));

      const matchesProject = selectedProject === 'all' || t.projectId === selectedProject;
      const matchesUser = selectedUser === 'all' || t.userId === selectedUser;
      const matchesDate = !dateFilter || t.date === dateFilter;

      return matchesSearch && matchesProject && matchesUser && matchesDate;
    });
  }, [pmTimesheets, searchTerm, selectedProject, selectedUser, dateFilter]);

  // Calculate summary metrics for review tab
  const { totalLoggedHours, totalBillableHours, totalNonBillableHours, billableRatio } = useMemo(() => {
    const logged = filteredTimesheets.reduce((sum, t) => sum + (t.billableHours + t.nonBillableHours), 0);
    const billable = filteredTimesheets.reduce((sum, t) => sum + (t.billableHours || 0), 0);
    const nonBillable = filteredTimesheets.reduce((sum, t) => sum + (t.nonBillableHours || 0), 0);
    const ratio = logged > 0 ? Math.round((billable / logged) * 100) : 0;
    return {
      totalLoggedHours: logged,
      totalBillableHours: billable,
      totalNonBillableHours: nonBillable,
      billableRatio: ratio,
    };
  }, [filteredTimesheets]);

  const paginatedTimesheets = filteredTimesheets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Filtered EOD entries
  const filteredEodEntries = useMemo(() => {
    const entries = eodPreviewData?.entries || [];
    if (!eodSearch.trim()) return entries;
    const query = eodSearch.toLowerCase();
    return entries.filter(
      (e) =>
        e.employee_name.toLowerCase().includes(query) ||
        e.employee_email.toLowerCase().includes(query) ||
        e.department.toLowerCase().includes(query) ||
        e.project_name.toLowerCase().includes(query) ||
        e.billable_work_summary.toLowerCase().includes(query) ||
        e.non_billable_work_summary.toLowerCase().includes(query)
    );
  }, [eodPreviewData, eodSearch]);

  const paginatedEodEntries = useMemo(() => {
    return filteredEodEntries.slice(
      (eodCurrentPage - 1) * eodItemsPerPage,
      eodCurrentPage * eodItemsPerPage
    );
  }, [filteredEodEntries, eodCurrentPage, eodItemsPerPage]);

  useEffect(() => {
    setEodCurrentPage(1);
  }, [eodSearch, eodDate]);

  // Handle Export Download
  const handleExportDailyEod = async (format: 'xlsx' | 'csv') => {
    try {
      setIsExporting(true);
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
      const response = await fetch(
        `${API_BASE_URL}/reports/daily-eod/export?date=${eodDate}&format=${format}`,
        {
          method: 'GET',
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw new Error(`Failed to generate export (${response.statusText})`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `daily_eod_report_${eodDate.replace(/-/g, '')}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading daily EOD report:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Send to Slack
  const handleSendToSlack = async () => {
    try {
      setSlackFeedback(null);
      const res = await sendDailyEodToSlack({ date: eodDate }).unwrap();
      setSlackFeedback({
        type: 'success',
        message: res.message || 'Daily EOD report sent to Slack channel successfully!',
      });
      setTimeout(() => setSlackFeedback(null), 6000);
    } catch (err: any) {
      const errDetail = err?.data?.detail || err?.data?.message || 'Failed to dispatch report to Slack';
      setSlackFeedback({
        type: 'error',
        message: errDetail,
      });
      setTimeout(() => setSlackFeedback(null), 8000);
    }
  };

  return (
    <div className="space-y-6 text-slate-900 font-sans">
      {/* Header Banner */}
      <div className="p-5 bg-white border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-sky-600" />
            <span>Team Timesheets &amp; EOD Reports</span>
          </h1>
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
            Review your team's submitted timesheets and generate consolidated daily EOD reports across all employees.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center bg-slate-100 p-1 border border-slate-200 shrink-0">
          <button
            onClick={() => setActiveTab('compliance_calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'compliance_calendar'
                ? 'bg-white text-sky-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5 text-sky-600" />
            <span>Team Compliance Calendar</span>
          </button>
          <button
            onClick={() => setActiveTab('eod')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'eod'
                ? 'bg-white text-sky-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Daily EOD Report</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: REVIEW LOG */}
      {/* ========================================================================= */}
      {activeTab === 'review' && (
        <div className="space-y-6">
          {/* Summary KPI Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider">
                Total Logged Hours
              </span>
              <p className="text-2xl font-black text-slate-900">{totalLoggedHours.toFixed(1)}h</p>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>Across filtered entries</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[10px] uppercase font-black text-emerald-600 tracking-wider">
                Billable Hours
              </span>
              <p className="text-2xl font-black text-emerald-700">{totalBillableHours.toFixed(1)}h</p>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
                <Sparkles className="w-3 h-3 text-emerald-500" />
                <span>Invoiced to clients</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider">
                Non-Billable Hours
              </span>
              <p className="text-2xl font-black text-slate-700">{totalNonBillableHours.toFixed(1)}h</p>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                <Briefcase className="w-3 h-3 text-slate-400" />
                <span>Internal / Overhead</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[10px] uppercase font-black text-blue-600 tracking-wider">
                Billable Ratio
              </span>
              <p className="text-2xl font-black text-blue-700">{billableRatio}%</p>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600">
                <CheckCircle2 className="w-3 h-3 text-blue-500" />
                <span>Target: &gt; 80%</span>
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-3 w-full">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by employee, project, or task..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Project Filter */}
              <div className="min-w-[150px]">
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Projects</option>
                  {pmProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Employee Filter */}
              <div className="min-w-[150px]">
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Employees</option>
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Filter */}
              <div className="min-w-[140px]">
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                />
              </div>
            </div>

            {dateFilter && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDateFilter('')}
                  className="text-slate-500 hover:text-slate-800 underline text-[11px] cursor-pointer"
                >
                  Clear date
                </button>
              </div>
            )}
          </div>

          {/* Timesheets Review Table (READ ONLY) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Timesheet Log</span>
              </h2>
              <span className="text-xs font-bold text-slate-500">
                {filteredTimesheets.length} Records
              </span>
            </div>

            {filteredTimesheets.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <FileText className="w-8 h-8 mx-auto text-slate-300" />
                <p className="font-bold text-slate-700 text-sm">No timesheets match current filters.</p>
                <p className="text-xs text-slate-400">Try adjusting your project, employee or date filter.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-sans text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-black text-slate-500 tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Project</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Work Summary</th>
                      <th className="py-3 px-4 text-right">Hours (B / NB)</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {paginatedTimesheets.map((ts) => {
                      const userLeaves = upcomingLeaves.filter(
                        (l: any) => l.user_id.toString() === ts.userId.toString()
                      );
                      const isOnLeaveThisDay = userLeaves.some(
                        (l: any) => l.start_date <= ts.date && l.end_date >= ts.date
                      );

                      return (
                        <tr key={ts.id} className="hover:bg-blue-50/20 transition-colors">
                          {/* Employee */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={ts.userAvatar}
                                alt={ts.userName}
                                className="w-7 h-7 rounded-full object-cover ring-2 ring-blue-500/20"
                              />
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-extrabold text-slate-900">{ts.userName}</p>
                                  {isOnLeaveThisDay && (
                                    <span className="px-1 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[9px] font-bold uppercase tracking-wider">
                                      On Leave
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-400 font-medium">Submitted</p>
                              </div>
                            </div>
                          </td>

                          {/* Project */}
                          <td className="py-3.5 px-4 whitespace-nowrap font-bold text-blue-700">
                            {ts.projectName}
                          </td>

                          {/* Date */}
                          <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-slate-600">
                            {ts.date}
                          </td>

                          {/* Work Summary */}
                          <td
                            className="py-3.5 px-4 max-w-sm cursor-pointer group"
                            onClick={() =>
                              setViewingDesc({
                                billable: ts.billableDescription || ts.description,
                                nonBillable: ts.nonBillableDescription,
                              })
                            }
                          >
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-slate-800 truncate leading-relaxed group-hover:text-blue-600 transition-colors flex-1">
                                {ts.description ||
                                  ts.billableDescription ||
                                  ts.nonBillableDescription ||
                                  'No summary provided'}
                              </p>
                              <span className="shrink-0 px-2 py-1 rounded bg-blue-50 text-[10px] font-extrabold text-blue-700 border border-blue-200 group-hover:bg-blue-600 group-hover:text-white transition-all uppercase tracking-wider">
                                View
                              </span>
                            </div>
                          </td>

                          {/* Hours */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <span className="font-black text-slate-900 text-sm block">
                              {(ts.billableHours || 0) + (ts.nonBillableHours || 0)}h Total
                            </span>
                            <span className="text-[10px] font-bold text-emerald-700 block">
                              {ts.billableHours}h Billable / {ts.nonBillableHours}h NB
                            </span>
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                              Submitted Log
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {filteredTimesheets.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={filteredTimesheets.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
              />
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CONSOLIDATED DAILY EOD REPORT & SLACK INTEGRATION */}
      {/* ========================================================================= */}
      {activeTab === 'eod' && (
        <div className="space-y-6">
          {/* Controls & Export Header Card */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-base font-black text-slate-900">
                    Daily EOD Report & Slack Dispatch
                  </h2>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Export all employees' separate submitted EOD work summaries and hours for any selected day in a single file or send directly to Slack.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Send to Slack Button */}
                <button
                  type="button"
                  onClick={handleSendToSlack}
                  disabled={isSendingSlack}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-black transition-all shadow-sm cursor-pointer disabled:opacity-50"
                  title="Send Daily EOD Report & Excel file to configured Slack channel"
                >
                  <Send className={`w-4 h-4 ${isSendingSlack ? 'animate-pulse' : ''}`} />
                  <span>{isSendingSlack ? 'Sending to Slack...' : 'Send EOD to Slack'}</span>
                </button>

                {/* Download Excel */}
                <button
                  type="button"
                  onClick={() => handleExportDailyEod('xlsx')}
                  disabled={isExporting}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all shadow-sm cursor-pointer disabled:opacity-50"
                  title="Download consolidated Excel workbook"
                >
                  <Download className="w-4 h-4" />
                  <span>{isExporting ? 'Generating...' : 'Download Excel (.xlsx)'}</span>
                </button>

                {/* Export CSV */}
                <button
                  type="button"
                  onClick={() => handleExportDailyEod('csv')}
                  disabled={isExporting}
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-300 cursor-pointer disabled:opacity-50"
                  title="Download standard CSV"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Export CSV</span>
                </button>

                {/* Refresh */}
                <button
                  type="button"
                  onClick={() => refetchEod()}
                  className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-all cursor-pointer"
                  title="Refresh EOD Data"
                >
                  <RefreshCw className={`w-4 h-4 ${isEodLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Slack Feedback Alert Banner */}
            {slackFeedback && (
              <div
                className={`p-3.5 rounded-xl flex items-center gap-2.5 text-xs font-bold transition-all ${
                  slackFeedback.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border border-rose-200 text-rose-900'
                }`}
              >
                {slackFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{slackFeedback.message}</span>
              </div>
            )}

            {/* Date Picker & Search Controls */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              <div className="md:col-span-4 flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <CalendarDays className="w-4 h-4 text-blue-600 shrink-0" />
                <label className="text-xs font-bold text-slate-600 shrink-0">Report Date:</label>
                <input
                  type="date"
                  value={eodDate}
                  onChange={(e) => setEodDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-extrabold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                />
              </div>

              <div className="md:col-span-8 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by employee name, department, project, or work description..."
                  value={eodSearch}
                  onChange={(e) => setEodSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* EOD Metrics Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Submissions</span>
              <p className="text-xl font-black text-slate-900">{eodPreviewData?.total_submissions || 0}</p>
              <p className="text-[10px] text-slate-400 font-medium">Task rows logged</p>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">Active Employees</span>
              <p className="text-xl font-black text-blue-700">{eodPreviewData?.total_employees || 0}</p>
              <p className="text-[10px] text-blue-500 font-medium">Submitted for this day</p>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">Billable (h)</span>
              <p className="text-xl font-black text-emerald-700">{(eodPreviewData?.total_billable_hours || 0).toFixed(1)}h</p>
              <p className="text-[10px] text-emerald-600 font-medium">Client invoiced</p>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Non-Billable (h)</span>
              <p className="text-xl font-black text-slate-700">{(eodPreviewData?.total_non_billable_hours || 0).toFixed(1)}h</p>
              <p className="text-[10px] text-slate-500 font-medium">Internal overhead</p>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-0.5 col-span-2 md:col-span-1">
              <span className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider">Grand Total (h)</span>
              <p className="text-xl font-black text-indigo-700">{(eodPreviewData?.grand_total_hours || 0).toFixed(1)}h</p>
              <p className="text-[10px] text-indigo-500 font-medium">Total logged time</p>
            </div>
          </div>

          {/* Consolidated Daily EOD Entries Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-extrabold text-slate-900">
                  Consolidated Employee EOD Submissions — {eodDate}
                </h3>
              </div>
              <span className="text-xs font-bold text-slate-500">
                {filteredEodEntries.length} {filteredEodEntries.length === 1 ? 'Entry' : 'Entries'}
              </span>
            </div>

            {isEodLoading ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <RefreshCw className="w-6 h-6 mx-auto animate-spin text-blue-500" />
                <p className="text-xs font-bold text-slate-600">Loading daily EOD submissions...</p>
              </div>
            ) : filteredEodEntries.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <FileSpreadsheet className="w-8 h-8 mx-auto text-slate-300" />
                <p className="font-bold text-slate-700 text-sm">No EOD submissions found for {eodDate}.</p>
                <p className="text-xs text-slate-400">Select another date or check back once team members submit their daily timesheets.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-sans text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-black text-slate-500 tracking-wider">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">#</th>
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Project</th>
                      <th className="py-3 px-4 bg-emerald-50/50 text-emerald-800">Billable Work Summary</th>
                      <th className="py-3 px-4 bg-slate-100/60 text-slate-700">Non-Billable Notes</th>
                      <th className="py-3 px-4 text-right">Hours (B / NB)</th>
                      <th className="py-3 px-4 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {paginatedEodEntries.map((e, idx) => (
                      <tr key={e.timesheet_id} className="hover:bg-slate-50 transition-colors">
                        {/* Index */}
                        <td className="py-3.5 px-4 text-center text-slate-400 font-mono text-[11px]">
                          {(eodCurrentPage - 1) * eodItemsPerPage + idx + 1}
                        </td>

                        {/* Employee */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <p className="font-extrabold text-slate-900">{e.employee_name}</p>
                          <p className="text-[11px] text-slate-400 font-medium">{e.employee_email}</p>
                        </td>

                        {/* Department */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            {e.department}
                          </span>
                        </td>

                        {/* Project */}
                        <td className="py-3.5 px-4 whitespace-nowrap font-bold text-blue-700">
                          <p>{e.project_name}</p>
                          <p className="text-[10px] text-slate-400 font-mono font-normal">{e.project_code}</p>
                        </td>

                        {/* Billable Work Summary */}
                        <td className="py-3.5 px-4 max-w-xs bg-emerald-50/20">
                          {e.billable_work_summary ? (
                            <p className="font-medium text-slate-800 leading-relaxed whitespace-pre-wrap text-xs">
                              {e.billable_work_summary}
                            </p>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">No billable work logged</span>
                          )}
                        </td>

                        {/* Non-Billable Work Summary */}
                        <td className="py-3.5 px-4 max-w-xs bg-slate-50/40">
                          {e.non_billable_work_summary ? (
                            <p className="font-medium text-slate-600 leading-relaxed whitespace-pre-wrap text-xs italic">
                              {e.non_billable_work_summary}
                            </p>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">—</span>
                          )}
                        </td>

                        {/* Hours breakdown */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <span className="text-[11px] font-extrabold text-emerald-700 block">
                            {e.billable_hours.toFixed(1)}h B
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 block">
                            {e.non_billable_hours.toFixed(1)}h NB
                          </span>
                        </td>

                        {/* Total Hours */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-blue-50 text-blue-700 border border-blue-200">
                            {e.total_hours.toFixed(1)}h
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {filteredEodEntries.length > 0 && (
              <Pagination
                currentPage={eodCurrentPage}
                totalItems={filteredEodEntries.length}
                itemsPerPage={eodItemsPerPage}
                onPageChange={setEodCurrentPage}
                onItemsPerPageChange={setEodItemsPerPage}
              />
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TEAM COMPLIANCE CALENDAR (MISSING HIGHLIGHTED IN VIBRANT RED) */}
      {/* ========================================================================= */}
      {activeTab === 'compliance_calendar' && (() => {
        // Month navigation helpers
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];

        const handlePrevMonth = () => {
          if (complianceMonth === 0) {
            setComplianceMonth(11);
            setComplianceYear((y) => y - 1);
          } else {
            setComplianceMonth((m) => m - 1);
          }
        };

        const handleNextMonth = () => {
          if (complianceMonth === 11) {
            setComplianceMonth(0);
            setComplianceYear((y) => y + 1);
          } else {
            setComplianceMonth((m) => m + 1);
          }
        };

        const handleResetToCurrentMonth = () => {
          const now = new Date();
          setComplianceYear(now.getFullYear());
          setComplianceMonth(now.getMonth());
        };

        // Days in the selected month
        const daysInSelectedMonth = new Date(complianceYear, complianceMonth + 1, 0).getDate();
        const monthDays: { dayNum: number; dateStr: string; isWeekend: boolean; dayName: string }[] = [];
        const weekdayShort = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

        for (let d = 1; d <= daysInSelectedMonth; d++) {
          const dateObj = new Date(complianceYear, complianceMonth, d);
          const dateStr = `${complianceYear}-${String(complianceMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const dayOfWeek = dateObj.getDay();
          monthDays.push({
            dayNum: d,
            dateStr,
            isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
            dayName: weekdayShort[dayOfWeek],
          });
        }

        // Filter projects for compliance
        const activeComplianceProjects = complianceProjectFilter === 'all'
          ? pmProjects
          : pmProjects.filter((p) => String(p.id) === String(complianceProjectFilter));

        // Filter timesheets according to the selected project filter
        const complianceTimesheets = complianceProjectFilter === 'all'
          ? pmTimesheets
          : pmTimesheets.filter((t) => String(t.projectId) === String(complianceProjectFilter));

        // Get assigned employee users (active only)
        const assignedIds = new Set<string>();
        activeComplianceProjects.forEach((p) => {
          (p.assignedUserIds || []).forEach((uid) => assignedIds.add(String(uid)));
        });

        const complianceTeam = allUsers
          .filter((u) => u.role === 'employee' && assignedIds.has(String(u.id)) && (!u.status || u.status.toLowerCase() === 'active'))
          .filter((u) => {
            if (!complianceUserSearch.trim()) return true;
            const q = complianceUserSearch.toLowerCase();
            return (
              u.name.toLowerCase().includes(q) ||
              u.email.toLowerCase().includes(q) ||
              (u.department && u.department.toLowerCase().includes(q))
            );
          });

        // Compute metrics across the team for this month
        let totalMissingSubmissionsCount = 0;
        let totalCompletedSubmissionsCount = 0;
        let totalPartialSubmissionsCount = 0;
        let totalLeaveDaysCount = 0;

        complianceTeam.forEach((user) => {
          monthDays.forEach((day) => {
            const isHoliday = holidays.find((h) => h.date === day.dateStr);
            const isLeave = consolidatedLeaves.find(
              (l) =>
                String(l.userId) === String(user.id) &&
                (l.status || '').toLowerCase() === 'approved' &&
                l.startDate <= day.dateStr &&
                l.endDate >= day.dateStr
            );
            const daySheets = complianceTimesheets.filter(
              (t) => String(t.userId) === String(user.id) && t.date === day.dateStr
            );
            const dayTotal = daySheets.reduce(
              (s, t) => s + (Number(t.billableHours) || 0) + (Number(t.nonBillableHours) || 0),
              0
            );

            if (isLeave) {
              totalLeaveDaysCount++;
            } else if (day.dateStr < today && !day.isWeekend && !isHoliday && dayTotal === 0) {
              totalMissingSubmissionsCount++;
            } else if (dayTotal >= 8) {
              totalCompletedSubmissionsCount++;
            } else if (dayTotal > 0 && dayTotal < 8) {
              totalPartialSubmissionsCount++;
            }
          });
        });

        return (
          <div className="space-y-6">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Missing Timesheets - Refined Soft Rose */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1 hover:border-rose-300 transition-colors">
                <span className="text-[10px] uppercase font-black text-rose-700 tracking-wider flex items-center justify-between">
                  <span>Missing Submissions</span>
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                </span>
                <p className="text-2xl font-black text-slate-900">{totalMissingSubmissionsCount}</p>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-700">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  <span>Past working days with 0 hours logged</span>
                </div>
              </div>

              {/* Complete Submissions (>= 8h) */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                <span className="text-[10px] uppercase font-black text-emerald-700 tracking-wider flex items-center justify-between">
                  <span>Complete Days (&ge;8h)</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                </span>
                <p className="text-2xl font-black text-emerald-900">{totalCompletedSubmissionsCount}</p>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>Full workday submissions</span>
                </div>
              </div>

              {/* Partial Submissions (>0h & <8h) */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                <span className="text-[10px] uppercase font-black text-amber-700 tracking-wider flex items-center justify-between">
                  <span>Partial Days (&lt;8h)</span>
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                </span>
                <p className="text-2xl font-black text-amber-900">{totalPartialSubmissionsCount}</p>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <span>Logged but under 8 hours</span>
                </div>
              </div>

              {/* Approved Leaves */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                <span className="text-[10px] uppercase font-black text-purple-700 tracking-wider flex items-center justify-between">
                  <span>Approved Leaves</span>
                  <Calendar className="w-3.5 h-3.5 text-purple-600" />
                </span>
                <p className="text-2xl font-black text-purple-900">{totalLeaveDaysCount}</p>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-purple-700">
                  <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                  <span>Approved PTO / leave logs</span>
                </div>
              </div>
            </div>

            {/* Filter Bar & Month Navigator */}
            <div className="p-4 bg-white border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Month Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="px-3 py-1 bg-slate-100 rounded-lg border border-slate-200 text-center min-w-[140px]">
                  <span className="font-extrabold text-sm text-slate-900">
                    {monthNames[complianceMonth]} {complianceYear}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleResetToCurrentMonth}
                  className="px-2.5 py-1 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg cursor-pointer"
                >
                  Current Month
                </button>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Search employee */}
                <div className="relative min-w-[200px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search team member..."
                    value={complianceUserSearch}
                    onChange={(e) => setComplianceUserSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                {/* Project Filter */}
                <select
                  value={complianceProjectFilter}
                  onChange={(e) => setComplianceProjectFilter(e.target.value)}
                  className="py-1.5 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 cursor-pointer"
                >
                  <option value="all">All Managed Projects ({pmProjects.length})</option>
                  {pmProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code || 'No Code'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 px-4 py-2 bg-slate-50 border border-slate-200 text-[11px] font-bold">
              <span className="text-slate-500 uppercase tracking-wider text-[10px]">Legend:</span>
              <span className="flex items-center gap-1.5 text-rose-700 font-bold">
                <span className="w-3.5 h-3.5 rounded bg-rose-50 border border-rose-300" />
                <span>Missing (0h Logged - Past Work Day)</span>
              </span>
              <span className="flex items-center gap-1.5 text-emerald-800">
                <span className="w-3.5 h-3.5 rounded bg-emerald-100 border border-emerald-300" />
                <span>Complete (&ge;8h)</span>
              </span>
              <span className="flex items-center gap-1.5 text-amber-800">
                <span className="w-3.5 h-3.5 rounded bg-amber-100 border border-amber-300" />
                <span>Partial (&lt;8h)</span>
              </span>
              <span className="flex items-center gap-1.5 text-purple-800">
                <span className="w-3.5 h-3.5 rounded bg-purple-100 border border-purple-300" />
                <span>Approved Leave</span>
              </span>
              <span className="flex items-center gap-1.5 text-amber-900">
                <span className="w-3.5 h-3.5 rounded bg-amber-200 border border-amber-400" />
                <span>Holiday</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="w-3.5 h-3.5 rounded bg-slate-200 border border-slate-300" />
                <span>Weekend</span>
              </span>
            </div>

            {/* Compliance Matrix Table */}
            <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs font-sans">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                      <th className="sticky left-0 z-20 bg-slate-100 px-4 py-3 text-left font-bold text-slate-800 min-w-[220px] shadow-xs">
                        Team Member
                      </th>
                      <th className="px-3 py-3 text-center font-bold text-slate-700 min-w-[70px]">
                        Total Log
                      </th>
                      <th className="px-3 py-3 text-center font-black text-rose-700 min-w-[75px] bg-rose-50/50 border-l border-r border-rose-200">
                        Missing
                      </th>
                      {monthDays.map((d) => (
                        <th
                          key={d.dateStr}
                          className={`px-1.5 py-2 text-center min-w-[46px] border-l border-slate-200 ${
                            d.isWeekend
                              ? 'bg-slate-200/60 text-slate-400'
                              : d.dateStr === today
                              ? 'bg-sky-100 text-sky-800 font-black'
                              : 'text-slate-700 font-semibold'
                          }`}
                        >
                          <div className="text-[9px] uppercase leading-none">{d.dayName}</div>
                          <div className="text-[11px] font-extrabold mt-0.5">{d.dayNum}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {complianceTeam.length === 0 ? (
                      <tr>
                        <td colSpan={monthDays.length + 3} className="py-12 text-center text-slate-400">
                          No team members found for selected project and search criteria.
                        </td>
                      </tr>
                    ) : (
                      complianceTeam.map((user) => {
                        // User-specific monthly metrics for selected project scope
                        const userMonthSheets = complianceTimesheets.filter(
                          (t) =>
                            String(t.userId) === String(user.id) &&
                            t.date.startsWith(`${complianceYear}-${String(complianceMonth + 1).padStart(2, '0')}`)
                        );
                        const userMonthTotalHours = userMonthSheets.reduce(
                          (sum, t) => sum + (Number(t.billableHours) || 0) + (Number(t.nonBillableHours) || 0),
                          0
                        );

                        // Missing days for this user
                        let userMissingCount = 0;
                        monthDays.forEach((d) => {
                          const isHoliday = holidays.find((h) => h.date === d.dateStr);
                          const isLeave = consolidatedLeaves.find(
                            (l) =>
                              String(l.userId) === String(user.id) &&
                              (l.status || '').toLowerCase() === 'approved' &&
                              l.startDate <= d.dateStr &&
                              l.endDate >= d.dateStr
                          );
                          const dayTotal = userMonthSheets
                            .filter((t) => t.date === d.dateStr)
                            .reduce((s, t) => s + (Number(t.billableHours) || 0) + (Number(t.nonBillableHours) || 0), 0);
                          if (d.dateStr < today && !d.isWeekend && !isHoliday && !isLeave && dayTotal === 0) {
                            userMissingCount++;
                          }
                        });

                        return (
                          <tr key={user.id} className="hover:bg-slate-50/60 transition-colors">
                            {/* Sticky User Info Column */}
                            <td className="sticky left-0 z-10 bg-white px-4 py-2.5 shadow-xs border-r border-slate-200">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden ring-1 ring-slate-300">
                                  {user.avatar ? (
                                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                                  ) : (
                                    user.name.charAt(0)
                                  )}
                                </div>
                                <div className="truncate">
                                  <p className="font-bold text-slate-900 truncate leading-tight">{user.name}</p>
                                  <p className="text-[10px] text-slate-500 truncate">
                                    {user.title || 'Engineer'} • {user.department || 'Delivery'}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Total Logged Hours */}
                            <td className="px-3 py-2.5 text-center font-bold text-slate-900 border-r border-slate-200">
                              {userMonthTotalHours.toFixed(1)}h
                            </td>

                            {/* Missing Days Count Badge */}
                            <td className="px-3 py-2.5 text-center bg-rose-50/30 border-r border-slate-200">
                              {userMissingCount > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                                  <span>{userMissingCount} missing</span>
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-emerald-700">0</span>
                              )}
                            </td>

                            {/* Day Cells */}
                            {monthDays.map((d) => {
                              const isHoliday = holidays.find((h) => h.date === d.dateStr);
                              const isLeave = consolidatedLeaves.find(
                                (l) =>
                                  String(l.userId) === String(user.id) &&
                                  (l.status || '').toLowerCase() === 'approved' &&
                                  l.startDate <= d.dateStr &&
                                  l.endDate >= d.dateStr
                              );
                              const daySheets = userMonthSheets.filter((t) => t.date === d.dateStr);
                              const dayTotal = daySheets.reduce(
                                (s, t) => s + (Number(t.billableHours) || 0) + (Number(t.nonBillableHours) || 0),
                                0
                              );

                              const isPastWorkDay = d.dateStr < today && !d.isWeekend && !isHoliday && !isLeave;
                              const isMissing = isPastWorkDay && dayTotal === 0;

                              const handleClickCell = () => {
                                setComplianceDrilldown({
                                  user,
                                  dateStr: d.dateStr,
                                  entries: daySheets,
                                  isMissing,
                                  holidayName: isHoliday?.name,
                                  leaveReason: isLeave?.reason || isLeave?.type,
                                });
                                setCopiedReminder(false);
                              };

                              if (d.isWeekend) {
                                return (
                                  <td
                                    key={d.dateStr}
                                    className="px-1 py-2 text-center bg-slate-100/60 text-slate-300 text-[10px] border-l border-slate-200"
                                  >
                                    -
                                  </td>
                                );
                              }

                              if (isHoliday) {
                                return (
                                  <td
                                    key={d.dateStr}
                                    onClick={handleClickCell}
                                    title={`Holiday: ${isHoliday.name}`}
                                    className="px-1 py-1.5 text-center bg-amber-100 border-l border-amber-200 text-amber-900 font-bold text-[10px] cursor-pointer hover:opacity-80"
                                  >
                                    <span className="block truncate">HOL</span>
                                  </td>
                                );
                              }

                              if (isLeave) {
                                return (
                                  <td
                                    key={d.dateStr}
                                    onClick={handleClickCell}
                                    title={`Approved Leave: ${isLeave.type}`}
                                    className="px-1 py-1.5 text-center bg-purple-100 border-l border-purple-200 text-purple-900 font-bold text-[10px] cursor-pointer hover:opacity-80"
                                  >
                                    <span className="block truncate">LV</span>
                                  </td>
                                );
                              }

                              if (d.dateStr > today) {
                                return (
                                  <td
                                    key={d.dateStr}
                                    className="px-1 py-2 text-center text-slate-300 text-[10px] border-l border-slate-200"
                                  >
                                    •
                                  </td>
                                );
                              }

                              // Past working day: check if missing (Soft Rose Tint)
                              if (isMissing) {
                                return (
                                  <td
                                    key={d.dateStr}
                                    onClick={handleClickCell}
                                    title={`MISSING: ${user.name} has not submitted a timesheet for ${d.dateStr}`}
                                    className="px-1 py-1.5 text-center border-l border-rose-200/90 cursor-pointer transition-colors bg-rose-50/70 hover:bg-rose-100 text-rose-700 font-bold"
                                  >
                                    <span className="text-[10px] block leading-tight font-extrabold text-rose-700">
                                      0h
                                    </span>
                                  </td>
                                );
                              }

                              // Extract project info for submitted timesheets
                              const dayProjectNames = Array.from(new Set(daySheets.map((t) => t.projectName).filter(Boolean)));
                              const dayProjectLabels = Array.from(
                                new Set(
                                  daySheets.map((t) => {
                                    const proj = pmProjects.find((p) => String(p.id) === String(t.projectId));
                                    return proj?.code || t.projectName || proj?.name || 'Project';
                                  })
                                )
                              );
                              const projectSummaryTooltip = dayProjectNames.join(', ');
                              const projectBadge =
                                dayProjectLabels.length === 1
                                  ? (dayProjectLabels[0].length > 8 ? dayProjectLabels[0].slice(0, 7) + '…' : dayProjectLabels[0])
                                  : dayProjectLabels.length > 1
                                  ? `${dayProjectLabels.length} Projs`
                                  : '';

                              // Submitted hours
                              if (dayTotal >= 8) {
                                return (
                                  <td
                                    key={d.dateStr}
                                    onClick={handleClickCell}
                                    title={`${user.name}: ${dayTotal}h logged on ${d.dateStr}${projectSummaryTooltip ? `\nProject: ${projectSummaryTooltip}` : ''}`}
                                    className="px-1 py-1 text-center bg-emerald-50 hover:bg-emerald-100 border-l border-emerald-200 text-emerald-900 font-bold text-[10px] cursor-pointer transition-colors"
                                  >
                                    <div className="flex flex-col items-center justify-center leading-tight">
                                      <span className="font-extrabold text-[10px]">{dayTotal.toFixed(0)}h</span>
                                      {projectBadge && (
                                        <span
                                          className="text-[8px] font-bold px-1 py-0.5 rounded bg-emerald-200/80 text-emerald-950 mt-0.5 truncate max-w-[42px] tracking-tight block"
                                          title={projectSummaryTooltip}
                                        >
                                          {projectBadge}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                );
                              }

                              if (dayTotal > 0 && dayTotal < 8) {
                                return (
                                  <td
                                    key={d.dateStr}
                                    onClick={handleClickCell}
                                    title={`${user.name}: Partial ${dayTotal}h logged on ${d.dateStr}${projectSummaryTooltip ? `\nProject: ${projectSummaryTooltip}` : ''}`}
                                    className="px-1 py-1 text-center bg-amber-50 hover:bg-amber-100 border-l border-amber-200 text-amber-900 font-bold text-[10px] cursor-pointer transition-colors"
                                  >
                                    <div className="flex flex-col items-center justify-center leading-tight">
                                      <span className="font-extrabold text-[10px]">{dayTotal.toFixed(1)}h</span>
                                      {projectBadge && (
                                        <span
                                          className="text-[8px] font-bold px-1 py-0.5 rounded bg-amber-200/80 text-amber-950 mt-0.5 truncate max-w-[42px] tracking-tight block"
                                          title={projectSummaryTooltip}
                                        >
                                          {projectBadge}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                );
                              }

                              // Today with 0h logged so far
                              return (
                                <td
                                  key={d.dateStr}
                                  onClick={handleClickCell}
                                  title={`Today: Pending timesheet`}
                                  className="px-1 py-1.5 text-center bg-sky-50 hover:bg-sky-100 border-l border-sky-200 text-sky-800 font-bold text-[10px] cursor-pointer"
                                >
                                  Today
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cell Drilldown / Reminder Modal */}
            {complianceDrilldown && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                <div className="w-full max-w-2xl max-h-[85vh] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 font-sans">
                  {/* Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
                    <div className="flex items-center gap-2">
                      {complianceDrilldown.isMissing ? (
                        <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                          <AlertCircle className="w-5 h-5 text-rose-600" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        </div>
                      )}
                      <div>
                        <h3 className="text-base font-black text-slate-900">
                          {complianceDrilldown.isMissing ? 'Missing Timesheet Alert' : 'Timesheet Day Details'}
                        </h3>
                        <p className="text-xs text-slate-500">
                          Date: <span className="font-bold text-slate-800">{complianceDrilldown.dateStr}</span>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setComplianceDrilldown(null)}
                      className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Scrollable Modal Content */}
                  <div className="flex-1 overflow-y-auto space-y-4 pr-1 mt-4">
                    {/* Employee Details Card */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm shrink-0">
                          {complianceDrilldown.user.avatar ? (
                            <img
                              src={complianceDrilldown.user.avatar}
                              alt={complianceDrilldown.user.name}
                              className="w-full h-full object-cover rounded-full"
                            />
                          ) : (
                            complianceDrilldown.user.name.charAt(0)
                          )}
                        </div>
                        <div>
                          <p className="font-black text-slate-900 text-sm">{complianceDrilldown.user.name}</p>
                          <p className="text-xs text-slate-500">
                            {complianceDrilldown.user.email} • {complianceDrilldown.user.department || 'Delivery'}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
                          complianceDrilldown.isMissing
                            ? 'bg-rose-100 text-rose-800 border-rose-200'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        }`}
                      >
                        {complianceDrilldown.isMissing ? 'Submission Missing' : 'Logged'}
                      </span>
                    </div>

                    {/* Body Content */}
                    {complianceDrilldown.isMissing ? (
                      <div className="space-y-3 p-4 bg-rose-50/70 rounded-xl border border-rose-200 text-xs">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <p className="font-bold text-rose-950">
                              No timesheet logged for this past working day.
                            </p>
                            <p className="text-rose-800 text-[11px] leading-relaxed">
                              This date was a regular working day (not a weekend, official holiday, or approved leave), but 0 hours were logged.
                            </p>
                          </div>
                        </div>

                        {/* Reminder Copy Box */}
                        <div className="pt-2 border-t border-rose-200/80">
                          <label className="font-bold text-rose-900 text-[10px] uppercase tracking-wider block mb-1">
                            Quick Reminder Message
                          </label>
                          <div className="p-2.5 bg-white rounded-lg border border-rose-300 text-slate-800 font-mono text-[11px] select-all">
                            Hi {complianceDrilldown.user.name}, please submit your timesheet for {complianceDrilldown.dateStr} as soon as possible.
                          </div>
                          <div className="mt-2 flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                const msg = `Hi ${complianceDrilldown.user.name}, please submit your timesheet for ${complianceDrilldown.dateStr} as soon as possible.`;
                                navigator.clipboard.writeText(msg);
                                setCopiedReminder(true);
                                setTimeout(() => setCopiedReminder(false), 3000);
                              }}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
                            >
                              {copiedReminder ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Copied to Clipboard!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy Reminder</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : complianceDrilldown.entries.length === 0 ? (
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center text-slate-500 text-xs">
                        {complianceDrilldown.holidayName
                          ? `Official Holiday: ${complianceDrilldown.holidayName}`
                          : complianceDrilldown.leaveReason
                          ? `Approved Leave: ${complianceDrilldown.leaveReason}`
                          : 'No entries logged.'}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {complianceDrilldown.entries.map((entry) => (
                          <div key={entry.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900 text-sm">{entry.projectName}</span>
                              <span className="font-black text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 text-xs">
                                {(Number(entry.billableHours) || 0) + (Number(entry.nonBillableHours) || 0)}h Total
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-slate-600">
                              <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                {entry.billableHours || 0}h Billable
                              </span>
                              <span>•</span>
                              <span className="text-slate-600 font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                {entry.nonBillableHours || 0}h Non-Billable
                              </span>
                            </div>
                            {entry.billableDescription && (
                              <div className="space-y-1 mt-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Billable Summary</span>
                                <div className="text-[11px] text-slate-800 bg-white p-3 rounded-lg border border-slate-200 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
                                  {entry.billableDescription}
                                </div>
                              </div>
                            )}
                            {entry.nonBillableDescription && (
                              <div className="space-y-1 mt-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Non-Billable Notes</span>
                                <div className="text-[11px] text-slate-700 bg-white p-3 rounded-lg border border-slate-200 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
                                  {entry.nonBillableDescription}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Close button */}
                  <div className="pt-3 border-t border-slate-200 flex justify-end shrink-0 mt-3">
                    <button
                      type="button"
                      onClick={() => setComplianceDrilldown(null)}
                      className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Description Modal (from Review tab) */}
      {viewingDesc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Work Summary Details
              </h3>
              <button
                onClick={() => setViewingDesc(null)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer"
              >
                <span className="text-base font-bold">✕</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
                  Billable Summary / Client Scope
                </h4>
                <p className="text-sm text-slate-800 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 leading-relaxed whitespace-pre-wrap">
                  {viewingDesc.billable || 'None'}
                </p>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Non-Billable Summary / Internal Notes
                </h4>
                <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed whitespace-pre-wrap italic">
                  {viewingDesc.nonBillable || 'No non-billable notes'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
PMTimesheetReview.displayName = 'PMTimesheetReview';
