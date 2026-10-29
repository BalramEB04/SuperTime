import { getErrorMessage } from './utils/errorHandler';
import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from './store';
import { setPortalMode, logout } from './store/slices/authSlice';
import {
  useGetUsersQuery,
  useGetProjectsQuery,
  useGetTimesheetsQuery,
  useGetManagedTimesheetsQuery,
  useGetLeaveRequestsQuery,
  useGetMyLeaveRequestsQuery,
  useGetWeekendRequestsQuery,
  useGetManagedWeekendRequestsQuery,
  useSubmitWeekendWorkMutation,
  useApproveWeekendWorkMutation,
  useRejectWeekendWorkMutation,
  useCancelWeekendWorkMutation,
  useGetHolidaysQuery,
  useCreateHolidayMutation,
  useUpdateHolidayMutation,
  useDeleteHolidayMutation,
  useCreateTimesheetsMutation,
  useUpdateTimesheetMutation,
  useDeleteTimesheetMutation,
  useCreateLeaveRequestMutation,
  useApproveLeaveRequestMutation,
  useRejectLeaveRequestMutation,
  useCancelLeaveRequestMutation,
  useGetMyLeaveBalancesQuery,
  useGetLeaveTypesQuery,
  useCreateLeaveTypeMutation,
  useUpdateLeaveTypeMutation,
  useDeleteLeaveTypeMutation,
  useGetMyProjectAssignmentsQuery,
  useGetWorkingCalendarQuery,
  useUpdateWorkingCalendarMutation,
  useGetSettingsQuery,
  useUpdateSettingsMutation,
  useGetClientsQuery,
  useCreateClientMutation,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useAssignUserToProjectMutation,
  useRemoveUserFromProjectMutation,
  useCreateToolMutation,
  useAllocateToolMutation,
  useUpdateToolAllocationMutation,
  useDeallocateToolMutation,
} from './store/api/dataApi';
import { useGetCurrentUserQuery, useLogoutMutation } from './store/api/authApi';
import { setCredentials, setUser } from './store/slices/authSlice';
import { apiSlice } from './store/apiSlice';

import {
  User,
  Project,
  TimesheetEntry,
  LeaveBalance,
  LeaveRequest,
  WeekendWorkRequest,
  ActivityLog,
  ToastMessage,
  ActivePortalMode,
  ProjectTool,
  HolidayItem,
  LeaveTypeConfig,
} from './types';

import { LoginPage } from './components/LoginPage';
import { Header } from './components/Header';
import { Sidebar, EmployeeTab, AdminTab, PMTab, ACManagerTab } from './components/Sidebar';
import { ToastContainer } from './components/Toast';

import { MyDashboard } from './components/employee/MyDashboard';
import { SubmitTimesheet } from './components/employee/SubmitTimesheet';
import { TimesheetsHistory } from './components/employee/TimesheetsHistory';
import { MyProjects } from './components/employee/MyProjects';
import { LeaveManagement } from './components/employee/LeaveManagement';
import { WeekendWork } from './components/employee/WeekendWork';

import { PMDashboard } from './components/pm/PMDashboard';
import { PMMyProjects } from './components/pm/PMMyProjects';
import { PMResourceAllocation } from './components/pm/PMResourceAllocation';
import { PMTimesheetReview } from './components/pm/PMTimesheetReview';
import { PMWeekendWorkRequests } from './components/pm/PMWeekendWorkRequests';

import { AccountManagerDashboard } from './components/ac_manager/AccountManagerDashboard';

const AdminOverview = React.lazy(() => import('./components/admin/AdminOverview').then(m => ({ default: m.AdminOverview })));
const UserManagement = React.lazy(() => import('./components/admin/UserManagement').then(m => ({ default: m.UserManagement })));
const ToolsManagement = React.lazy(() => import('./components/admin/ToolsManagement').then(m => ({ default: m.ToolsManagement })));
const AdminLeaveApprovals = React.lazy(() => import('./components/admin/AdminLeaveApprovals').then(m => ({ default: m.AdminLeaveApprovals })));
const HolidaysManagement = React.lazy(() => import('./components/admin/HolidaysManagement').then(m => ({ default: m.HolidaysManagement })));
const LeaveTypesManagement = React.lazy(() => import('./components/admin/LeaveTypesManagement').then(m => ({ default: m.LeaveTypesManagement })));
const WorkingCalendar = React.lazy(() => import('./components/admin/WorkingCalendar').then(m => ({ default: m.WorkingCalendar })));

