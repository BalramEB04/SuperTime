import React, { useState } from 'react';
import { User, Project, TimesheetEntry, LeaveRequest, ActivityLog } from '../../types';
import { useGetDashboardSummaryQuery, useGetUpcomingLeavesQuery } from '../../store/api/dataApi';
import {
    Users,
    Clock,
    Calendar,
    FolderKanban,
    UserX,
    Plus,
    Download,
    MoreVertical,
    Filter,
    Edit2,
    CheckCircle2,
    XCircle,
    AlertCircle,
    ChevronRight,
    Palmtree,
    Sparkles,
    ArrowUpRight,
    ArrowDownRight,
    X,
    LayoutDashboard,
} from 'lucide-react';
import { AdminTab } from '../Sidebar';
import { UpcomingLeavesWidget } from '../shared/UpcomingLeavesWidget';
import { TiltCard } from '../ui/TiltCard';

interface AdminOverviewProps {
    users: User[];
    projects: Project[];
    timesheets: TimesheetEntry[];
    leaveRequests: LeaveRequest[];
    activities: ActivityLog[];
    onNavigateTab: (tab: AdminTab) => void;
    onApproveLeave: (id: string) => void;
    onShowToast: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({
    users,
    projects,
    timesheets,
    leaveRequests,
    activities,
    onNavigateTab,
    onApproveLeave,
    onShowToast,
}) => {
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'on_leave' | 'inactive'>('all');
    const [selectedLeaveDetailModal, setSelectedLeaveDetailModal] = useState<LeaveRequest | null>(null);

    const safeUsers = users || [];
    const safeLeaveRequests = leaveRequests || [];
    const safeTimesheets = timesheets || [];
    const safeProjects = projects || [];

    const { data: dashboardData, isLoading } = useGetDashboardSummaryQuery();
    const { data: upcomingLeaves = [] } = useGetUpcomingLeavesQuery();
    const [showLeavesModal, setShowLeavesModal] = useState(false);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    // Map API data to component variables
    const adminOverview = dashboardData?.admin_overview || {};
    const activeUsersCount = adminOverview.active_users_count ?? 0;
    const onLeaveUsersCount = adminOverview.on_leave_users_count ?? 0;

    const pendingLeaves = safeLeaveRequests.filter((l) => l.status.toLowerCase() === 'pending');
    const pendingLeavesCount = adminOverview.pending_leaves_count ?? pendingLeaves.length;
    const activeProjectsCount = adminOverview.active_projects_count ?? safeProjects.length;
    const upcomingLeavesCount = upcomingLeaves.length;

    const nextHoliday = dashboardData?.upcoming_holiday;



    // User status filter for recent activity table
    const filteredUsers = safeUsers.filter((u) => {
        if (statusFilter === 'all') return true;
        return u.status === statusFilter;
    });

    return (
        <div className="space-y-6 text-slate-900 font-sans relative">
            {/* Header Section */}
            <div className="p-5 bg-white/80 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <LayoutDashboard className="w-6 h-6 text-sky-600" />
                        <span>Dashboard Overview</span>
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Welcome back, here's what's happening today across SuperTime Enterprise.
                    </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={() => onNavigateTab('user_management')}
                        className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        <span>New Entry</span>
                    </button>
                    <button
                        onClick={() => onShowToast('Export Started', 'Exporting SuperTime dashboard summary report (CSV)...', 'info')}
                        className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
                    >
                        <Download className="w-4 h-4 text-slate-600" />
                        <span>Export</span>
                    </button>
                </div>
            </div>

            {/* Bento Grid - Overview Cards with 3D Tilt */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {/* Active Users with 3D Tilt */}
                <TiltCard maxRotation={7} className="bg-white/90 backdrop-blur-md border border-slate-200/90 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                            <Users className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                            +2.5%
                        </span>
                    </div>
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                        Active Users
                    </p>
                    <h3 className="text-2xl font-black text-slate-900 mt-1">{activeUsersCount || 0}</h3>
                </TiltCard>

                {/* Upcoming Leaves Summary with 3D Tilt */}
                <TiltCard
                    maxRotation={7}
                    onClick={() => setShowLeavesModal(true)}
                    className="bg-white/90 backdrop-blur-md border border-slate-200/90 p-5 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all text-left cursor-pointer"
                >
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                            <Clock className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                        Team Leaves
                    </p>
                    <h3 className="text-2xl font-black text-slate-900 mt-1">
                        {upcomingLeavesCount}
                    </h3>
                </TiltCard>

                {/* Next Holiday with 3D Tilt */}
                <TiltCard maxRotation={7} className="bg-white/90 backdrop-blur-md border border-slate-200/90 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-slate-100 text-slate-600 rounded-xl">
                            <Calendar className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                        Next Holiday
                    </p>
                    <h3 className="text-2xl font-black text-slate-900 mt-1">
                        {nextHoliday ? `${nextHoliday.days_remaining} Days` : 'N/A'}
                    </h3>
                </TiltCard>

                {/* On Leave Today with 3D Tilt */}
                <TiltCard maxRotation={7} className="bg-white/90 backdrop-blur-md border border-slate-200/90 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                            <UserX className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                        On Leave Today
                    </p>
                    <h3 className="text-2xl font-black text-slate-900 mt-1">{onLeaveUsersCount}</h3>
                </TiltCard>
            </div>

            {/* Middle Section: Upcoming Leaves & Upcoming Holidays */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Upcoming Leaves Widget (8 cols) */}
                <div className="lg:col-span-8">
                    <UpcomingLeavesWidget className="h-full max-h-[400px]" />
                </div>

                {/* Sidebar Card: Upcoming Holidays (4 cols) */}
                <div className="lg:col-span-4 bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs space-y-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <h3 className="text-sm font-extrabold text-slate-900">Upcoming Holidays</h3>
                        <button
                            onClick={() => onShowToast('Working Calendar', 'Navigating to corporate holiday schedule', 'info')}
                            className="text-blue-600 hover:text-blue-700 text-xs font-bold"
                        >
                            View All
                        </button>
                    </div>

                    <div className="space-y-3">
                        {nextHoliday ? (
                            <div
                                className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer border border-transparent hover:border-slate-200"
                            >
                                <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center shrink-0 group-hover:bg-blue-50 group-hover:border-blue-200 transition-colors">
                                    <span className="text-[9px] font-extrabold text-blue-600 uppercase leading-none">
                                        {new Date(nextHoliday.date).toLocaleString('default', { month: 'short' })}
                                    </span>
                                    <span className="text-sm font-black text-slate-900 leading-tight mt-0.5">
                                        {new Date(nextHoliday.date).getDate()}
                                    </span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-slate-900 truncate">{nextHoliday.name}</p>
                                    <p className="text-[10px] text-slate-400 font-medium truncate">{nextHoliday.days_remaining} days away</p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-xs text-slate-500 text-center py-4">No upcoming holidays scheduled</div>
                        )}
                    </div>

                    <div className="pt-2 text-[11px] text-slate-400 text-center font-medium">
                        Holiday calendar is synchronized with HR policy.
                    </div>
                </div>
            </div>

            {/* Bottom Section: Recent User Activity Table */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden flex flex-col">
                <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-extrabold text-slate-900">Recent User Activity</h3>

                    <div className="flex items-center gap-2">
                        <Filter className="w-3.5 h-3.5 text-slate-400" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-xl px-2.5 py-1.5 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="pending">Pending</option>
                            <option value="on_leave">On Leave</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px] font-extrabold">
                            <tr>
                                <th className="py-3 px-4">Employee ID</th>
                                <th className="py-3 px-4">Name</th>
                                <th className="py-3 px-4">Role</th>
                                <th className="py-3 px-4">Status</th>
                                <th className="py-3 px-4">Joining Date</th>
                                <th className="py-3 px-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredUsers.slice(0, 5).map((user, idx) => {
                                const empId = user.employee_id || (user.id ? `EMP-${user.id}` : `EMP-${1000 + idx}`);
                                const initials = (user?.name || 'User')
                                    .split(' ')
                                    .map((n) => n[0] || '')
                                    .join('')
                                    .toUpperCase() || 'U';

                                const statusLower = (user.status || '').toLowerCase();
                                const statusBadgeClass =
                                    statusLower === 'active'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : statusLower === 'pending'
                                            ? 'bg-amber-100 text-amber-800'
                                            : statusLower === 'on_leave'
                                                ? 'bg-blue-100 text-blue-800'
                                                : 'bg-rose-100 text-rose-800';

                                return (
                                    <tr key={user.id || idx} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="py-3.5 px-4 font-bold text-slate-400">{empId}</td>
                                        <td className="py-3.5 px-4">
                                            <div className="flex items-center gap-2.5">
                                                {user.avatar ? (
                                                    <img
                                                        src={user.avatar}
                                                        alt={user.name}
                                                        className="w-7 h-7 rounded-full object-cover ring-2 ring-blue-500/10"
                                                    />
                                                ) : (
                                                    <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 font-extrabold text-[10px] flex items-center justify-center">
                                                        {initials}
                                                    </div>
                                                )}
                                                <span className="font-bold text-slate-900">{user.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-4 text-slate-600 font-medium">{user.title}</td>
                                        <td className="py-3.5 px-4">
                                            <span
                                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${statusBadgeClass}`}
                                            >
                                                {(user.status || '').replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 text-slate-500 font-medium">
                                            {user.joinDate || 'N/A'}
                                        </td>
                                        <td className="py-3.5 px-4 text-right">
                                            <button
                                                onClick={() => onNavigateTab('user_management')}
                                                className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                                                title="Edit User"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
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
};


