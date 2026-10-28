import React from 'react';
import { ActivePortalMode } from '../types';
import {
  LayoutDashboard,
  Clock,
  Calendar,
  FolderKanban,
  Moon,
  TrendingUp,
  DollarSign,
  Users,
  CheckSquare,
  Briefcase,
  CalendarCheck,
  CalendarX,
  CalendarDays,
  Wrench,
  FileText,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { Sidebar3DItem } from './ui/Sidebar3DItem';

export type EmployeeTab =
  | 'my_dashboard'
  | 'submit_timesheet'
  | 'timesheets_history'
  | 'my_projects'
  | 'leave_management'
  | 'weekend_work';

export type PMTab =
  | 'pm_dashboard'
  | 'pm_my_projects'
  | 'pm_resource_allocation'
  | 'pm_submit_timesheet'
  | 'pm_timesheets_history'
  | 'pm_timesheet_review'
  | 'pm_weekend_work';

export type ACManagerTab =
  | 'ac_dashboard'
  | 'project_financials'
  | 'tool_utilization'
  | 'employee_utilization'
  | 'budget_vs_actual'
  | 'ac_reports';

export type AdminTab =
  | 'admin_overview'
  | 'user_management'
  | 'admin_tools'
  | 'admin_leave_approvals'
  | 'admin_holidays'
  | 'admin_leave_types'
  | 'admin_working_calendar';

interface SidebarProps {
  portalMode: ActivePortalMode;
  activeEmployeeTab: EmployeeTab;
  onSelectEmployeeTab: (tab: EmployeeTab) => void;
  activePmTab?: PMTab;
  onSelectPmTab?: (tab: PMTab) => void;
  activeAcTab?: ACManagerTab;
  onSelectAcTab?: (tab: ACManagerTab) => void;
  activeAdminTab: AdminTab;
  onSelectAdminTab: (tab: AdminTab) => void;
  pendingTimesheetsCount: number;
  pendingLeavesCount: number;
  pendingWeekendCount: number;
  onQuickAddTimesheet?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = React.memo(({
  portalMode,
  activeEmployeeTab,
  onSelectEmployeeTab,
  activePmTab,
  onSelectPmTab,
  activeAcTab,
  onSelectAcTab,
  activeAdminTab,
  onSelectAdminTab,
  pendingTimesheetsCount,
  pendingLeavesCount,
  pendingWeekendCount,
  isCollapsed: isCollapsedProp,
  onToggleCollapse,
}) => {
  const [internalCollapsed, setInternalCollapsed] = React.useState<boolean>(() => {
    try {
      return localStorage.getItem('supertime_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const isCollapsed = isCollapsedProp !== undefined ? isCollapsedProp : internalCollapsed;

  const toggleSidebar = React.useCallback(() => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalCollapsed((prev) => {
        const next = !prev;
        try {
          localStorage.setItem('supertime_sidebar_collapsed', String(next));
        } catch {}
        return next;
      });
    }
  }, [onToggleCollapse]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);
  const employeeNavItems: Array<{
    id: EmployeeTab;
    label: string;
    icon: any;
    desc: string;
    badge?: number;
  }> = [
      {
        id: 'my_dashboard',
        label: 'My Dashboard',
        icon: LayoutDashboard,
        desc: 'Weekly Hours & Stats',
      },
      {
        id: 'submit_timesheet',
        label: 'Submit Daily Timesheet',
        icon: Clock,
        desc: 'Separate Billable & Non-Billable Notes',
      },
      {
        id: 'timesheets_history',
        label: 'Timesheets History',
        icon: Calendar,
        desc: 'Calendar & List Log Views',
      },
      {
        id: 'my_projects',
        label: 'My Assigned Projects',
        icon: FolderKanban,
        desc: 'Sprint Projects & Tools',
      },
      {
        id: 'weekend_work',
        label: 'Weekend Work Requests',
        icon: Moon,
        desc: 'Overtime & Pre-approvals',
        badge: pendingWeekendCount > 0 ? pendingWeekendCount : undefined,
      },
    ];

  const pmNavItems: Array<{
    id: PMTab;
    label: string;
    icon: any;
    desc: string;
    badge?: number;
  }> = [
      {
        id: 'pm_dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        desc: 'Project KPIs & Overview',
      },
      {
        id: 'pm_my_projects',
        label: 'My Projects',
        icon: Briefcase,
        desc: 'Projects, Team & Tools',
      },
      {
        id: 'pm_resource_allocation',
        label: 'Resource Allocation',
        icon: Users,
        desc: 'Assign Employees & Tools',
      },
      {
        id: 'pm_submit_timesheet',
        label: 'Submit My Timesheet',
        icon: Clock,
        desc: 'Log Your Own Hours',
      },
      {
        id: 'pm_timesheets_history',
        label: 'My Timesheet History',
        icon: Calendar,
        desc: 'View & Edit My Logs',
      },
      {
        id: 'pm_timesheet_review',
        label: 'Timesheet Review',
        icon: CheckSquare,
        desc: 'Read-Only Team Logs',
        badge: pendingTimesheetsCount > 0 ? pendingTimesheetsCount : undefined,
      },
      {
        id: 'pm_weekend_work',
        label: 'Weekend Work Requests',
        icon: CalendarX,
        desc: 'Approve Weekend Overtime',
        badge: pendingWeekendCount > 0 ? pendingWeekendCount : undefined,
      },
    ];

  const acNavItems: Array<{
    id: ACManagerTab;
    label: string;
    icon: any;
    desc: string;
    badge?: string | number;
  }> = [
      {
        id: 'ac_dashboard',
        label: 'Portfolio Dashboard',
        icon: LayoutDashboard,
        desc: 'High-Level KPIs & Trends',
      },
      {
        id: 'project_financials',
        label: 'Project Financials',
        icon: DollarSign,
        desc: 'Milestones & Budgets',
      },
      {
        id: 'employee_utilization',
        label: 'Resource Utilization',
        icon: Users,
        desc: 'Capacity & Labor Cost',
      },
      {
        id: 'budget_vs_actual',
        label: 'Budget vs Actual',
        icon: TrendingUp,
        desc: 'Variance & Burn Rates',
      },
      {
        id: 'tool_utilization',
        label: 'Tool Utilization',
        icon: Wrench,
        desc: 'SaaS & Cloud Spend',
      },
      {
        id: 'ac_reports',
        label: 'Financial Reports',
        icon: FileText,
        desc: 'P&L, Billing Exports',
      },
    ];

  const adminNavItems: Array<{
    id: AdminTab;
    label: string;
    icon: any;
    desc: string;
    badge?: number;
  }> = [
      {
        id: 'admin_overview',
        label: 'Dashboard',
        icon: LayoutDashboard,
        desc: 'Master KPIs & User Activity',
      },
      {
        id: 'user_management',
        label: 'User Management',
        icon: Users,
        desc: 'Employees, Roles & Status',
      },
      {
        id: 'admin_tools',
        label: 'Tool Management',
        icon: Wrench,
        desc: 'Master Tool Catalog & Categories',
      },
      {
        id: 'admin_holidays',
        label: 'Holidays',
        icon: CalendarCheck,
        desc: 'Organization Holiday Calendar',
      },
      {
        id: 'admin_leave_types',
        label: 'Leave Types',
        icon: CalendarX,
        desc: 'Leave Categories & Entitlements',
      },
      {
        id: 'admin_working_calendar',
        label: 'Working Calendar',
        icon: CalendarDays,
        desc: 'Standard Working Hours & Days',
      },
    ];

  return (
    <aside
      className={`sticky top-16 h-[calc(100vh-4rem)] ${
        isCollapsed ? 'w-20' : 'w-64'
      } transition-[width] duration-300 ease-in-out bg-white/95 backdrop-blur-xl border-r border-slate-200/90 text-slate-700 flex flex-col shrink-0 self-start shadow-[4px_0_24px_rgba(99,102,241,0.03)] z-20 select-none relative group/sidebar`}
    >
      {/* Navigation Links */}
      <div className={`space-y-1 flex-1 ${isCollapsed ? 'px-2 py-3 overflow-visible' : 'p-3 overflow-y-auto overflow-x-hidden'}`}>
        {portalMode === 'employee' ? (
          <div>
            {isCollapsed ? (
              <div className="h-5 my-1 flex items-center justify-center" title="Employee Navigation">
                <div className="w-6 h-0.5 rounded-full bg-slate-200" />
              </div>
            ) : (
              <div className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">
                Employee Navigation
              </div>
            )}
            {employeeNavItems.map((item) => (
              <Sidebar3DItem
                key={item.id}
                id={item.id}
                label={item.label}
                desc={item.desc}
                icon={item.icon}
                isActive={activeEmployeeTab === item.id}
                badge={item.badge}
                badgeColorClass="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black shadow-xs shadow-orange-500/25"
                onClick={() => onSelectEmployeeTab(item.id)}
                isCollapsed={isCollapsed}
              />
            ))}
          </div>
        ) : portalMode === 'pm' ? (
          <div>
            {isCollapsed ? (
              <div className="h-5 my-1 flex items-center justify-center" title="Project Manager">
                <div className="w-6 h-0.5 rounded-full bg-slate-200" />
              </div>
            ) : (
              <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
                Project Manager
              </div>
            )}
            {pmNavItems.map((item) => (
              <Sidebar3DItem
                key={item.id}
                id={item.id}
                label={item.label}
                desc={item.desc}
                icon={item.icon}
                isActive={activePmTab === item.id}
                badge={item.badge}
                badgeColorClass="bg-amber-500 text-slate-900"
                onClick={() => onSelectPmTab && onSelectPmTab(item.id)}
                isCollapsed={isCollapsed}
              />
            ))}
          </div>
        ) : portalMode === 'ac_manager' ? (
          <div>
            {isCollapsed ? (
              <div className="h-5 my-1 flex items-center justify-center" title="Account Manager">
                <div className="w-6 h-0.5 rounded-full bg-slate-200" />
              </div>
            ) : (
              <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
                Account Manager
              </div>
            )}
            {acNavItems.map((item) => (
              <Sidebar3DItem
                key={item.id}
                id={item.id}
                label={item.label}
                desc={item.desc}
                icon={item.icon}
                isActive={activeAcTab === item.id}
                badge={item.badge}
                badgeColorClass="bg-sky-500 text-white"
                onClick={() => onSelectAcTab && onSelectAcTab(item.id)}
                isCollapsed={isCollapsed}
              />
            ))}
          </div>
        ) : (
          <div>
            {isCollapsed ? (
              <div className="h-5 my-1 flex items-center justify-center" title="Management & Admin">
                <div className="w-6 h-0.5 rounded-full bg-slate-200" />
              </div>
            ) : (
              <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
                Management &amp; Admin
              </div>
            )}
            {adminNavItems.map((item) => (
              <Sidebar3DItem
                key={item.id}
                id={item.id}
                label={item.label}
                desc={item.desc}
                icon={item.icon}
                isActive={activeAdminTab === item.id}
                badge={item.badge}
                badgeColorClass="bg-rose-500 text-white"
                onClick={() => onSelectAdminTab(item.id)}
                isCollapsed={isCollapsed}
              />
            ))}
          </div>
        )}
      </div>

      {/* Sidebar Footer with Collapse/Expand Action */}
      <div className="p-3 border-t border-slate-200/90 bg-white/80 backdrop-blur-xs flex items-center justify-between">
        {!isCollapsed ? (
          <div className="flex items-center justify-between w-full text-[11px] text-slate-400 font-semibold px-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">SuperTime</span>
            <button
              type="button"
              onClick={toggleSidebar}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/80 transition-colors cursor-pointer text-xs font-semibold"
              title="Collapse sidebar (Ctrl+B)"
            >
              <PanelLeftClose className="w-3.5 h-3.5" />
              <span>Collapse</span>
            </button>
          </div>
        ) : (
          <div className="w-full flex justify-center">
            <button
              type="button"
              onClick={toggleSidebar}
              className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/80 transition-colors cursor-pointer"
              title="Expand sidebar (Ctrl+B)"
            >
              <PanelLeftOpen className="w-4.5 h-4.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
});
Sidebar.displayName = 'Sidebar';