// Initial mocks for things not yet in backend API endpoints
import { INITIAL_LEAVE_BALANCE, INITIAL_ACTIVITIES, INITIAL_LEAVE_TYPES, INITIAL_WORKING_CALENDAR, INITIAL_SETTINGS } from './data/initialData';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  const dispatch = useDispatch();
  const { user: currentUser, portalMode } = useSelector((state: RootState) => state.auth);

  // Tracks whether the user just clicked logout.
  // Must be useState (not useRef) so React can batch it with dispatch(logout())
  // in a single render, preventing useGetCurrentUserQuery from re-firing.
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const authAttemptedRef = React.useRef(false);
  const hasToken = typeof window !== 'undefined' ? !!localStorage.getItem('access_token') : false;

  // Attempt to restore/revalidate session on load.
  // Skip if there is no token, or if we are logging out, or if auth already failed.
  const { data: userProfile, isLoading: isAuthLoading, isError } = useGetCurrentUserQuery(undefined, {
    skip: !hasToken || isLoggingOut || authAttemptedRef.current,
  });

  if (isError) {
    authAttemptedRef.current = true;
  }

  function normalizePortalMode(portal: string | null | undefined): ActivePortalMode | null {
    if (!portal) return null;
    const p = String(portal).toLowerCase();
    if (p.includes('admin')) return 'admin';
    if (p.includes('project') || p === 'pm') return 'pm';
    if (p.includes('account') || p === 'ac_manager') return 'ac_manager';
    if (p.includes('employee')) return 'employee';
    return null;
  }

  // Initialize URL Sync variables
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const rawUrlPortal = searchParams.get('portal');
  const urlPortal = normalizePortalMode(rawUrlPortal);
  const urlTab = searchParams.get('tab');

  // Ref to track last synced profile and prevent infinite re-render loop
  const lastSyncedProfileRef = React.useRef<string | null>(null);

  // If user profile is successfully fetched, set/update credentials
  React.useEffect(() => {
    if (userProfile && !isLoggingOut) {
      const profileKey = String(userProfile.id) + '-' + String(userProfile.role) + '-' + String(userProfile.status);
      if (lastSyncedProfileRef.current !== profileKey) {
        lastSyncedProfileRef.current = profileKey;
        if (!currentUser) {
          dispatch(setCredentials({ user: userProfile }));
        } else {
          dispatch(setUser(userProfile));
        }

        // Restore portal mode: URL param > sessionStorage saved page > role default (set by setCredentials)
        const validPortals = ['employee', 'pm', 'ac_manager', 'admin'];
        if (urlPortal && validPortals.includes(urlPortal)) {
          setTimeout(() => dispatch(setPortalMode(urlPortal)), 0);
        } else {
          // Try sessionStorage fallback for browser-close/reopen scenario
          try {
            const saved = JSON.parse(sessionStorage.getItem('ST_lastPage') || '{}');
            const savedPortal = normalizePortalMode(saved.portal);
            if (savedPortal && validPortals.includes(savedPortal)) {
              setTimeout(() => dispatch(setPortalMode(savedPortal)), 0);
            }
          } catch { /* ignore */ }
        }
      }
    }
  }, [userProfile, currentUser, dispatch, urlPortal, isLoggingOut]);

  // Reset isLoggingOut flag when a user logs in successfully
  React.useEffect(() => {
    if (currentUser) {
      setIsLoggingOut(false);
    }
  }, [currentUser]);

  // Helper: read last-saved session page from sessionStorage
  const _getSavedPage = () => {
    try {
      const saved = JSON.parse(sessionStorage.getItem('ST_lastPage') || '{}');
      return {
        ...saved,
        portal: normalizePortalMode(saved.portal),
      };
    } catch {
      return {};
    }
  };

  // Local UI State — URL params take priority, then sessionStorage fallback, then default
  const _saved = _getSavedPage();
  const [activeEmployeeTab, setActiveEmployeeTab] = useState<EmployeeTab>(() => {
    if (urlPortal === 'employee' && urlTab) return urlTab as EmployeeTab;
    if (_saved.portal === 'employee' && _saved.tab) return _saved.tab as EmployeeTab;
    return 'my_dashboard';
  });
  const [activePmTab, setActivePmTab] = useState<PMTab>(() => {
    if (urlPortal === 'pm' && urlTab) return urlTab as PMTab;
    if (_saved.portal === 'pm' && _saved.tab) return _saved.tab as PMTab;
    return 'pm_dashboard';
  });
  const [activeAcTab, setActiveAcTab] = useState<ACManagerTab>(() => {
    if (urlPortal === 'ac_manager' && urlTab) return urlTab as ACManagerTab;
    if (_saved.portal === 'ac_manager' && _saved.tab) return _saved.tab as ACManagerTab;
    return 'ac_dashboard';
  });
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>(() => {
    if (urlPortal === 'admin' && urlTab) return urlTab as AdminTab;
    if (_saved.portal === 'admin' && _saved.tab) return _saved.tab as AdminTab;
    return 'admin_overview';
  });

  // Track previous tab per portal so we can distinguish a real tab change from a re-render
  const prevTabRef = React.useRef<{ portal: string; tab: string } | null>(null);

  // Sync state changes to URL and sessionStorage (for browser-close/reopen restoration)
  React.useEffect(() => {
    if (!currentUser) {
      // Clear URL parameters and sessionStorage when logged out
      window.history.replaceState(null, '', window.location.pathname);
      try { sessionStorage.removeItem('ST_lastPage'); } catch { /* ignore */ }
      prevTabRef.current = null;
      return;
    }

    const params = new URLSearchParams(window.location.search);
    params.set('portal', portalMode);
    let activeTab = '';
    if (portalMode === 'employee') { params.set('tab', activeEmployeeTab); activeTab = activeEmployeeTab; }
    else if (portalMode === 'pm') { params.set('tab', activePmTab); activeTab = activePmTab; }
    else if (portalMode === 'ac_manager') { params.set('tab', activeAcTab); activeTab = activeAcTab; }
    else if (portalMode === 'admin') { params.set('tab', activeAdminTab); activeTab = activeAdminTab; }

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    const prev = prevTabRef.current;

    if (prev === null) {
      // First render after login — just set the URL, don't push history
      window.history.replaceState({ portal: portalMode, tab: activeTab }, '', newUrl);
    } else if (prev.portal !== portalMode) {
      // Portal mode switched (e.g. employee → pm) — replace, not push (not a page navigation)
      window.history.replaceState({ portal: portalMode, tab: activeTab }, '', newUrl);
    } else if (prev.tab !== activeTab) {
      // Tab changed within the same portal — push a real history entry so Back/Forward works
      window.history.pushState({ portal: portalMode, tab: activeTab }, '', newUrl);
    } else {
      // Same portal + same tab (initial mount or re-render) — just replace silently
      window.history.replaceState({ portal: portalMode, tab: activeTab }, '', newUrl);
    }

    prevTabRef.current = { portal: portalMode, tab: activeTab };
    // Persist for browser close/reopen
    try { sessionStorage.setItem('ST_lastPage', JSON.stringify({ portal: portalMode, tab: activeTab })); } catch { /* ignore */ }
  }, [currentUser, portalMode, activeEmployeeTab, activePmTab, activeAcTab, activeAdminTab]);

  // Listen for browser Back/Forward (popstate) and sync React tab state to match the URL
  React.useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      // Read the state object we stored in pushState/replaceState, or fall back to URL params
      const state = event.state as { portal?: string; tab?: string } | null;
      const params = new URLSearchParams(window.location.search);
      const rawPortal = state?.portal || params.get('portal');
      const portal = normalizePortalMode(rawPortal) || portalMode;
      const tab = state?.tab || params.get('tab') || '';

      if (!tab) return;

      // Update the correct tab state depending on which portal the history entry belongs to
      if (portal === 'employee') {
        setActiveEmployeeTab(tab as any);
        if (portal !== portalMode) dispatch(setPortalMode('employee'));
      } else if (portal === 'pm') {
        setActivePmTab(tab as any);
        if (portal !== portalMode) dispatch(setPortalMode('pm'));
      } else if (portal === 'ac_manager') {
        setActiveAcTab(tab as any);
        if (portal !== portalMode) dispatch(setPortalMode('ac_manager'));
      } else if (portal === 'admin') {
        setActiveAdminTab(tab as any);
        if (portal !== portalMode) dispatch(setPortalMode('admin'));
      }

      // Keep prevTabRef in sync so the next state change is classified correctly
      prevTabRef.current = { portal, tab };
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [dispatch, portalMode]);

  // Cross-tab logout: broadcast logout events so all tabs sign out together
  React.useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('ST_auth');
      bc.onmessage = (event) => {
        if (event.data === 'logout' && !isLoggingOut) {
          // Another tab logged out — mirror the logout here without calling the server again
          setIsLoggingOut(true);
          dispatch(logout());
          dispatch(apiSlice.util.resetApiState());
        }
      };
    } catch { /* BroadcastChannel not supported — silent fallback */ }
    return () => { bc?.close(); };
  }, [dispatch, isLoggingOut]);

  // Sleep/wake revalidation: when tab becomes visible after being hidden, re-check session
  React.useEffect(() => {
    let hiddenAt = 0;
    const onVisibilityChange = () => {
      if (document.hidden) {
        hiddenAt = Date.now();
      } else {
        // Only revalidate if tab was hidden for more than 30 seconds (sleep/wake or long background)
        const hiddenMs = Date.now() - hiddenAt;
        if (hiddenMs > 30_000 && currentUser && !isLoggingOut) {
          // Invalidate the RTK Query user tag to trigger a fresh /auth/me check
          dispatch(apiSlice.util.invalidateTags(['User']));
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [dispatch, currentUser, isLoggingOut]);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [editingTimesheet, setEditingTimesheet] = useState<TimesheetEntry | null>(null);
  const [defaultSubmitDate, setDefaultSubmitDate] = useState<string | null>(null);
  const [openMarkLeaveModal, setOpenMarkLeaveModal] = useState(false);

  // RTK Queries (Skipped if not logged in)
  const skip = !currentUser;
  const isAdmin = currentUser?.role === 'admin';
  const isPm = currentUser?.role === 'pm';

  const { data: users = [] } = useGetUsersQuery(undefined, { skip });
  const { data: projects = [] } = useGetProjectsQuery(undefined, { skip });
  const { data: clients = [] } = useGetClientsQuery(undefined, { skip: skip || (!isPm && !isAdmin) });
  const { data: myTimesheets = [] } = useGetTimesheetsQuery(undefined, { skip });
  const { data: managedTimesheets = [] } = useGetManagedTimesheetsQuery(undefined, { skip: skip || !isPm });

  const timesheets = React.useMemo(() => {
    const map = new Map<string, TimesheetEntry>();
    myTimesheets.forEach(t => map.set(t.id, t));
    if (isPm) {
      managedTimesheets.forEach(t => map.set(t.id, t));
    }
    return Array.from(map.values());
  }, [myTimesheets, managedTimesheets, isPm]);

  // Admins need all leave requests; others just need theirs
  const { data: allLeaveRequests = [] } = useGetLeaveRequestsQuery(undefined, { skip: skip || !isAdmin });
  const { data: myLeaveRequests = [] } = useGetMyLeaveRequestsQuery(undefined, { skip: skip || isAdmin });
  const leaveRequests = isAdmin ? allLeaveRequests : myLeaveRequests;

  const { data: myWeekendRequests = [] } = useGetWeekendRequestsQuery(undefined, { skip });
  const { data: pendingWeekendRequests = [] } = useGetManagedWeekendRequestsQuery(undefined, { skip: skip || (!isPm && !isAdmin) });
  const weekendRequests = isPm || isAdmin ? pendingWeekendRequests : myWeekendRequests;
  const { data: holidays = [] } = useGetHolidaysQuery(undefined, { skip });
  const { data: myProjectAssignments = [] } = useGetMyProjectAssignmentsQuery(undefined, { skip });
  const { data: fetchedLeaveBalance } = useGetMyLeaveBalancesQuery(undefined, { skip });
  const { data: leaveTypes = [] } = useGetLeaveTypesQuery(undefined, { skip });

  // Only admin needs working calendar and system settings
  const { data: fetchedWorkingCalendar } = useGetWorkingCalendarQuery(undefined, { skip: skip || !isAdmin });
  const { data: fetchedSettings } = useGetSettingsQuery(undefined, { skip: skip || !isAdmin });

  const [createProjectMutation] = useCreateProjectMutation();
  const [updateProjectMutation] = useUpdateProjectMutation();
  const [deleteProjectMutation] = useDeleteProjectMutation();
  const [assignUserMutation] = useAssignUserToProjectMutation();
  const [removeUserMutation] = useRemoveUserFromProjectMutation();
  const [createTool] = useCreateToolMutation();
  const [allocateTool] = useAllocateToolMutation();
  const [updateToolAllocation] = useUpdateToolAllocationMutation();
  const [removeToolMutation] = useDeallocateToolMutation();

  // Fallbacks for data not yet wired up
  const leaveBalance = React.useMemo(() => fetchedLeaveBalance || {
    annualLeaveTotal: 0,
    annualLeaveUsed: 0,
    sickLeaveTotal: 0,
    sickLeaveUsed: 0,
    parentalLeaveTotal: 0,
    parentalLeaveUsed: 0,
    compOffTotal: 0,
    compOffUsed: 0,
  }, [fetchedLeaveBalance]);

  const workingCalendar = React.useMemo(() => fetchedWorkingCalendar || INITIAL_WORKING_CALENDAR, [fetchedWorkingCalendar]);
  const [activities] = useState<ActivityLog[]>(INITIAL_ACTIVITIES);
  const settings = React.useMemo(() => fetchedSettings || INITIAL_SETTINGS, [fetchedSettings]);

  // RTK Mutations
  const [updateWorkingCalendar] = useUpdateWorkingCalendarMutation();
  const [updateSettingsMutation] = useUpdateSettingsMutation();
  const [createTimesheets] = useCreateTimesheetsMutation();
  const [updateTimesheetApi] = useUpdateTimesheetMutation();
  const [deleteTimesheetApi] = useDeleteTimesheetMutation();
  const [createLeaveRequest] = useCreateLeaveRequestMutation();
  const [approveLeaveRequest] = useApproveLeaveRequestMutation();
  const [rejectLeaveRequest] = useRejectLeaveRequestMutation();
  const [cancelLeaveRequest] = useCancelLeaveRequestMutation();
  const [createHoliday] = useCreateHolidayMutation();
  const [updateHoliday] = useUpdateHolidayMutation();
  const [deleteHoliday] = useDeleteHolidayMutation();
  const [createLeaveType] = useCreateLeaveTypeMutation();
  const [updateLeaveType] = useUpdateLeaveTypeMutation();
  const [deleteLeaveType] = useDeleteLeaveTypeMutation();
  const [submitWeekendWork] = useSubmitWeekendWorkMutation();
  const [approveWeekendWork] = useApproveWeekendWorkMutation();
  const [rejectWeekendWork] = useRejectWeekendWorkMutation();
  const [logoutApi] = useLogoutMutation();

  const showToast = React.useCallback((title: string, description?: string, type: 'success' | 'error' | 'info' = 'info') => {
    const newToast: ToastMessage = {
      id: Date.now().toString() + Math.random().toString().slice(2, 5),
      title,
      description,
      type,
    };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 4000);
  }, []);

  const handleDismissToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleLogout = React.useCallback(() => {
    // 1. Prevent getCurrentUser from re-firing during this render cycle.
    setIsLoggingOut(true);

    // 2. Clear user — component re-renders to <LoginPage /> immediately.
    dispatch(logout());

    // 3. Wipe the RTK-Query cache so stale data isn't shown on next login.
    dispatch(apiSlice.util.resetApiState());

    // 4. Clear persisted last-page so the next user doesn't land on the previous user's page.
    try { sessionStorage.removeItem('ST_lastPage'); } catch { /* ignore */ }

    // 5. Notify other tabs to log out too.
    try {
      const bc = new BroadcastChannel('ST_auth');
      bc.postMessage('logout');
      bc.close();
    } catch { /* BroadcastChannel not supported — silent fallback */ }

    // 6. Tell the server to invalidate the session cookie — fire and forget.
    logoutApi().catch(() => {
      // Ignore server-side logout errors; the client is already logged out.
    });
  }, [dispatch, logoutApi]);

  // --- Timesheet Handlers ---
  const handleTimesheetSubmit = React.useCallback(async (entries: Omit<TimesheetEntry, 'id'>[]) => {
    try {
      const payload = entries.map(e => ({
        project_assignment_id: Number(e.projectId),
        timesheet_date: e.date,
        billable_hours: e.billableHours,
        non_billable_hours: e.nonBillableHours,
        billable_work_summary: e.billableDescription || e.description,
        non_billable_work_summary: e.nonBillableDescription,
        milestone_id: e.milestoneId,
      }));
      await createTimesheets(payload as any).unwrap();
      showToast('Success', 'Timesheets submitted', 'success');
    } catch (e: any) {
      showToast('Action Failed', getErrorMessage(e, 'Failed to submit timesheets'), 'error');
    }
  }, [createTimesheets, showToast]);

  const handleDeleteTimesheet = React.useCallback(async (id: string) => {
    try {
      await deleteTimesheetApi(id).unwrap();
      showToast('Success', 'Timesheet entry deleted', 'success');
    } catch (e: any) {
      showToast('Action Failed', getErrorMessage(e, 'Failed to delete timesheet'), 'error');
    }
  }, [deleteTimesheetApi, showToast]);

  const handleUpdateTimesheet = React.useCallback(async (updatedEntry: TimesheetEntry) => {
    try {
      await updateTimesheetApi({
        id: updatedEntry.id,
        billable_hours: updatedEntry.billableHours,
        non_billable_hours: updatedEntry.nonBillableHours,
        billable_work_summary: updatedEntry.billableDescription || updatedEntry.description,
        non_billable_work_summary: updatedEntry.nonBillableDescription,
        timesheet_date: updatedEntry.date,
        milestone_id: updatedEntry.milestoneId,
      }).unwrap();
      showToast('Success', 'Timesheet entry updated', 'success');
    } catch (e: any) {
      showToast('Action Failed', getErrorMessage(e, 'Failed to update timesheet'), 'error');
    }
  }, [updateTimesheetApi, showToast]);

  // --- Leave Handlers ---
  const handleApplyLeave = React.useCallback(async (req: Omit<LeaveRequest, 'id'>) => {
    try {
      // Map frontend type to leave_type_id dynamically using the fetched leaveTypes
      const matchedType = leaveTypes.find(lt => lt.name.toLowerCase() === req.type.toLowerCase());
      const leaveTypeId = matchedType ? Number(matchedType.id) : 3; // Fallback to 3 if not found

      await createLeaveRequest({
        leave_type_id: leaveTypeId,
        start_date: req.startDate,
        end_date: req.endDate,
        reason: req.reason,
      }).unwrap();
      showToast('Success', 'Leave request submitted successfully', 'success');
    } catch (e: any) {
      showToast('Action Failed', getErrorMessage(e, 'Failed to apply for leave'), 'error');
    }
  }, [leaveTypes, createLeaveRequest, showToast]);

  const handleCancelLeave = React.useCallback(async (id: string) => {
    try {
      await cancelLeaveRequest(id).unwrap();
      showToast('Success', 'Leave request cancelled', 'success');
    } catch (e: any) {
      showToast('Action Failed', getErrorMessage(e, 'Failed to cancel leave'), 'error');
    }
  }, [cancelLeaveRequest, showToast]);

  const handleApproveLeave = React.useCallback(async (id: string, comment?: string) => {
    try {
      await approveLeaveRequest({ id, comment }).unwrap();
      showToast('Success', 'Leave approved', 'success');
    } catch (e: any) {
      showToast('Action Failed', getErrorMessage(e, 'Failed to approve leave'), 'error');
    }
  }, [approveLeaveRequest, showToast]);

  const handleRejectLeave = React.useCallback(async (id: string, comment?: string) => {
    try {
      await rejectLeaveRequest({ id, rejection_reason: comment }).unwrap();
      showToast('Success', 'Leave rejected', 'success');
    } catch (e: any) {
      showToast('Action Failed', getErrorMessage(e, 'Failed to reject leave'), 'error');
    }
  }, [rejectLeaveRequest, showToast]);

  // --- Weekend Work ---
  const handleRequestWeekendWork = React.useCallback(async (req: Omit<WeekendWorkRequest, 'id'>) => {
    try {
      const assignment = myProjectAssignments.find(a => String(a.project_id) === req.projectId);
      const assignmentId = assignment ? assignment.id : Number(req.projectId); // fallback

      await submitWeekendWork({
        project_assignment_id: assignmentId,
        work_date: req.workDate,
        planned_hours: req.plannedHours,
        billable_hours: req.billableHours || 0,
        billable_work_summary: req.billableWorkSummary || undefined,
        non_billable_hours: req.nonBillableHours || 0,
        non_billable_work_summary: req.nonBillableWorkSummary || undefined,
        reason: req.deliverableObjective,
      }).unwrap();
      showToast('Success', 'Weekend work request submitted with work summary', 'success');
    } catch (e: any) {
      showToast('Action Failed', getErrorMessage(e, 'Failed to submit weekend work request'), 'error');
    }
  }, [myProjectAssignments, submitWeekendWork, showToast]);

  const handleApproveWeekendWork = React.useCallback(async (id: string) => {
    try {
      await approveWeekendWork({ id }).unwrap();
      showToast('Success', 'Weekend work approved', 'success');
    } catch (e: any) {
      showToast('Action Failed', getErrorMessage(e, 'Failed to approve weekend work'), 'error');
    }
  }, [approveWeekendWork, showToast]);

  const handleRejectWeekendWork = React.useCallback(async (id: string, comment?: string) => {
    try {
      await rejectWeekendWork({ id, rejection_reason: comment }).unwrap();
      showToast('Success', 'Weekend work rejected', 'success');
    } catch (e: any) {
      showToast('Action Failed', getErrorMessage(e, 'Failed to reject weekend work'), 'error');
    }
  }, [rejectWeekendWork, showToast]);

  // --- Projects / PM / AC ---
  const handleUpdateProjectBudget = React.useCallback(async (projectId: string, newBudget: number) => {
    try {
      await updateProjectMutation({
        id: projectId,
        budget: newBudget,
      }).unwrap();
      showToast('Success', 'Project budget updated successfully', 'success');
    } catch (e: any) {
      showToast('Action Failed', getErrorMessage(e, 'Failed to update project budget'), 'error');
    }
  }, [updateProjectMutation, showToast]);

  const [createClientMutation] = useCreateClientMutation();

  const handleCreateClient = React.useCallback(async (name: string, contactInfo?: string) => {
    try {
      const res = await createClientMutation({ name, contact_info: contactInfo }).unwrap();
      showToast('Success', `Client "${name}" created successfully`, 'success');
      return res?.data || res;
    } catch (e: any) {
      showToast('Action Failed', getErrorMessage(e, 'Failed to create client'), 'error');
      throw e;
    }
  }, [createClientMutation, showToast]);

  const handleAddProject = React.useCallback(async (newProj: Omit<Project, 'id'>) => {
    if (!currentUser) return;
    try {
      const res = await createProjectMutation({
        client_id: newProj.client ? Number(newProj.client) : undefined,
        project_manager_id: Number(currentUser.id),
        project_name: newProj.name,
        description: newProj.description,
        budget: newProj.budget,
        start_date: newProj.startDate,
        end_date: newProj.endDate,
      }).unwrap();
      showToast('Success', 'Project created successfully', 'success');
      return res?.data || res;
    } catch (e: any) {
      showToast('Action Failed', getErrorMessage(e, 'Failed to create project'), 'error');
      throw e;
    }
  }, [currentUser, createProjectMutation, showToast]);

  const handleUpdateProject = React.useCallback(async (updatedProj: Project) => {
    try {
      await updateProjectMutation({
        id: updatedProj.id,
        project_name: updatedProj.name,
        description: updatedProj.description,
        status: updatedProj.status,
        budget: updatedProj.budget,
        start_date: updatedProj.startDate,
        end_date: updatedProj.endDate,
        is_active: updatedProj.is_active !== undefined ? updatedProj.is_active : updatedProj.isActive,
      }).unwrap();
      showToast('Success', 'Project updated successfully', 'success');
    } catch (e: any) {
      showToast('Action Failed', getErrorMessage(e, 'Failed to update project'), 'error');
    }
  }, [updateProjectMutation, showToast]);

  const handleAssignUserToProject = React.useCallback(async (projectId: string, userId: string) => {
    try {
      await assignUserMutation({
        project_id: Number(projectId),
        user_id: Number(userId),
      }).unwrap();
      showToast('Success', 'User assigned successfully', 'success');
    } catch (e: any) {
      showToast('Action Failed', getErrorMessage(e, 'Failed to assign user'), 'error');
    }
  }, [assignUserMutation, showToast]);

  const handleRemoveUserFromProject = React.useCallback(async (projectId: string, userId: string) => {
    try {
      await removeUserMutation({ projectId, userId }).unwrap();
      showToast('Success', 'User removed from project successfully', 'success');
    } catch (e: any) {
      showToast('Action Failed', getErrorMessage(e, 'Failed to remove user'), 'error');
    }
  }, [removeUserMutation, showToast]);

  const handleUpdateToolInProject = React.useCallback(async (allocationId: string | number, toolData: { monthlyCost?: number; seats?: number; allocationDate?: string; deallocationDate?: string; allocationBasis?: string }) => {
    try {
      await updateToolAllocation({
        id: allocationId,
        monthly_cost: toolData.monthlyCost,
        seats: toolData.seats,
        allocation_date: toolData.allocationDate,
        deallocation_date: toolData.deallocationDate,
        allocation_basis: toolData.allocationBasis,
      }).unwrap();
      showToast('Success', 'Tool allocation updated successfully', 'success');
    } catch (e: any) {
      showToast('Action Failed', getErrorMessage(e, 'Failed to update tool allocation'), 'error');
    }
  }, [updateToolAllocation, showToast]);

  const handleAddToolToMilestone = React.useCallback(async (milestoneId: string, toolData: { toolId: number; monthlyCost: number; seats: number; allocationDate: string; deallocationDate?: string }) => {
    try {
      await allocateTool({
        milestone_id: Number(milestoneId),
        tool_id: toolData.toolId,
        monthly_cost: toolData.monthlyCost,
        seats: toolData.seats,
        allocation_date: toolData.allocationDate,
        deallocation_date: toolData.deallocationDate || undefined,
      }).unwrap();
      showToast('Success', 'Tool allocated to milestone successfully', 'success');
    } catch (e: any) {
      showToast('Action Failed', getErrorMessage(e, 'Failed to allocate tool'), 'error');
    }
  }, [allocateTool, showToast]);

  const handleRemoveToolFromProject = React.useCallback(async (projectId: string, toolId: string) => {
    try {
      await removeToolMutation(toolId).unwrap();
      showToast('Success', 'Tool removed', 'success');
    } catch (e: any) {
      showToast('Action Failed', 'Failed to remove tool', 'error');
    }
  }, [removeToolMutation, showToast]);

  // --- Holidays / Settings ---
  const handleAddHoliday = React.useCallback(async (item: Omit<HolidayItem, 'id'>) => {
    try {
      await createHoliday(item).unwrap();
      showToast('Success', 'Holiday Added', 'success');
    } catch (e: any) {
      showToast('Action Failed', getErrorMessage(e, 'Failed to add holiday'), 'error');
    }
  }, [createHoliday, showToast]);

  const handleEditHoliday = React.useCallback(async (updatedItem: HolidayItem) => {
    try {
      await updateHoliday(updatedItem).unwrap();
      showToast('Success', 'Holiday Updated', 'success');
    } catch (e: any) {
      showToast('Action Failed', getErrorMessage(e, 'Failed to update holiday'), 'error');
    }
  }, [updateHoliday, showToast]);

  const handleDeleteHoliday = React.useCallback(async (id: string) => {
    try {
      await deleteHoliday(id).unwrap();
      showToast('Success', 'Holiday deleted', 'success');
    } catch (e) {
      showToast('Action Failed', 'Failed to delete holiday', 'error');
    }
  }, [deleteHoliday, showToast]);

  // --- Leave Types Handlers ---
  const handleAddLeaveType = React.useCallback(async (type: Omit<LeaveTypeConfig, 'id'>) => {
    try {
      await createLeaveType({
        name: type.name,
        code: type.code,
        daysPerYear: type.daysPerYear,
        isPaid: type.isPaid,
        requiresDocument: type.requiresDocument,
        description: type.description,
      }).unwrap();
      showToast('Success', 'Leave type added', 'success');
    } catch (e: any) {
      showToast('Action Failed', getErrorMessage(e, 'Failed to add leave type'), 'error');
    }
  }, [createLeaveType, showToast]);

  const handleEditLeaveType = React.useCallback(async (updated: LeaveTypeConfig) => {
    try {
      await updateLeaveType({
        id: updated.id,
        name: updated.name,
        code: updated.code,
        daysPerYear: updated.daysPerYear,
        allocatedHours: updated.allocatedHours,
        isPaid: updated.isPaid,
        requiresDocument: updated.requiresDocument,
        description: updated.description,
        status: updated.status,
      }).unwrap();
      showToast('Success', `Leave type ${updated.status === 'inactive' ? 'deactivated' : 'updated'}`, 'success');
    } catch (e: any) {
      showToast('Action Failed', getErrorMessage(e, 'Failed to update leave type'), 'error');
    }
  }, [updateLeaveType, showToast]);

  const handleToggleLeaveTypeStatus = React.useCallback(async (id: string) => {
    try {
      await deleteLeaveType(id).unwrap();
      showToast('Success', 'Leave type status toggled', 'success');
    } catch (e: any) {
      showToast('Action Failed', getErrorMessage(e, 'Failed to toggle status'), 'error');
    }
  }, [deleteLeaveType, showToast]);

  // Memoized Sidebar & Header callbacks
  const handleTogglePortalMode = React.useCallback((mode: ActivePortalMode) => {
    dispatch(setPortalMode(mode));
  }, [dispatch]);

  const handleSelectEmployeeTab = React.useCallback((tab: EmployeeTab) => {
    setActiveEmployeeTab(tab);
    if (tab !== 'submit_timesheet') {
      setEditingTimesheet(null);
      setDefaultSubmitDate(null);
    }
  }, []);

  const handleSelectPmTab = React.useCallback((tab: PMTab) => {
    setActivePmTab(tab);
  }, []);

  const handleSelectAcTab = React.useCallback((tab: ACManagerTab) => {
    setActiveAcTab(tab);
  }, []);

  const handleSelectAdminTab = React.useCallback((tab: AdminTab) => {
    setActiveAdminTab(tab);
  }, []);

  const handleQuickAddTimesheet = React.useCallback(() => {
    if (portalMode === 'employee') setActiveEmployeeTab('submit_timesheet');
  }, [portalMode]);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('supertime_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleSidebar = React.useCallback(() => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('supertime_sidebar_collapsed', String(next));
      } catch { }
      return next;
    });
  }, []);

  // -----------------------------------------------------------------
  const pendingTimesheetsCount = React.useMemo(() => {
    return (timesheets || []).filter((t: any) => t.status === 'pending').length;
  }, [timesheets]);

  const pendingLeavesCount = React.useMemo(() => {
    return (leaveRequests || []).filter((l: any) => l.status === 'pending').length;
  }, [leaveRequests]);

  const pendingWeekendCount = React.useMemo(() => {
    return (weekendRequests || []).filter((w: any) => w.status === 'pending').length;
  }, [weekendRequests]);

  const pendingApprovalsTotal = React.useMemo(() => {
    return pendingTimesheetsCount + pendingLeavesCount;
  }, [pendingTimesheetsCount, pendingLeavesCount]);

  if (isAuthLoading && !currentUser) {
    return (
      <div className="min-h-screen bg-[#f8fafe] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium animate-pulse">Checking session...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans relative">
        <LoginPage />
        <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#edf2f7] text-slate-800 flex flex-col font-sans selection:bg-primary selection:text-white overflow-hidden">
      <Header
        currentUser={currentUser}
        portalMode={portalMode}
        onTogglePortalMode={handleTogglePortalMode}
        pendingApprovalsCount={pendingApprovalsTotal}
        onLogout={handleLogout}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={handleToggleSidebar}
      />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar
          portalMode={portalMode}
          activeEmployeeTab={activeEmployeeTab}
          onSelectEmployeeTab={handleSelectEmployeeTab}
          activePmTab={activePmTab}
          onSelectPmTab={handleSelectPmTab}
          activeAcTab={activeAcTab}
          onSelectAcTab={handleSelectAcTab}
          activeAdminTab={activeAdminTab}
          onSelectAdminTab={handleSelectAdminTab}
          pendingTimesheetsCount={pendingTimesheetsCount}
          pendingLeavesCount={pendingLeavesCount}
          pendingWeekendCount={pendingWeekendCount}
          onQuickAddTimesheet={handleQuickAddTimesheet}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
        />

        <main className={`flex-1 p-3 sm:p-4 lg:px-6 lg:py-3 w-full min-w-0 bg-[#edf2f7] flex flex-col ${portalMode === 'employee' && activeEmployeeTab === 'timesheets_history'
            ? 'overflow-hidden'
            : 'overflow-y-auto'
          }`}>
          {portalMode === 'employee' && (
            <>
              {activeEmployeeTab === 'my_dashboard' && (
                <MyDashboard
                  currentUser={currentUser}
                  timesheets={timesheets}
                  projects={projects}
                  leaveBalance={leaveBalance}
                  leaveRequests={leaveRequests}
                  holidays={holidays || []}
                  onNavigateTab={(tab) => {
                    setActiveEmployeeTab(tab);
                    if (tab !== 'submit_timesheet') {
                      setEditingTimesheet(null);
                      setDefaultSubmitDate(null);
                    }
                  }}
                  onOpenMarkLeave={() => {
                    setOpenMarkLeaveModal(true);
                    setActiveEmployeeTab('submit_timesheet');
                  }}
                />
              )}

              {activeEmployeeTab === 'submit_timesheet' && (
                <SubmitTimesheet
                  currentUser={currentUser}
                  projects={projects}
                  timesheets={timesheets}
                  onNavigateTab={(tab) => setActiveEmployeeTab(tab as EmployeeTab)}
                  projectAssignments={myProjectAssignments}
                  onSubmitTimesheet={handleTimesheetSubmit}
                  onUpdateTimesheet={handleUpdateTimesheet}
                  editingEntry={editingTimesheet}
                  defaultDate={defaultSubmitDate}
                  initialOpenMarkLeave={openMarkLeaveModal}
                  onCloseMarkLeaveModal={() => setOpenMarkLeaveModal(false)}
                  onClearEditing={() => setEditingTimesheet(null)}
                  onShowToast={showToast}
                />
              )}

              {activeEmployeeTab === 'timesheets_history' && (
                <TimesheetsHistory
                  currentUser={currentUser}
                  timesheets={timesheets}
                  projects={projects}
                  holidays={holidays || []}
                  onDeleteTimesheet={handleDeleteTimesheet}
                  onUpdateTimesheet={handleUpdateTimesheet}
                  onSubmitTimesheets={handleTimesheetSubmit}
                  onEditRequest={(entry) => {
                    setEditingTimesheet(entry);
                    setActiveEmployeeTab('submit_timesheet');
                  }}
                  onNavigateToSubmit={(date) => {
                    setDefaultSubmitDate(date);
                    setActiveEmployeeTab('submit_timesheet');
                  }}
                  onNavigateToWeekendWork={() => setActiveEmployeeTab('weekend_work')}
                  onShowToast={showToast}
                />
              )}

              {activeEmployeeTab === 'my_projects' && (
                <MyProjects
                  currentUser={currentUser}
                  projects={projects}
                  allUsers={users}
                />
              )}

              {activeEmployeeTab === 'leave_management' && (
                <LeaveManagement
                  currentUser={currentUser}
                  leaveBalance={leaveBalance}
                  leaveRequests={leaveRequests}
                  leaveTypes={leaveTypes}
                  onApplyLeave={handleApplyLeave}
                  onCancelLeave={handleCancelLeave}
                  onShowToast={showToast}
                />
              )}

              {activeEmployeeTab === 'weekend_work' && (
                <WeekendWork
                  currentUser={currentUser}
                  projects={projects}
                  weekendRequests={weekendRequests}
                  holidays={holidays || []}
                  onRequestWeekendWork={handleRequestWeekendWork}
                  onShowToast={showToast}
                />
              )}
            </>
          )}

          {portalMode === 'pm' && (
            <>
              {activePmTab === 'pm_dashboard' && (
                <PMDashboard
                  currentUser={currentUser}
                  projects={projects}
                  allUsers={users}
                  timesheets={timesheets}
                  weekendRequests={weekendRequests}
                  onNavigateTab={(tab) => setActivePmTab(tab as PMTab)}
                  onShowToast={showToast}
                />
              )}

              {activePmTab === 'pm_my_projects' && (
                <PMMyProjects
                  currentUser={currentUser}
                  projects={projects}
                  allUsers={users}
                  clients={clients}
                  timesheets={timesheets}
                  onAddProject={handleAddProject}
                  onUpdateProject={handleUpdateProject}
                  onCreateClient={handleCreateClient}
                  onAssignUserToProject={handleAssignUserToProject}
                  onRemoveUserFromProject={handleRemoveUserFromProject}
                  onAddToolToMilestone={handleAddToolToMilestone}
                  onUpdateToolInProject={handleUpdateToolInProject}
                  onRemoveToolFromProject={handleRemoveToolFromProject}
                  onShowToast={showToast}
                />
              )}

              {activePmTab === 'pm_resource_allocation' && (
                <PMResourceAllocation
                  currentUser={currentUser}
                  projects={projects}
                  allUsers={users}
                  onAssignUserToProject={handleAssignUserToProject}
                  onRemoveUserFromProject={handleRemoveUserFromProject}
                  onAddToolToMilestone={handleAddToolToMilestone}
                  onUpdateToolInProject={handleUpdateToolInProject}
                  onRemoveToolFromProject={handleRemoveToolFromProject}
                  onShowToast={showToast}
                />
              )}

              {/* PM submits their own timesheets */}
              {activePmTab === 'pm_submit_timesheet' && (
                <SubmitTimesheet
                  currentUser={currentUser}
                  projects={projects}
                  timesheets={myTimesheets}
                  onNavigateTab={(tab) => setActivePmTab(tab as PMTab)}
                  projectAssignments={myProjectAssignments}
                  onSubmitTimesheet={handleTimesheetSubmit}
                  onUpdateTimesheet={handleUpdateTimesheet}
                  editingEntry={editingTimesheet}
                  defaultDate={defaultSubmitDate}
                  initialOpenMarkLeave={false}
                  onCloseMarkLeaveModal={() => { }}
                  onClearEditing={() => setEditingTimesheet(null)}
                  onShowToast={showToast}
                />
              )}

              {/* PM views and edits their own timesheet history */}
              {activePmTab === 'pm_timesheets_history' && (
                <TimesheetsHistory
                  currentUser={currentUser}
                  timesheets={myTimesheets}
                  projects={projects}
                  holidays={holidays || []}
                  onDeleteTimesheet={handleDeleteTimesheet}
                  onUpdateTimesheet={handleUpdateTimesheet}
                  onSubmitTimesheets={handleTimesheetSubmit}
                  onEditRequest={(entry) => {
                    setEditingTimesheet(entry);
                    setActivePmTab('pm_submit_timesheet');
                  }}
                  onNavigateToSubmit={(date) => {
                    setDefaultSubmitDate(date);
                    setActivePmTab('pm_submit_timesheet');
                  }}
                  onNavigateToWeekendWork={() => setActivePmTab('pm_weekend_work')}
                  onShowToast={showToast}
                />
              )}

              {activePmTab === 'pm_timesheet_review' && (
                <PMTimesheetReview
                  currentUser={currentUser}
                  projects={projects}
                  allUsers={users}
                  timesheets={timesheets}
                />
              )}

              {activePmTab === 'pm_weekend_work' && (
                <PMWeekendWorkRequests
                  currentUser={currentUser}
                  projects={projects}
                  allUsers={users}
                  weekendRequests={weekendRequests}
                  onApproveWeekendWork={handleApproveWeekendWork}
                  onRejectWeekendWork={handleRejectWeekendWork}
                  onShowToast={showToast}
                />
              )}
            </>
          )}

          {portalMode === 'ac_manager' && (
            <AccountManagerDashboard
              currentUser={currentUser}
              projects={projects}
              allUsers={users}
              timesheets={timesheets}
              activeTab={activeAcTab}
              onNavigateTab={(tab) => setActiveAcTab(tab)}
              onUpdateProjectBudget={handleUpdateProjectBudget}
              onAddToolToMilestone={handleAddToolToMilestone}
              onShowToast={showToast}
            />
          )}

          {portalMode === 'admin' && (
            <ErrorBoundary>
              <React.Suspense fallback={<div className="flex h-full items-center justify-center p-12 text-slate-400 font-medium animate-pulse">Loading admin module...</div>}>
                {activeAdminTab === 'admin_overview' && (
                  <AdminOverview
                    users={users}
                    projects={projects}
                    timesheets={timesheets}
                    leaveRequests={leaveRequests}
                    activities={activities}
                    onNavigateTab={(tab) => setActiveAdminTab(tab)}
                    onApproveLeave={handleApproveLeave}
                    onShowToast={showToast}
                  />
                )}

                {activeAdminTab === 'user_management' && (
                  <UserManagement
                    currentUser={currentUser}
                    onShowToast={showToast}
                  />
                )}

                {activeAdminTab === 'admin_tools' && (
                  <ToolsManagement
                    onShowToast={showToast}
                  />
                )}

                {activeAdminTab === 'admin_leave_approvals' && currentUser && (
                  <AdminLeaveApprovals
                    currentUser={currentUser}
                    users={users}
                    leaveRequests={leaveRequests}
                    onApproveLeave={handleApproveLeave}
                    onRejectLeave={handleRejectLeave}
                    onShowToast={showToast}
                  />
                )}

                {activeAdminTab === 'admin_holidays' && (
                  <HolidaysManagement
                    holidays={holidays}
                    onAddHoliday={handleAddHoliday}
                    onUpdateHoliday={handleEditHoliday}
                    onDeleteHoliday={handleDeleteHoliday}
                    onShowToast={showToast}
                  />
                )}

                {activeAdminTab === 'admin_leave_types' && (
                  <LeaveTypesManagement
                    leaveTypes={leaveTypes}
                    onAddLeaveType={handleAddLeaveType}
                    onUpdateLeaveType={handleEditLeaveType}
                    onToggleLeaveTypeStatus={handleToggleLeaveTypeStatus}
                    onShowToast={showToast}
                  />
                )}

                {activeAdminTab === 'admin_working_calendar' && (
                  <WorkingCalendar
                    config={workingCalendar}
                    onUpdateConfig={async (newConfig) => {
                      try {
                        await updateWorkingCalendar(newConfig).unwrap();
                        showToast('Success', 'Working calendar updated', 'success');
                      } catch (e: any) {
                        showToast('Action Failed', getErrorMessage(e, 'Failed to update working calendar'), 'error');
                      }
                    }}
                    onShowToast={showToast}
                  />
                )}
              </React.Suspense>
            </ErrorBoundary>
          )}
        </main>
      </div>
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}
