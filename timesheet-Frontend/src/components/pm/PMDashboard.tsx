import React, { useState } from 'react';
import { Project, User, TimesheetEntry, WeekendWorkRequest } from '../../types';
import {
  Briefcase,
  Clock,
  Users,
  CheckSquare,
  Moon,
  ChevronRight,
  ArrowUpRight,
  Calendar,
  Layers,
  Sparkles,
  X,
} from 'lucide-react';
import { UpcomingLeavesWidget } from '../shared/UpcomingLeavesWidget';
import { useGetUpcomingLeavesQuery } from '../../store/api/dataApi';

interface PMDashboardProps {
  currentUser: User;
  projects: Project[];
  allUsers: User[];
  timesheets: TimesheetEntry[];
  weekendRequests: WeekendWorkRequest[];
  onNavigateTab: (tab: string) => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

export const PMDashboard: React.FC<PMDashboardProps> = React.memo(({
  currentUser,
  projects = [],
  allUsers = [],
  timesheets = [],
  weekendRequests = [],
  onNavigateTab,
  onShowToast,
}) => {
  const { data: upcomingLeaves = [] } = useGetUpcomingLeavesQuery();
  const [showLeavesModal, setShowLeavesModal] = useState(false);

  const {
    pmProjects,
    pmProjectIds,
    totalTeamMembersCount,
    pendingWeekendRequests,
    pmTimesheets,
    totalLoggedHours,
    totalBillableHours,
    todayLoggedHours,
    thisWeekBillableHours,
    thisWeekNonBillableHours,
    thisWeekTotalHours,
    thisWeekBillableRatio,
    teamMembersWithMissing,
    avgUtilization,
    recentTimesheets,
  } = React.useMemo(() => {
    const safeProjects = projects || [];
    const safeTimesheets = timesheets || [];
    const safeWeekendRequests = weekendRequests || [];
    const safeAllUsers = allUsers || [];

    // PM's projects
    const pProjects = safeProjects.filter((p) => {
      if (currentUser?.role === 'admin') return true;
      if (p.project_manager_id && currentUser?.id && String(p.project_manager_id) === String(currentUser.id)) return true;
      if (p.pmName && currentUser?.name && p.pmName.trim().toLowerCase() === currentUser.name.trim().toLowerCase()) return true;
      return false;
    });

    const pProjectIds = pProjects.map((p) => String(p.id));

    // All team members assigned to PM's projects
    const assignedTeamUserIds = Array.from(new Set(pProjects.flatMap((p) => (p.assignedUserIds || []).map(String))));
    const teamCount = assignedTeamUserIds.filter(id => {
      const user = safeAllUsers.find(u => String(u.id) === String(id));
      return user?.role === 'employee';
    }).length;

    // Pending Weekend Work Requests for PM's projects
    const pendingRequests = safeWeekendRequests.filter((w) => {
      if (w.status !== 'pending') return false;
      if (currentUser?.role === 'admin') return true;
      return pProjectIds.includes(String(w.projectId));
    });

    // Timesheets for PM's projects (string-safe project matching)
    const pTimesheets = safeTimesheets.filter((t) => {
      if (currentUser?.role === 'admin') return true;
      return pProjectIds.includes(String(t.projectId));
    });

    // Calculations for stats
    const totLogged = pProjects.reduce((sum, p) => sum + p.loggedHours, 0);
    const totBillable = pProjects.reduce((sum, p) => sum + p.billableHours, 0);

    // Today's date YYYY-MM-DD
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const todaySheets = pTimesheets.filter((t) => t.date === todayStr);
    const todayLogged = todaySheets.reduce((sum, t) => sum + ((t.billableHours || 0) + (t.nonBillableHours || 0)), 0);

    // Current Week (Monday to Sunday) date range
    const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday...
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const mondayStr = monday.toISOString().split('T')[0];
    const sundayStr = sunday.toISOString().split('T')[0];

    // Rolling 7-day date range (last 7 days)
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 6);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    // 1. Current calendar week (Monday to Sunday)
    const thisCalendarWeekSheets = pTimesheets.filter((t) => t.date >= mondayStr && t.date <= sundayStr);
    const calBillable = thisCalendarWeekSheets.reduce((sum, t) => sum + (Number(t.billableHours) || 0), 0);
    const calNonBillable = thisCalendarWeekSheets.reduce((sum, t) => sum + (Number(t.nonBillableHours) || 0), 0);

    // 2. Rolling 7 days
    const rollingWeekSheets = pTimesheets.filter((t) => t.date >= sevenDaysAgoStr && t.date <= todayStr);
    const rollingBillable = rollingWeekSheets.reduce((sum, t) => sum + (Number(t.billableHours) || 0), 0);
    const rollingNonBillable = rollingWeekSheets.reduce((sum, t) => sum + (Number(t.nonBillableHours) || 0), 0);

    // 3. All logged timesheets for PM's projects (matches Review log)
    const allBillable = pTimesheets.reduce((sum, t) => sum + (Number(t.billableHours) || 0), 0);
    const allNonBillable = pTimesheets.reduce((sum, t) => sum + (Number(t.nonBillableHours) || 0), 0);

    let weekBillable = calBillable;
    let weekNonBillable = calNonBillable;

    // If current calendar week has no logs yet (e.g. Monday morning), show rolling 7 days or total logged
    if (weekBillable === 0 && weekNonBillable === 0) {
      if (rollingBillable > 0 || rollingNonBillable > 0) {
        weekBillable = rollingBillable;
        weekNonBillable = rollingNonBillable;
      } else if (allBillable > 0 || allNonBillable > 0) {
        weekBillable = allBillable;
        weekNonBillable = allNonBillable;
      }
    }

    const weekTotalHours = weekBillable + weekNonBillable;
    const weekBillableRatio = weekTotalHours > 0 ? Math.round((weekBillable / weekTotalHours) * 100) : 0;

    // Past working days in current week (Monday up to yesterday)
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const pastWorkingDaysThisWeek: string[] = [];
    const tempDate = new Date(monday);
    while (tempDate <= yesterday && tempDate <= now) {
      const dDay = tempDate.getDay();
      if (dDay !== 0 && dDay !== 6) {
        pastWorkingDaysThisWeek.push(tempDate.toISOString().split('T')[0]);
      }
      tempDate.setDate(tempDate.getDate() + 1);
    }

    // Identify assigned team members with missing submissions for past working days this week
    const teamMembersWithMissing: { id: string; name: string; missingCount: number }[] = [];
    if (pastWorkingDaysThisWeek.length > 0) {
      const assignedUserObjs = safeAllUsers.filter((u) => u.role === 'employee' && assignedTeamUserIds.includes(u.id));
      for (const user of assignedUserObjs) {
        const userSheets = pTimesheets.filter((t) => String(t.userId) === String(user.id));
        let userMissing = 0;
        for (const dStr of pastWorkingDaysThisWeek) {
          const dayTotal = userSheets
            .filter((t) => t.date === dStr)
            .reduce((s, t) => s + (Number(t.billableHours) || 0) + (Number(t.nonBillableHours) || 0), 0);
          if (dayTotal === 0) {
            userMissing++;
          }
        }
        if (userMissing > 0) {
          teamMembersWithMissing.push({
            id: user.id,
            name: user.name,
            missingCount: userMissing,
          });
        }
      }
    }

    // Average Team Utilization
    const totalLoggedForUtil = pTimesheets.reduce((sum, t) => sum + ((t.billableHours || 0) + (t.nonBillableHours || 0)), 0);
    const totalBillableForUtil = pTimesheets.reduce((sum, t) => sum + (t.billableHours || 0), 0);
    const utilization = totalLoggedForUtil > 0
      ? Math.min(100, Math.round((totalBillableForUtil / totalLoggedForUtil) * 100))
      : 0;

    // Recent 5 timesheet submissions
    const recent = [...pTimesheets].reverse().slice(0, 5);

    return {
      pmProjects: pProjects,
      pmProjectIds: pProjectIds,
      totalTeamMembersCount: teamCount,
      pendingWeekendRequests: pendingRequests,
      pmTimesheets: pTimesheets,
      totalLoggedHours: totLogged,
      totalBillableHours: totBillable,
      todayLoggedHours: todayLogged,
      thisWeekBillableHours: weekBillable,
      thisWeekNonBillableHours: weekNonBillable,
      thisWeekTotalHours: weekTotalHours,
      thisWeekBillableRatio: weekBillableRatio,
      teamMembersWithMissing,
      avgUtilization: utilization,
      recentTimesheets: recent,
    };
  }, [projects, timesheets, weekendRequests, allUsers, currentUser]);

  return (
    <div className="space-y-6 text-slate-900 font-sans pb-8">
      {/* Header Banner */}
      <div className="p-5 bg-white border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-sky-600" />
            <span>Project Manager Portal</span>
          </h1>
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
            Welcome back, <span className="font-bold text-slate-800">{currentUser.name}</span>. Track active sprint delivery, review employee timesheet logs, manage team allocations, and approve weekend overtime requests.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigateTab('pm_resource_allocation')}
            className="flex items-center gap-2 px-3.5 py-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-all cursor-pointer"
          >
            <Users className="w-4 h-4 text-slate-600" />
            <span>Resource Allocation</span>
          </button>
          <button
            onClick={() => onNavigateTab('pm_timesheet_review')}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <CheckSquare className="w-4 h-4" />
            <span>Review Timesheets</span>
          </button>
        </div>
      </div>

      {/* 5-Card KPI Grid with Combined Week Billable / Non-Billable Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Active Projects */}
        <div
          onClick={() => onNavigateTab('pm_my_projects')}
          className="p-4 bg-white border border-slate-200 space-y-1.5 hover:border-sky-400 transition-all cursor-pointer group shadow-2xs"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Active Projects
            </span>
            <Briefcase className="w-4 h-4 text-sky-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{pmProjects.length}</div>
          <p className="text-[11px] text-slate-500 truncate">Managed projects</p>
        </div>

        {/* Total Team Members */}
        <div
          onClick={() => onNavigateTab('pm_resource_allocation')}
          className="p-4 bg-white border border-slate-200 space-y-1.5 hover:border-sky-400 transition-all cursor-pointer group shadow-2xs"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Team Members
            </span>
            <Users className="w-4 h-4 text-sky-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{totalTeamMembersCount}</div>
          <p className="text-[11px] text-slate-500 truncate">Assigned resources</p>
        </div>

        {/* Combined Weekly Billable / Non-Billable Hours Card */}
        <div
          onClick={() => onNavigateTab('pm_timesheet_review')}
          className="p-4 bg-white border border-slate-200 space-y-1.5 hover:border-emerald-400 transition-all cursor-pointer group shadow-2xs"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
              Week Billable / Non-Billable
            </span>
            <Clock className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-emerald-800" title="Billable Hours">
              {thisWeekBillableHours.toFixed(1)}h
            </span>
            <span className="text-slate-400 font-bold text-base">/</span>
            <span className="text-xl font-bold text-sky-800" title="Non-Billable Hours">
              {thisWeekNonBillableHours.toFixed(1)}h
            </span>
          </div>
          <p className="text-[11px] text-slate-500 truncate flex items-center gap-1.5 font-medium">
            <span className="text-emerald-700 font-bold">Client ({thisWeekBillableHours.toFixed(1)}h)</span>
            <span className="text-slate-300">•</span>
            <span className="text-sky-700 font-bold">Internal ({thisWeekNonBillableHours.toFixed(1)}h)</span>
          </p>
        </div>

        {/* Pending Weekend Requests */}
        <div
          onClick={() => onNavigateTab('pm_weekend_work')}
          className="p-4 bg-white border border-slate-200 space-y-1.5 hover:border-amber-400 transition-all cursor-pointer group shadow-2xs"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
              Weekend OT
            </span>
            <Moon className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-amber-600">{pendingWeekendRequests.length}</div>
          <p className="text-[11px] text-amber-700 font-semibold truncate">Pending approvals</p>
        </div>

        {/* Team Leaves */}
        <div
          onClick={() => setShowLeavesModal(true)}
          className="p-4 bg-white border border-slate-200 space-y-1.5 hover:border-sky-400 transition-all group cursor-pointer shadow-2xs"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Team Leaves
            </span>
            <Calendar className="w-4 h-4 text-sky-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{upcomingLeaves?.length || 0}</div>
          <p className="text-[11px] text-slate-500 truncate">Upcoming / active</p>
        </div>
      </div>

      {/* Main Grid: Projects Overview & Recent Timesheet Submissions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Project Progress Overview */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 bg-white border border-slate-200 space-y-5 text-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-sky-600" />
                  <span>Managed Projects &amp; Resource Status</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Track sprint progress, allocated tools, and billable hour utilization per project.
                </p>
              </div>

              <button
                onClick={() => onNavigateTab('pm_my_projects')}
                className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer"
              >
                <span>View All Projects</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pmProjects.map((proj) => {
                const assignedCount = (proj.assignedUserIds || []).length;
                const toolsCount = (proj.tools || []).length;

                return (
                  <div
                    key={proj.id}
                    className="p-5 rounded-2xl bg-white/80 border border-slate-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] space-y-3.5 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-0.5 hover:border-blue-200/60 transition-all duration-300"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold font-mono text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded">
                        {proj.code}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                          proj.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : proj.status === 'planning'
                            ? 'bg-amber-100 text-amber-800'
                            : proj.status === 'completed'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {proj.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm">{proj.name}</h3>
                      {proj.code && <p className="text-sky-700 text-[11px] font-bold font-mono">{proj.code}</p>}
                    </div>

                    {/* Hours */}
                    <div className="flex justify-between items-center text-[11px] font-medium pt-1 border-t border-slate-100">
                      <span className="text-slate-500">Logged Hours:</span>
                      <span className="font-bold text-blue-600">
                        {proj.loggedHours} hrs
                      </span>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600 font-medium">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-bold text-slate-800">{assignedCount} Members</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-bold text-slate-800">{toolsCount} Tools</span>
                        </span>
                      </div>

                      <span className="text-emerald-700 font-extrabold">
                        {proj.billableHours}h Billable
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (1 col): Recent Timesheet Submissions (Review-Only) */}
        <div className="space-y-6">
          <div className="p-6 bg-white border border-slate-200 space-y-5 text-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-sky-600" />
                  <span>Recent Submitted Timesheets</span>
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Review-only access. Timesheets are tracked for billable &amp; non-billable auditing.
                </p>
              </div>

              <button
                onClick={() => onNavigateTab('pm_timesheet_review')}
                className="text-xs font-bold text-sky-600 hover:text-sky-700 shrink-0 cursor-pointer"
              >
                <span>View Log</span>
              </button>
            </div>

            {recentTimesheets.length === 0 ? (
              <p className="text-center text-slate-400 py-6 font-medium">No recent timesheets submitted.</p>
            ) : (
              <div className="space-y-3">
                {recentTimesheets.map((ts) => (
                  <div
                    key={ts.id}
                    className="p-4 bg-slate-50/50 border border-slate-200 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img
                          src={ts.userAvatar}
                          alt={ts.userName}
                          className="w-6 h-6 rounded-full object-cover ring-1 ring-blue-500/20"
                        />
                        <span className="font-bold text-slate-900">{ts.userName}</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                        {ts.projectName}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-700 line-clamp-2 font-medium">
                      {ts.billableDescription || ts.description}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200/60 font-medium">
                      <span>{ts.date}</span>
                      <span className="font-bold text-slate-900">
                        {((ts.billableHours || 0) + (ts.nonBillableHours || 0))}h ({ts.billableHours || 0}h Billable)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Team Leaves Modal */}
      {showLeavesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div
            className="bg-white w-full max-w-3xl max-h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-xl font-black text-slate-900">Team Leaves Details</h2>
              <button
                onClick={() => setShowLeavesModal(false)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <UpcomingLeavesWidget />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
PMDashboard.displayName = 'PMDashboard';

