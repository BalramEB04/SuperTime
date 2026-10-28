import { Pagination } from '../common/Pagination';
import React, { useState, useEffect } from 'react';
import { User, TimesheetEntry, Project, LeaveRequest, HolidayItem } from '../../types';
import { useGetMyLeaveRequestsQuery, useGetWorkingCalendarQuery } from '../../store/api/dataApi';
import {
  Calendar as CalendarIcon,
  ListFilter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  Search,
  X,
  Trash2,
  Edit3,
  Plus,
  ChevronLeft,
  ChevronRight,
  Filter,
  Info,
  CalendarX,
  Zap,
  ArrowRight,
} from 'lucide-react';

interface TimesheetsHistoryProps {
  currentUser: User;
  timesheets: TimesheetEntry[];
  projects: Project[];
  holidays?: HolidayItem[];
  onDeleteTimesheet?: (id: string) => void;
  onUpdateTimesheet?: (entry: TimesheetEntry) => void;
  onEditRequest?: (entry: TimesheetEntry) => void;
  onSubmitTimesheets?: (entries: Omit<TimesheetEntry, 'id'>[]) => void;
  onNavigateToSubmit?: (date: string) => void;
  onNavigateToWeekendWork?: () => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

export const TimesheetsHistory: React.FC<TimesheetsHistoryProps> = ({
  currentUser,
  timesheets,
  projects,
  holidays = [],
  onDeleteTimesheet,
  onUpdateTimesheet,
  onEditRequest,
  onSubmitTimesheets,
  onNavigateToSubmit,
  onNavigateToWeekendWork,
  onShowToast,
}) => {
  const assignedProjects = (projects || []).filter((p) => p.assignedUserIds?.includes(currentUser.id));

  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [selectedDateModal, setSelectedDateModal] = useState<string | null>(null);
  const [selectedProjectFilter, setSelectedProjectFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [editNonBillableDesc, setEditNonBillableDesc] = useState<string>('');

  // Add for date modal states
  const [addingForDate, setAddingForDate] = useState<string | null>(null);
  const [addProjectId, setAddProjectId] = useState<string>('');
  const [addHours, setAddHours] = useState<number>(8);
  const [addBillableHours, setAddBillableHours] = useState<number>(8);
  const [addCategory, setAddCategory] = useState<TimesheetEntry['category']>('Development');
  const [addBillableDesc, setAddBillableDesc] = useState<string>('');
  const [addNonBillableDesc, setAddNonBillableDesc] = useState<string>('');

  // Month navigation for Calendar
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const userTimesheets = (timesheets || []).filter((t) => t.userId === currentUser.id);

  // Dynamic lock window from Admin Working Calendar configuration
  const { data: workingCalendarConfig } = useGetWorkingCalendarQuery();
  const lockHours = workingCalendarConfig?.timesheetLockHours ?? 24;
  const maxPastDays = Math.max(1, Math.ceil(lockHours / 24));
  const minDateObj = new Date();
  minDateObj.setDate(minDateObj.getDate() - maxPastDays);
  const minAllowedDate = minDateObj.toISOString().split('T')[0];

  // Fetch leave requests for leave status visualization
  const { data: leaveData } = useGetMyLeaveRequestsQuery(undefined as any);
  const myLeaves: LeaveRequest[] = leaveData || [];

  // Helper: get first active leave for a date
  const getLeaveForDate = (dateStr: string): LeaveRequest | undefined => {
    return myLeaves.find(
      (lr) =>
        lr.startDate <= dateStr &&
        lr.endDate >= dateStr &&
        (lr.status === 'approved' || lr.status === 'pending')
    );
  };

  // Helper: get holiday for a date
  const getHolidayForDate = (dateStr: string): HolidayItem | undefined => {
    return (holidays || []).find((h) => h.date === dateStr);
  };

  const formatLeaveBadgeLabel = (lr: LeaveRequest): string => {
    const dur = lr.leaveDurationType;
    if (!dur || dur === 'full_day') return 'On Leave';
    if (dur === 'half_day') {
      return lr.halfDayPeriod === 'first' ? 'Leave – 1st Half' : 'Leave – 2nd Half';
    }
    if (dur === 'partial_day' && lr.partialStartTime && lr.partialEndTime) {
      return `Leave ${lr.partialStartTime}–${lr.partialEndTime}`;
    }
    return 'On Leave';
  };

  // Calendar logic
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun

  const calendarDays = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const formattedDay = d < 10 ? `0${d}` : `${d}`;
    const formattedMonth = currentMonth + 1 < 10 ? `0${currentMonth + 1}` : `${currentMonth + 1}`;
    const dateStr = `${currentYear}-${formattedMonth}-${formattedDay}`;
    calendarDays.push(dateStr);
  }

  // Filtered List View items
  useEffect(() => { setCurrentPage(1); }, [searchQuery, selectedProjectFilter, selectedStatusFilter]);

  const filteredTimesheets = userTimesheets.filter((ts) => {
    if (selectedProjectFilter !== 'all' && ts.projectId !== selectedProjectFilter) return false;
    if (selectedStatusFilter !== 'all' && ts.status !== selectedStatusFilter) return false;
    if (
      searchQuery &&
      !ts.description.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !ts.projectName.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const paginatedTimesheets = filteredTimesheets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleExportCSV = () => {
    const headers = 'ID,Date,Project,Category,Hours,Billable,Status,BillableDescription,NonBillableDescription\n';
    const rows = filteredTimesheets
      .map(
        (t) =>
          `"${t.id}","${t.date}","${t.projectName}","${t.category}",${t.billableHours + t.nonBillableHours},${t.billableHours},"${t.status}","${(
            t.billableDescription || t.description
          ).replace(/"/g, '""')}","${(t.nonBillableDescription || '').replace(/"/g, '""')}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Timesheets_History_${currentUser.name.replace(' ', '_')}.csv`;
    a.click();
    onShowToast('Exported to CSV', 'Your timesheet history log was downloaded successfully.', 'success');
  };

  const modalEntries = selectedDateModal
    ? userTimesheets.filter((ts) => ts.date === selectedDateModal)
    : [];

  const handleStartEdit = (entry: TimesheetEntry) => {
    if (onEditRequest) {
      onEditRequest(entry);
    }
  };

  const handleStartAddForDate = (dateStr: string) => {
    const defaultProjId = assignedProjects[0]?.id || (projects && projects[0]?.id) || '';
    setAddingForDate(dateStr);
    setAddProjectId(defaultProjId);
    setAddHours(8);
    setAddBillableHours(8);
    setAddCategory('Development');
    setAddBillableDesc('');
    setAddNonBillableDesc('');
  };

  const handleSaveNewEntryForDate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingForDate || !addProjectId) return;

    const targetProject = (projects || []).find((p) => p.id === addProjectId);
    const projectName = targetProject ? targetProject.name : 'Project';

    const newEntry: Omit<TimesheetEntry, 'id'> = {
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      projectId: addProjectId,
      projectName: projectName,
      date: addingForDate,
      billableHours: Number(addBillableHours),
      nonBillableHours: Math.max(0, Number(addHours) - Number(addBillableHours)),
      category: addCategory,
      description: addBillableDesc || 'Daily work log',
      billableDescription: addBillableDesc,
      nonBillableDescription: addNonBillableDesc,
      status: 'submitted',
      submittedAt: new Date().toISOString(),
    };

    if (onSubmitTimesheets) {
      onSubmitTimesheets([newEntry]);
    }
    onShowToast('Timesheet Logged', `Added ${addHours}h for ${projectName} on ${addingForDate}`, 'success');
    setAddingForDate(null);
  };

  return (
    <div className="h-full flex-1 min-h-0 flex flex-col space-y-3 sm:space-y-3.5 text-slate-900 font-sans relative overflow-hidden">
      {/* Page Header (No Hero Banner) */}
      <div className="shrink-0 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 leading-tight">
            Timesheets History &amp; Audit
          </h1>
          <p className="text-xs text-slate-500">
            Click on any date or entry to view, edit, update, or log your daily task hours and track approval statuses.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Calendar vs List Toggle */}
          <div className="bg-white p-0.5 border border-slate-200 rounded-lg flex items-center gap-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                viewMode === 'calendar'
                  ? 'bg-slate-100 text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>Calendar View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-slate-100 text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>List View</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-2xs active:scale-95"
          >
            <Download className="w-3.5 h-3.5 text-slate-600 stroke-[2.2]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* CALENDAR VIEW */}
      {viewMode === 'calendar' && (
        <div className="flex-1 min-h-0 p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-sm shadow-xs flex flex-col space-y-2">
          <div className="shrink-0 flex flex-col md:flex-row md:items-center justify-between pb-2 border-b border-slate-100 gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-lg bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
              </button>
              <h3 className="text-sm sm:text-base font-black text-slate-950 min-w-[130px] text-center">
                {new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h3>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-lg bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px]">
              <span className="flex items-center gap-1 text-slate-600 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>8.0h+ Complete</span>
              </span>
              <span className="flex items-center gap-1 text-slate-600 font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Partial (&lt;8h)</span>
              </span>
              <span className="flex items-center gap-1 text-slate-600 font-semibold">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span>Missing (Fillable)</span>
              </span>
              <span className="flex items-center gap-1 text-red-600 font-semibold">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span>Expired</span>
              </span>
              <span className="flex items-center gap-1 text-cyan-700 font-semibold">
                <span className="w-2 h-2 rounded-full bg-cyan-500" />
                <span>Leave</span>
              </span>
              <span className="flex items-center gap-1 text-purple-700 font-semibold">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <span>Holiday</span>
              </span>
              <span className="flex items-center gap-1 text-slate-400">
                <span className="w-2 h-2 rounded-full bg-slate-300" />
                <span>Off / Weekend</span>
              </span>
            </div>
          </div>

          {/* Calendar Days of Week Header */}
          <div className="shrink-0 grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold text-slate-400 uppercase py-0.5">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div
            className="flex-1 min-h-0 grid grid-cols-7 gap-1.5"
            style={{
              gridTemplateRows: `repeat(${Math.ceil(calendarDays.length / 7)}, minmax(0, 1fr))`,
            }}
          >
            {calendarDays.map((dateStr, idx) => {
              if (!dateStr) {
                return <div key={`empty-${idx}`} className="h-full min-h-0 bg-slate-50/50 rounded-xl" />;
              }

              const dayEntries = userTimesheets.filter((t) => t.date === dateStr);
              const dayTotalHours = dayEntries.reduce((acc, curr) => acc + (curr.billableHours + curr.nonBillableHours), 0);
              const leaveForDay = getLeaveForDate(dateStr);
              const holidayForDay = getHolidayForDate(dateStr);
              const isFullDayLeave = leaveForDay && (!leaveForDay.leaveDurationType || leaveForDay.leaveDurationType === 'full_day');

              const dateObj = new Date(dateStr);
              const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
              const todayStr = new Date().toISOString().split('T')[0];
              const isFutureDate = dateStr > todayStr;
              const isWorkDay = !isWeekend && !holidayForDay && !isFullDayLeave;
              const isZeroHours = dayTotalHours === 0;

              // Valid window missing timesheet: past date within allowed cutoff window (still submittable)
              const isMissingTimesheet = !isFutureDate && dateStr < todayStr && dateStr >= minAllowedDate && isWorkDay && isZeroHours;

              // Expired timesheet: past date before allowed cutoff window (submission window expired)
              const isExpiredTimesheet = !isFutureDate && dateStr < minAllowedDate && isWorkDay && isZeroHours;

              return (
                <button
                  type="button"
                  key={dateStr}
                  onClick={() => {
                    if (dayEntries.length === 0) {
                      if (isWeekend) {
                        onShowToast('Weekend Date', 'Weekend work requires prior PM approval. Please submit a request in the Weekend Work tab.', 'info');
                        setSelectedDateModal(dateStr);
                        return;
                      }
                      if (holidayForDay) {
                        onShowToast('Company Holiday', `This date is a company holiday (${holidayForDay.name}). Timesheet logging is disabled.`, 'info');
                        setSelectedDateModal(dateStr);
                        return;
                      }
                      if (isExpiredTimesheet || dateStr < minAllowedDate) {
                        onShowToast('Expired Timesheet', `The submission window for ${dateStr} has expired.`, 'error');
                        setSelectedDateModal(dateStr);
                        return;
                      }
                      if (onNavigateToSubmit) {
                        onNavigateToSubmit(dateStr);
                        return;
                      }
                    }
                    setSelectedDateModal(dateStr);
                  }}
                  disabled={false}
                  className={`h-full min-h-0 p-1.5 sm:p-2 rounded-xl border text-left flex flex-col justify-between transition-all overflow-hidden ${
                    isFutureDate
                      ? holidayForDay
                        ? 'bg-purple-50/70 border-purple-200 hover:border-purple-400 hover:scale-[1.01] hover:shadow-sm cursor-pointer'
                        : 'bg-white border-slate-100 hover:border-primary/40 hover:scale-[1.01] cursor-pointer'
                      : isFullDayLeave
                        ? 'bg-cyan-50/70 border-cyan-200 hover:border-cyan-400 hover:scale-[1.01] hover:shadow-sm cursor-pointer'
                        : holidayForDay
                          ? 'bg-purple-50/70 border-purple-200 hover:border-purple-400 hover:scale-[1.01] hover:shadow-sm cursor-pointer'
                          : isWeekend
                            ? 'bg-slate-50 border-slate-200/60 opacity-60 hover:scale-[1.01] hover:shadow-sm cursor-pointer'
                            : dayTotalHours >= 8
                              ? 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-400 hover:scale-[1.01] hover:shadow-sm cursor-pointer'
                              : dayTotalHours > 0
                                ? 'bg-amber-50/50 border-amber-200 hover:border-amber-400 hover:scale-[1.01] hover:shadow-sm cursor-pointer'
                                : leaveForDay
                                  ? 'bg-cyan-50/60 border-cyan-200 hover:border-cyan-400 hover:scale-[1.01] hover:shadow-sm cursor-pointer'
                                  : isExpiredTimesheet
                                    ? 'bg-red-50/70 border-red-300 text-red-900 hover:border-red-500 hover:bg-red-100 hover:scale-[1.01] hover:shadow-sm cursor-pointer'
                                    : isMissingTimesheet
                                      ? 'bg-slate-50/80 border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-100/90 hover:scale-[1.01] hover:shadow-xs cursor-pointer'
                                      : 'bg-white border-slate-200 hover:border-blue-400 hover:scale-[1.01] hover:shadow-sm cursor-pointer'
                  }`}
                >
                  <div className="flex items-center justify-between w-full shrink-0">
                    <span className={`text-[11px] font-extrabold ${isExpiredTimesheet ? 'text-red-950 font-black' : isMissingTimesheet ? 'text-slate-700 font-bold' : 'text-slate-900'}`}>
                      {dateStr.split('-')[2]}
                    </span>
                    {dayTotalHours > 0 && (
                      <span
                        className={`text-[9.5px] font-extrabold px-1.5 py-0.2 rounded-full ${
                          dayTotalHours >= 8
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {dayTotalHours}h
                      </span>
                    )}
                    {isExpiredTimesheet && (
                      <span className="text-[8.5px] font-black px-1.5 py-0.2 rounded-full bg-red-100 text-red-700 border border-red-200">
                        Expired
                      </span>
                    )}
                    {isMissingTimesheet && (
                      <span className="text-[8.5px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 border border-slate-300">
                        Missing
                      </span>
                    )}
                    {leaveForDay && dayTotalHours === 0 && (
                      <CalendarX className="w-3 h-3 text-cyan-600 shrink-0" />
                    )}
                  </div>

                  <div className="min-h-0 overflow-hidden space-y-0.5 mt-0.5">
                    {/* Leave badge */}
                    {leaveForDay && (
                      <div className="text-[8.5px] truncate px-1 py-0.2 rounded bg-cyan-100 text-cyan-800 font-extrabold border border-cyan-200 flex items-center gap-1">
                        <CalendarX className="w-2 h-2 shrink-0" />
                        <span className="truncate">{formatLeaveBadgeLabel(leaveForDay)}</span>
                      </div>
                    )}
                    {/* Holiday badge */}
                    {holidayForDay && !leaveForDay && (
                      <div className="text-[8.5px] truncate px-1 py-0.2 rounded bg-purple-100 text-purple-800 font-extrabold border border-purple-200 flex items-center gap-1">
                        <span>🎉</span>
                        <span className="truncate">{holidayForDay.name}</span>
                      </div>
                    )}
                    {dayEntries.slice(0, leaveForDay ? 1 : 2).map((e) => (
                      <div
                        key={e.id}
                        className="text-[9px] truncate px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200/60 flex items-center justify-between"
                      >
                        <span className="truncate">{e.projectName}</span>
                        <span className="font-extrabold shrink-0 ml-1">{e.billableHours + e.nonBillableHours}h</span>
                      </div>
                    ))}
                    {dayEntries.length > (leaveForDay ? 1 : 2) && (
                      <div className="text-[8.5px] text-slate-500 font-bold px-0.5">
                        +{dayEntries.length - (leaveForDay ? 1 : 2)} more
                      </div>
                    )}
                    {dayEntries.length === 0 && !leaveForDay && !holidayForDay && !isWeekend && !isFutureDate && (
                      isExpiredTimesheet ? (
                        <span className="text-[9px] text-red-600 font-bold flex items-center gap-0.5">
                          <AlertCircle className="w-2.5 h-2.5 text-red-500 shrink-0" />
                          <span>Expired</span>
                        </span>
                      ) : isMissingTimesheet ? (
                        <span className="text-[9px] text-slate-500 font-semibold flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                          <span>To Fill</span>
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-400 italic">Click to log</span>
                      )
                    )}
                    {dayEntries.length === 0 && holidayForDay && !leaveForDay && !isFutureDate && (
                      <span className="text-[9px] text-orange-400 italic">Holiday</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        <div className="flex-1 min-h-0 p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-sm shadow-xs flex flex-col space-y-2.5">
          {/* Filter Toolbar */}
          <div className="shrink-0 grid grid-cols-1 md:grid-cols-4 gap-2.5 items-center">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search descriptions..."
                className="w-full bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-200 text-xs text-slate-900 rounded-lg pl-9 pr-3 py-1.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none font-medium transition-colors"
              />
            </div>

            <select
              value={selectedProjectFilter}
              onChange={(e) => setSelectedProjectFilter(e.target.value)}
              className="bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-200 text-xs text-slate-900 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none font-bold transition-colors cursor-pointer"
            >
              <option value="all">All Projects</option>
              {assignedProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-200 text-xs text-slate-900 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none font-bold transition-colors cursor-pointer"
            >
              <option value="submitted">Submitted</option>
            </select>

            <div className="text-right flex items-center justify-end text-xs text-slate-500 font-extrabold">
              Total Found: <span className="ml-1 text-slate-950 font-black">{filteredTimesheets.length} entries</span>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-xs">
                <tr className="border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[9.5px] font-black">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Project</th>
                  <th className="py-2.5 px-3">Billable Work</th>
                  <th className="py-2.5 px-3">Non-Billable Work</th>
                  <th className="py-2.5 px-3 text-right">Hours (Billable)</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Leave request rows */}
                {myLeaves
                  .filter((lr) => lr.status === 'approved' || lr.status === 'pending')
                  .map((lr) => (
                    <tr key={`leave-${lr.id}`} className="bg-rose-50/50 hover:bg-rose-50/80 transition-colors">
                      <td className="py-3 px-3 font-extrabold text-rose-900 whitespace-nowrap">
                        {lr.startDate === lr.endDate ? lr.startDate : `${lr.startDate} – ${lr.endDate}`}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <CalendarX className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span className="font-black text-rose-700">{lr.type}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-rose-700 max-w-xs font-semibold">
                        {formatLeaveBadgeLabel(lr)}
                      </td>
                      <td className="py-3 px-3 text-slate-500 max-w-xs italic text-[11px]">
                        {lr.reason || '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-rose-800 whitespace-nowrap">
                        {lr.leaveDurationType === 'full_day' ? '8h (full)' : lr.leaveDurationType === 'half_day' ? '4h (half)' : 'Partial'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold capitalize border border-rose-200/80 bg-gradient-to-r from-rose-50 to-pink-50 text-rose-700">
                          {lr.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-slate-400 text-[10px] italic">—</td>
                    </tr>
                  ))}
                {paginatedTimesheets.map((ts) => (
                  <tr key={ts.id} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="py-3 px-3 font-extrabold text-slate-900 whitespace-nowrap">{ts.date}</td>
                    <td className="py-3 px-3">
                      <span className="w-fit rounded-full border border-indigo-200/60 bg-gradient-to-r from-indigo-50 to-violet-50 px-2.5 py-0.5 text-[9px] font-extrabold text-indigo-700 inline-block">
                        {ts.projectName}
                      </span>
                      {ts.milestoneName && (
                        <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                          🎯 {ts.milestoneName}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-800 max-w-xs font-medium">
                      {ts.billableDescription || ts.description}
                    </td>
                    <td className="py-3 px-3 text-slate-500 max-w-xs italic text-[11px]">
                      {ts.nonBillableDescription || 'N/A'}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-slate-900 whitespace-nowrap">
                      {ts.billableHours + ts.nonBillableHours}h <span className="ml-1 rounded-md border border-emerald-200/50 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">({ts.billableHours}h billable)</span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold capitalize border border-emerald-200/60 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700"
                      >
                        {ts.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(ts)}
                          className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-colors cursor-pointer"
                          title="Edit timesheet entry"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteTimesheet(ts.id);
                            onShowToast('Deleted Entry', 'Timesheet entry removed.', 'info');
                          }}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                          title="Delete log"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="shrink-0 pt-2 border-t border-slate-100">
            <Pagination
              currentPage={currentPage}
              totalItems={filteredTimesheets.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
              pageSizeOptions={[10, 20, 50]}
            />
          </div>
        </div>
      )}

      {/* DAY LOG DETAILS MODAL (When Date is Clicked in Calendar) */}
      {selectedDateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {modalEntries.length === 0 && selectedDateModal && selectedDateModal < minAllowedDate
                    ? `Expired Timesheet • ${selectedDateModal}`
                    : `Timesheet Logs • ${selectedDateModal}`}
                </h3>
                <p className="text-xs text-slate-500">
                  Total Logged:{' '}
                  <span className="font-extrabold text-blue-600">
                    {modalEntries.reduce((sum, e) => sum + (e.billableHours + e.nonBillableHours), 0)} Hours
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDateModal(null)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {modalEntries.length === 0 ? (() => {
                const dateObj = selectedDateModal ? new Date(selectedDateModal + 'T00:00:00') : null;
                const isSelectedWeekend = dateObj ? (dateObj.getDay() === 0 || dateObj.getDay() === 6) : false;
                const selectedHoliday = selectedDateModal ? getHolidayForDate(selectedDateModal) : null;

                if (isSelectedWeekend) {
                  return (
                    <div className="text-center py-8 text-slate-500 text-xs space-y-4 bg-amber-50/60 rounded-2xl border border-amber-200 p-6 shadow-xs">
                      <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                        <CalendarX className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-extrabold text-sm text-amber-950">Weekend Date ({selectedDateModal})</p>
                        <p className="text-amber-800 text-xs max-w-xs mx-auto leading-relaxed">
                          Timesheets cannot be submitted directly for weekends. Weekend work requires prior PM approval through a Weekend Work Request.
                        </p>
                      </div>
                      {onNavigateToWeekendWork && (
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDateModal(null);
                              onNavigateToWeekendWork();
                            }}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-md shadow-amber-600/20 transition-all hover:scale-[1.02] cursor-pointer"
                          >
                            <Zap className="w-4 h-4" />
                            <span>Request Weekend Work</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                }

                if (selectedHoliday) {
                  return (
                    <div className="text-center py-8 text-slate-500 text-xs space-y-3 bg-orange-50/50 rounded-xl border border-orange-200/60 p-4">
                      <div className="w-10 h-10 mx-auto rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold">
                        <CalendarX className="w-5 h-5" />
                      </div>
                      <p className="font-extrabold text-orange-900">Company Holiday ({selectedHoliday.name})</p>
                      <p className="text-orange-800 text-[11px] max-w-xs mx-auto">
                        Timesheet logging is disabled on official company holidays.
                      </p>
                    </div>
                  );
                }

                const isPastLock = selectedDateModal && selectedDateModal < minAllowedDate;
                if (isPastLock) {
                  return (
                    <div className="text-center py-6 text-slate-600 text-xs space-y-3 bg-red-50/80 rounded-2xl border border-red-200 p-5 shadow-xs">
                      <div className="w-12 h-12 mx-auto rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold">
                        <AlertCircle className="w-6 h-6 text-red-600" />
                      </div>
                      <div className="space-y-1.5">
                        <span className="inline-block text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                          Expired Timesheet
                        </span>
                        <p className="font-extrabold text-sm text-red-950">
                          Expired Timesheet ({selectedDateModal})
                        </p>
                        <p className="text-red-800 text-xs max-w-sm mx-auto leading-relaxed">
                          Timesheet submission for this date has expired. Submissions are only permitted within the {lockHours}-hour submission window ({minAllowedDate} to present).
                        </p>
                        <p className="text-[11px] text-red-700/80 italic">
                          Please contact your Project Manager or Admin to request an unlock or retroactive approval.
                        </p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="text-center py-8 text-slate-500 text-xs space-y-3">
                    <p>No hours logged for this date.</p>
                    <button
                      type="button"
                      onClick={() => {
                        const dateToLog = selectedDateModal;
                        setSelectedDateModal(null);
                        if (dateToLog) {
                          if (onNavigateToSubmit) {
                            onNavigateToSubmit(dateToLog);
                          } else {
                            handleStartAddForDate(dateToLog);
                          }
                        }
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 shadow-xs cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Log Hours for {selectedDateModal}</span>
                    </button>
                  </div>
                );
              })() : (
                modalEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-blue-600">{entry.projectName}</span>
                        {entry.milestoneName && (
                          <div className="text-[10px] font-semibold text-indigo-700">
                            🎯 Milestone: {entry.milestoneName}
                          </div>
                        )}
                      </div>
                      <span className="font-extrabold text-slate-900">
                        {entry.billableHours + entry.nonBillableHours}h ({entry.billableHours}h billable)
                      </span>
                    </div>

                    <div className="space-y-1 text-[11px]">
                      <p className="text-slate-800 font-semibold">
                        <span className="text-emerald-700 font-bold">Billable Work: </span>
                        {entry.billableDescription || entry.description}
                      </p>
                      {entry.nonBillableDescription && (
                        <p className="text-slate-500 italic">
                          <span className="font-bold text-slate-600">Non-Billable: </span>
                          {entry.nonBillableDescription}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                      <span className="text-[10px] text-slate-600 font-bold bg-slate-200 px-2 py-0.5 rounded">
                        {entry.category}
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDateModal(null);
                            handleStartEdit(entry);
                          }}
                          className="text-[11px] text-blue-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit & Update</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteTimesheet(entry.id);
                            onShowToast('Removed', 'Log entry deleted.', 'info');
                          }}
                          className="text-[11px] text-rose-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              {modalEntries.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const dateToLog = selectedDateModal;
                    setSelectedDateModal(null);
                    if (dateToLog) {
                      if (onNavigateToSubmit) {
                        onNavigateToSubmit(dateToLog);
                      } else {
                        handleStartAddForDate(dateToLog);
                      }
                    }
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Another Entry</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedDateModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs cursor-pointer ml-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}



      {/* ADD TIMESHEET FOR CLICKED DATE MODAL */}
      {addingForDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-600" />
                  <span>Log Hours • {addingForDate}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Add a new timesheet entry for this specific date.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddingForDate(null)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewEntryForDate} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Select Project</label>
                <select
                  value={addProjectId}
                  onChange={(e) => setAddProjectId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                >
                  <option value="">-- Choose Project --</option>
                  {assignedProjects.filter((p) => p.isActive !== false && p.is_active !== false).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code || `PRJ-${p.id}`})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-1">
                  <label className="block text-slate-700 font-bold mb-1">Category</label>
                  <select
                    value={addCategory}
                    onChange={(e) => setAddCategory(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Development">Development</option>
                    <option value="Design">Design</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Code Review">Code Review</option>
                    <option value="Testing">Testing</option>
                    <option value="Documentation">Documentation</option>
                    <option value="DevOps">DevOps</option>
                  </select>
                </div>

                <div className="col-span-1">
                  <label className="block text-slate-700 font-bold mb-1">Total Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="24"
                    placeholder="0"
                    value={addHours === 0 ? '' : addHours}
                    onChange={(e) => setAddHours(e.target.value === '' ? 0 : Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-slate-700 font-bold mb-1">Billable (h)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max={addHours}
                    placeholder="0"
                    value={addBillableHours === 0 ? '' : addBillableHours}
                    onChange={(e) => setAddBillableHours(e.target.value === '' ? 0 : Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-slate-700 font-bold mb-1">Non-Bill (h)</label>
                  <input
                    type="number"
                    value={Math.max(0, addHours - addBillableHours)}
                    className="w-full bg-slate-100 border border-slate-200 text-slate-500 rounded-xl px-3 py-2 font-bold cursor-not-allowed"
                    readOnly
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Billable Work Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={addBillableDesc}
                  onChange={(e) => setAddBillableDesc(e.target.value)}
                  placeholder="Describe billable deliverables completed..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Non-Billable Work Description (Optional)
                </label>
                <input
                  type="text"
                  value={addNonBillableDesc}
                  onChange={(e) => setAddNonBillableDesc(e.target.value)}
                  placeholder="e.g. Team standup, documentation..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddingForDate(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-white bg-blue-600 hover:bg-blue-700 font-extrabold rounded-xl shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


