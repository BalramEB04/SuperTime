import { apiSlice } from '../apiSlice';
import { mapBackendUserToFrontendUser } from './authApi';
import {
  Project,
  TimesheetEntry,
  LeaveRequest,
  WeekendWorkRequest,
  User,
  Department,
  HolidayItem,
  LeaveTypeConfig,
  NotificationsResponse,
  UtilizationDashboardData,
  EmployeeUtilizationData,
  MilestoneUtilizationData,
} from '../../types';

// ---------------------------------------------------------------------------
// Type representing a backend project-assignment (minimal shape)
// ---------------------------------------------------------------------------
export interface ProjectAssignment {
  id: number;
  project_id: number;
  user_id: number;
  is_active: boolean;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Backend timesheet create payload — exactly what the backend expects
// ---------------------------------------------------------------------------
export interface TimesheetCreatePayload {
  project_assignment_id: number;
  milestone_id?: number;
  timesheet_date: string;
  billable_hours: number;
  billable_work_summary?: string;
  non_billable_hours: number;
  non_billable_work_summary?: string;
}

export interface DailyEodEntry {
  timesheet_id: number;
  date: string;
  employee_id: number;
  employee_name: string;
  employee_email: string;
  department: string;
  project_id: number | null;
  project_name: string;
  project_code: string;
  billable_hours: number;
  billable_work_summary: string;
  non_billable_hours: number;
  non_billable_work_summary: string;
  total_hours: number;
  status: string;
  submitted_at: string;
}

export interface DailyEodPreviewData {
  date: string;
  total_submissions: number;
  total_employees: number;
  total_billable_hours: number;
  total_non_billable_hours: number;
  grand_total_hours: number;
  entries: DailyEodEntry[];
}


// ---------------------------------------------------------------------------
// Helper: map a single raw backend timesheet => frontend TimesheetEntry
// ---------------------------------------------------------------------------
function mapBackendTimesheetToFrontend(t: any): TimesheetEntry {
  const billable = t.billable_hours ?? 0;
  const nonBillable = t.non_billable_hours ?? 0;
  
  return {
    id: String(t.id),
    userId: String(t.user_id),
    userName: t.user_name || 'Unknown User',
    userAvatar: t.user_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(t.user_name || 'User')}&background=random`,
    projectId: String(t.project_assignment?.project_id ?? ''),
    projectName: t.project_name || 'Unknown Project',
    date: t.timesheet_date,
    billableHours: billable,
    nonBillableHours: nonBillable,
    description: [
      t.billable_work_summary ? `[Billable] ${t.billable_work_summary}` : '',
      t.non_billable_work_summary ? `[Non-Billable] ${t.non_billable_work_summary}` : ''
    ].filter(Boolean).join(' | '),
    billableDescription: t.billable_work_summary ?? '',
    nonBillableDescription: t.non_billable_work_summary ?? '',
    category: t.category ?? 'Development',
    status: (t.status ?? 'submitted') as TimesheetEntry['status'],
    submittedAt: t.created_at ?? '',
    milestoneId: t.milestone_id ?? undefined,
    milestoneName: t.milestone_name ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Helper: map backend LeaveRequestResponse => frontend LeaveRequest
// ---------------------------------------------------------------------------
const LEAVE_TYPE_MAP: Record<number, LeaveRequest['type']> = {
  1: 'Annual Leave',
  2: 'Sick Leave',
  3: 'Annual Leave',   // EL maps to Annual
  4: 'Parental Leave',
  5: 'Compensatory Off',
};

function mapBackendLeaveToFrontend(r: any): LeaveRequest {
  // Resolve type from leave_type_id OR from nested leave_type.name
  const typeName = r.leave_type?.name ?? '';
  let type: LeaveRequest['type'] = 'Annual Leave';
  if (/sick/i.test(typeName)) type = 'Sick Leave';
  else if (/parental/i.test(typeName)) type = 'Parental Leave';
  else if (/comp|compensat/i.test(typeName)) type = 'Compensatory Off';
  else if (LEAVE_TYPE_MAP[r.leave_type_id]) type = LEAVE_TYPE_MAP[r.leave_type_id];

  const start = new Date(r.start_date);
  const end = new Date(r.end_date);
  const daysCount = Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );

  return {
    id: String(r.id),
    userId: String(r.user_id),
    userName: r.user ? `${r.user.first_name} ${r.user.last_name}` : '',
    userAvatar: '',
    type,
    startDate: r.start_date,
    endDate: r.end_date,
    daysCount,
    reason: r.reason ?? '',
    backupContact: '',
    isHalfDay: r.leave_duration_type === 'half_day',
    status: (r.status?.toLowerCase() ?? 'pending') as LeaveRequest['status'],
    appliedOn: r.created_at ? r.created_at.split('T')[0] : '',
    reviewedBy: r.manager ? `${r.manager.first_name} ${r.manager.last_name}` : undefined,
    reviewComment: r.rejection_reason ?? undefined,
    // Inline leave fields
    leaveDurationType: r.leave_duration_type ?? undefined,
    halfDayPeriod: r.half_day_period ?? undefined,
    partialStartTime: r.partial_start_time ?? undefined,
    partialEndTime: r.partial_end_time ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Backend payload for creating a leave request
// ---------------------------------------------------------------------------
export interface LeaveRequestCreatePayload {
  leave_type_id: number;
  start_date: string;  // YYYY-MM-DD
  end_date: string;    // YYYY-MM-DD
  reason: string;
}

// ---------------------------------------------------------------------------
// Mark leave from timesheet payload
// ---------------------------------------------------------------------------
export interface MarkLeavePayload {
  leave_type_id?: number;
  leave_duration_type: 'full_day' | 'half_day' | 'partial_day' | 'multiple_days';
  leave_date?: string;          // YYYY-MM-DD — for single-day leaves
  start_date?: string;          // YYYY-MM-DD — for multiple_days
  end_date?: string;            // YYYY-MM-DD — for multiple_days
  half_day_period?: 'first' | 'second';
  partial_start_time?: string;  // HH:MM
  partial_end_time?: string;    // HH:MM
  reason?: string;
}

export const dataApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // -----------------------------------------------------------------------
    // Clients
    // -----------------------------------------------------------------------
    getClients: builder.query<{ id: number; name: string }[], void>({
      query: () => '/clients',
      transformResponse: (res: any) => res.data || [],
      providesTags: ['Project'],
    }),
    createClient: builder.mutation<any, { name: string; contact_info?: string }>({
      query: (body) => ({ url: '/clients', method: 'POST', body }),
      invalidatesTags: ['Project'],
    }),

    // -----------------------------------------------------------------------
    // Projects
    // -----------------------------------------------------------------------
    getProjects: builder.query<Project[], void>({
      query: () => '/projects',
      transformResponse: (res: any) => {
        const items = res.data?.items || res.data || [];
        return items.map((p: any) => ({
          id: String(p.id),
          name: p.project_name,
          code: `PRJ-${p.id}`,
          client: p.client_name || '',
          project_manager_id: p.project_manager_id ? Number(p.project_manager_id) : undefined,
          pmName: p.project_manager_name || 'Unknown',
          pmAvatar: '',
          status: p.status || 'Milestone Planning',
            isActive: p.is_active ?? true,
            is_active: p.is_active ?? true,
          budget: p.budget || 0,
          loggedHours: 0,
          billableHours: 0,
          startDate: p.start_date || '',
          endDate: p.end_date || '',
          description: p.description || '',
          assignedUserIds: p.assigned_user_ids?.map(String) || [],
          milestones: p.milestones || [],
          completion_percentage: p.completion_percentage || 0,
          cost: p.cost || 0,
          revenue: p.revenue || 0,
          profit: p.profit || 0,
          earned_value: p.earned_value || 0,
          actual_cost: p.actual_cost || 0,
          budget_utilization_percentage: p.budget_utilization_percentage || 0,
          cost_utilization_percentage: p.cost_utilization_percentage || 0,
          cost_variance: p.cost_variance || 0,
          cpi: p.cpi || 0,
          forecast_cost: p.forecast_cost || 0,
          financial_status: p.financial_status,
          health: p.health,
          documents: p.documents?.map((d: any) => ({
            id: String(d.id),
            projectId: String(d.project_id),
            fileName: d.file_name,
            filePath: d.file_path,
            fileSize: d.file_size,
            fileType: d.file_type,
            uploadedAt: d.uploaded_at,
          })) || [],
          tools: p.tools?.map((t: any) => ({ 
            id: String(t.toolId || t.id), 
            allocationId: String(t.allocationId || t.allocation_id),
            milestoneId: String(t.milestoneId || t.milestone_id || ''),
            milestoneName: t.milestoneName || t.milestone_name || '',
            name: t.name || '', 
            category: t.category || '', 
            monthlyCost: t.monthlyCost || t.monthly_cost || 0,
            seats: t.seats || 1,
            allocationDate: t.allocationDate || t.allocation_date || '',
            deallocationDate: t.deallocationDate || t.deallocation_date || '',
            status: t.status || 'active'
          })) || [],
        }));
      },
      providesTags: ['Project'],
    }),
    createProject: builder.mutation<any, {
      client_id?: number; project_manager_id: number; project_name: string;
      description?: string; budget?: number; start_date?: string; end_date?: string;
    }>({
      query: (body) => ({ url: '/projects', method: 'POST', body }),
      invalidatesTags: ['Project'],
    }),
    uploadProjectDocument: builder.mutation<any, { projectId: string; file: File }>({
      query: ({ projectId, file }) => {
        const formData = new FormData();
        formData.append('file', file);
        return {
          url: `/projects/${projectId}/documents`,
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: ['Project'],
    }),
    deleteProjectDocument: builder.mutation<any, { projectId: string; documentId: string }>({
      query: ({ projectId, documentId }) => ({
        url: `/projects/${projectId}/documents/${documentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Project'],
    }),
    updateProject: builder.mutation<any, { id: string } & Partial<any>>({
      query: ({ id, ...body }) => ({ url: `/projects/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Project'],
    }),
    deleteProject: builder.mutation<void, string>({
      query: (id) => ({ url: `/projects/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Project'],
    }),

    // -----------------------------------------------------------------------
    // Milestones
    // -----------------------------------------------------------------------
    getMilestonesByProject: builder.query<any[], number>({
      query: (projectId) => `/milestones/project/${projectId}`,
      transformResponse: (res: any) => res.data || [],
      providesTags: ['Project'],
    }),
    createMilestone: builder.mutation<any, any>({
      query: (body) => ({ url: '/milestones', method: 'POST', body }),
      invalidatesTags: ['Project'],
    }),
    updateMilestone: builder.mutation<any, { id: number } & Partial<any>>({
      query: ({ id, ...body }) => ({ url: `/milestones/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Project'],
    }),
    deleteMilestone: builder.mutation<void, number>({
      query: (id) => ({ url: `/milestones/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Project'],
    }),

    // -----------------------------------------------------------------------
    // Project Assignments
    // -----------------------------------------------------------------------
    getMyProjectAssignments: builder.query<ProjectAssignment[], void>({
      query: () => '/project-assignments/user/me',
      transformResponse: (res: any) => res.data || [],
      providesTags: ['Project'],
    }),
    assignUserToProject: builder.mutation<any, { project_id: number; user_id: number }>({
      query: (body) => ({ url: '/project-assignments', method: 'POST', body }),
      invalidatesTags: ['Project'],
    }),
    batchAssignUsersToProjects: builder.mutation<any, { project_ids: number[]; user_ids: number[]; role?: string }>({
      query: (body) => ({ url: '/project-assignments/batch', method: 'POST', body }),
      invalidatesTags: ['Project'],
    }),
    removeUserFromProject: builder.mutation<void, { projectId: string; userId: string }>({
      query: ({ projectId, userId }) => ({ url: `/project-assignments/project/${projectId}/user/${userId}`, method: 'DELETE' }),
      invalidatesTags: ['Project'],
    }),

    // -----------------------------------------------------------------------
    // Tools (Admin Master Catalog & Allocation)
    // -----------------------------------------------------------------------
    getTools: builder.query<import('../../types').MasterTool[], void>({
      query: () => '/tools',
      transformResponse: (res: any) => {
        const items = res.data?.items || res.data || [];
        return items.map((t: any) => ({
          id: String(t.id),
          name: t.name,
          category: t.category,
          cost_per_month: t.cost_per_month || 0,
          status: t.status || 'Active',
          created_at: t.created_at || '',
        }));
      },
      providesTags: ['Tool' as any],
    }),
    createTool: builder.mutation<import('../../types').MasterTool, { name: string; category: string; cost_per_month?: number; status?: string }>({
      query: (body) => ({ url: '/tools', method: 'POST', body }),
      transformResponse: (res: any) => res.data || res,
      invalidatesTags: ['Tool' as any],
    }),
    updateTool: builder.mutation<import('../../types').MasterTool, { id: string; name?: string; category?: string; cost_per_month?: number; status?: string }>({
      query: ({ id, ...body }) => ({ url: `/tools/${id}`, method: 'PUT', body }),
      transformResponse: (res: any) => res.data || res,
      invalidatesTags: ['Tool' as any, 'Project'],
    }),
    deleteTool: builder.mutation<void, string>({
      query: (id) => ({ url: `/tools/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Tool' as any, 'Project'],
    }),
    allocateTool: builder.mutation<any, { tool_id: number; milestone_id: number; monthly_cost?: number; seats?: number; allocation_date: string; deallocation_date: string; allocation_basis?: string }>({
      query: (body) => ({ url: '/tool-allocations', method: 'POST', body }),
      invalidatesTags: ['Project'],
    }),
    updateToolAllocation: builder.mutation<any, { id: string | number; monthly_cost?: number; seats?: number; allocation_date?: string; deallocation_date?: string; allocation_basis?: string; status?: string }>({
      query: ({ id, ...body }) => ({ url: `/tool-allocations/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Project'],
    }),
    deallocateTool: builder.mutation<void, string>({
      query: (allocationId) => ({ url: `/tool-allocations/${allocationId}/deallocate`, method: 'PUT' }),
      invalidatesTags: ['Project'],
    }),

    // -----------------------------------------------------------------------
    // Timesheets
    // -----------------------------------------------------------------------
    getTimesheets: builder.query<TimesheetEntry[], void>({
      query: () => '/timesheets/me',
      transformResponse: (res: any) => {
        const items: any[] = res.data?.items || res.data || [];
        return items.map(mapBackendTimesheetToFrontend);
      },
      providesTags: ['Timesheet'],
    }),

    getManagedTimesheets: builder.query<TimesheetEntry[], void>({
      query: () => '/timesheets/managed',
      transformResponse: (res: any) => {
        const items: any[] = res.data?.items || res.data || [];
        return items.map(mapBackendTimesheetToFrontend);
      },
      providesTags: ['Timesheet'],
    }),

    createTimesheet: builder.mutation<TimesheetEntry, TimesheetCreatePayload>({
      query: (payload) => ({
        url: '/timesheets',
        method: 'POST',
        body: payload,
      }),
      transformResponse: (res: any) => mapBackendTimesheetToFrontend(res.data),
      invalidatesTags: ['Timesheet'],
    }),

    createTimesheets: builder.mutation<void, TimesheetCreatePayload[]>({
      queryFn: async (entries, _api, _extraOptions, baseQuery) => {
        for (const entry of entries) {
          const result = await baseQuery({
            url: '/timesheets',
            method: 'POST',
            body: entry,
          });
          if (result.error) return { error: result.error };
        }
        return { data: undefined };
      },
      invalidatesTags: ['Timesheet'],
    }),

    updateTimesheet: builder.mutation<
      void,
      {
        id: string;
        billable_hours?: number;
        non_billable_hours?: number;
        billable_work_summary?: string;
        non_billable_work_summary?: string;
        timesheet_date?: string;
        milestone_id?: number | null;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/timesheets/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Timesheet'],
    }),

    deleteTimesheet: builder.mutation<void, string>({
      query: (id) => ({
        url: `/timesheets/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Timesheet'],
    }),

    // -----------------------------------------------------------------------
    // Leave Requests
    // -----------------------------------------------------------------------
    getLeaveRequests: builder.query<LeaveRequest[], void>({
      query: () => '/leave-requests',
      transformResponse: (res: any) => {
        const items: any[] = res.data?.items || res.data || [];
        return items.map(mapBackendLeaveToFrontend);
      },
      providesTags: ['LeaveRequest'],
    }),
    getMyLeaveRequests: builder.query<LeaveRequest[], void>({
      query: () => '/leave-requests/me',
      transformResponse: (res: any) => {
        const items: any[] = res.data?.items || res.data || [];
        return items.map(mapBackendLeaveToFrontend);
      },
      providesTags: ['LeaveRequest'],
    }),
    /** Create a leave request — expects the backend payload shape. */
    createLeaveRequest: builder.mutation<void, LeaveRequestCreatePayload>({
      query: (body) => ({
        url: '/leave-requests',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['LeaveRequest', 'LeaveBalance'],
    }),
    /** Approve a leave request (Admin only) — PUT /leave-requests/{id}/approve */
    approveLeaveRequest: builder.mutation<void, { id: string; comment?: string }>({
      query: ({ id }) => ({
        url: `/leave-requests/${id}/approve`,
        method: 'PUT',
      }),
      invalidatesTags: ['LeaveRequest'],
    }),
    /** Reject a leave request (Admin only) — PUT /leave-requests/{id}/reject */
    rejectLeaveRequest: builder.mutation<void, { id: string; rejection_reason?: string }>({
      query: ({ id, rejection_reason }) => ({
        url: `/leave-requests/${id}/reject`,
        method: 'PUT',
        body: rejection_reason ? { rejection_reason } : {},
      }),
      invalidatesTags: ['LeaveRequest'],
    }),
    /** Cancel own pending leave — DELETE /leave-requests/{id}/cancel */
    cancelLeaveRequest: builder.mutation<void, string>({
      query: (id) => ({
        url: `/leave-requests/${id}/cancel`,
        method: 'DELETE',
      }),
      invalidatesTags: ['LeaveRequest', 'LeaveBalance'],
    }),
    /** Mark leave directly from the timesheet — POST /leave-requests/mark-from-timesheet */
    markLeaveFromTimesheet: builder.mutation<any[], MarkLeavePayload>({
      query: (body) => ({
        url: '/leave-requests/mark-from-timesheet',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['LeaveRequest', 'LeaveBalance'],
    }),
    /** Check leave status for a specific date — GET /leave-requests/check-date */
    getUpcomingLeaves: builder.query<any[], void>({
      query: () => '/leave-requests/upcoming',
      transformResponse: (res: any) => res.data || res || [],
      providesTags: ['LeaveRequest'],
    }),
    getLeaveForDate: builder.query<import('../../types').LeaveStatusForDate, string>({
      query: (date) => `/leave-requests/check-date?date=${date}`,
      transformResponse: (res: any) => res.data || res,
      providesTags: ['LeaveRequest'],
    }),
    /** @deprecated kept for compat, use approveLeaveRequest / rejectLeaveRequest */
    updateLeaveStatus: builder.mutation<void, { id: string; status: string; comment?: string }>({
      query: ({ id, ...body }) => ({
        url: `/leave-requests/${id}/status`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['LeaveRequest'],
    }),

    // -----------------------------------------------------------------------
    // Leave Balances
    // -----------------------------------------------------------------------
    /**
     * Fetch the logged-in user's leave balances and map the backend array
     * ({ leave_type_id, allocated_days, used_days }) into the frontend LeaveBalance shape.
     * Leave type IDs are resolved dynamically against the leave_type.name when available.
     */
    getMyLeaveBalances: builder.query<import('../../types').LeaveBalance, void>({
      query: () => '/leave-balances/me',
      transformResponse: (res: any) => {
        const items: any[] = res.data || [];
        // Helper to find value by leave type name (case-insensitive)
        const findDays = (namePattern: RegExp, field: 'allocated_days' | 'used_days') => {
          const match = items.find((b) =>
            namePattern.test(b.leave_type?.name ?? '')
          );
          return match ? (match[field] ?? 0) : 0;
        };
        // Fall back to leave_type_id when no name is available
        const findById = (id: number, field: 'allocated_days' | 'used_days') => {
          const match = items.find((b) => b.leave_type_id === id);
          return match ? (match[field] ?? 0) : 0;
        };

        const hasNames = items.some((b) => b.leave_type?.name);

        return {
          annualLeaveTotal: hasNames ? findDays(/annual|earned|privilege|el/i, 'allocated_days') : findById(3, 'allocated_days'),
          annualLeaveUsed: hasNames ? findDays(/annual|earned|privilege|el/i, 'used_days') : findById(3, 'used_days'),
          sickLeaveTotal: hasNames ? findDays(/sick/i, 'allocated_days') : findById(2, 'allocated_days'),
          sickLeaveUsed: hasNames ? findDays(/sick/i, 'used_days') : findById(2, 'used_days'),
          parentalLeaveTotal: hasNames ? findDays(/parental|maternity|paternity/i, 'allocated_days') : findById(4, 'allocated_days'),
          parentalLeaveUsed: hasNames ? findDays(/parental|maternity|paternity/i, 'used_days') : findById(4, 'used_days'),
          compOffTotal: hasNames ? findDays(/comp|compensat/i, 'allocated_days') : findById(5, 'allocated_days'),
          compOffUsed: hasNames ? findDays(/comp|compensat/i, 'used_days') : findById(5, 'used_days'),
        };
      },
      providesTags: ['LeaveBalance'],
    }),

    // -----------------------------------------------------------------------
    // Weekend Requests
    // -----------------------------------------------------------------------
    getWeekendRequests: builder.query<WeekendWorkRequest[], void>({
      query: () => '/weekend-work/me',
      transformResponse: (res: any) => {
        const items = res.data?.items || res.data || [];
        return items.map((w: any) => ({
          id: String(w.id),
          userId: String(w.project_assignment?.user_id || ''),
          userName: w.user_name || '',
          userAvatar: w.user_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(w.user_name || 'User')}&background=random`,
          projectId: String(w.project_assignment?.project_id || ''),
          projectName: w.project_name || '',
          workDate: w.work_date,
          plannedHours: w.planned_hours || 0,
          billableHours: w.billable_hours || 0,
          billableWorkSummary: w.billable_work_summary || '',
          nonBillableHours: w.non_billable_hours || 0,
          nonBillableWorkSummary: w.non_billable_work_summary || '',
          deliverableObjective: w.reason,
          status: w.status?.toLowerCase(),
          requestedOn: w.created_at ? w.created_at.split('T')[0] : '',
          reviewedBy: w.approver ? `${w.approver.first_name} ${w.approver.last_name}` : undefined,
        }));
      },
      providesTags: ['WeekendWork'],
    }),
    getManagedWeekendRequests: builder.query<WeekendWorkRequest[], void>({
      query: () => '/weekend-work/managed',
      transformResponse: (res: any) => {
        const items = res.data?.items || res.data || [];
        return items.map((w: any) => ({
          id: String(w.id),
          userId: String(w.project_assignment?.user_id || ''),
          userName: w.user_name || '',
          userAvatar: w.user_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(w.user_name || 'User')}&background=random`,
          projectId: String(w.project_assignment?.project_id || ''),
          projectName: w.project_name || '',
          workDate: w.work_date,
          plannedHours: w.planned_hours || 0,
          billableHours: w.billable_hours || 0,
          billableWorkSummary: w.billable_work_summary || '',
          nonBillableHours: w.non_billable_hours || 0,
          nonBillableWorkSummary: w.non_billable_work_summary || '',
          deliverableObjective: w.reason,
          status: w.status?.toLowerCase(),
          requestedOn: w.created_at ? w.created_at.split('T')[0] : '',
          reviewedBy: w.approver ? `${w.approver.first_name} ${w.approver.last_name}` : undefined,
        }));
      },
      providesTags: ['WeekendWork'],
    }),
    submitWeekendWork: builder.mutation<void, {
      project_assignment_id: number;
      work_date: string;
      planned_hours?: number;
      billable_hours?: number;
      billable_work_summary?: string;
      non_billable_hours?: number;
      non_billable_work_summary?: string;
      reason: string;
    }>({
      query: (body) => ({ url: '/weekend-work', method: 'POST', body }),
      invalidatesTags: ['WeekendWork'],
    }),
    approveWeekendWork: builder.mutation<void, { id: string }>({
      query: ({ id }) => ({ url: `/weekend-work/${id}/approve`, method: 'PUT' }),
      invalidatesTags: ['WeekendWork', 'Timesheet', 'Project'],
    }),
    rejectWeekendWork: builder.mutation<void, { id: string; rejection_reason?: string }>({
      query: ({ id, ...body }) => ({ url: `/weekend-work/${id}/reject`, method: 'PUT', body }),
      invalidatesTags: ['WeekendWork'],
    }),
    cancelWeekendWork: builder.mutation<void, string>({
      query: (id) => ({ url: `/weekend-work/${id}/cancel`, method: 'DELETE' }),
      invalidatesTags: ['WeekendWork'],
    }),

    // -----------------------------------------------------------------------
    // Users
    // -----------------------------------------------------------------------
    
    // -----------------------------------------------------------------------
    // Departments
    // -----------------------------------------------------------------------
    getDepartments: builder.query<Department[], boolean | void>({
      query: (activeOnly = true) => `/departments?active_only=${activeOnly !== false}`,
      transformResponse: (res: any) => {
        const items = res.data || [];
        return items.map((d: any) => ({
          id: d.id,
          name: d.name,
          code: d.code,
          description: d.description,
          isActive: d.is_active,
          employeeCount: d.employee_count || 0,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        }));
      },
      providesTags: ['Department'],
    }),
    createDepartment: builder.mutation<Department, Partial<Department>>({
      query: (body) => ({
        url: '/departments',
        method: 'POST',
        body: {
          name: body.name,
          code: body.code,
          description: body.description,
        },
      }),
      invalidatesTags: ['Department', 'User'],
    }),
    updateDepartment: builder.mutation<Department, { id: number; data: Partial<Department> }>({
      query: ({ id, data }) => ({
        url: `/departments/${id}`,
        method: 'PUT',
        body: {
          name: data.name,
          code: data.code,
          description: data.description,
          is_active: data.isActive,
        },
      }),
      invalidatesTags: ['Department', 'User'],
    }),
    deleteDepartment: builder.mutation<void, number>({
      query: (id) => ({
        url: `/departments/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Department', 'User'],
    }),

    getUsers: builder.query<User[], void>({
      query: () => '/users',
      transformResponse: (res: any) => {
        const items = res.data?.items || res.data || [];
        return items.map(mapBackendUserToFrontendUser);
      },
      providesTags: ['User'],
    }),
    createUser: builder.mutation<User, any>({
      query: (body) => ({ url: '/users', method: 'POST', body }),
      invalidatesTags: ['User'],
    }),
    updateUser: builder.mutation<User, any>({
      query: ({ id, ...body }) => ({ url: `/users/${id}`, method: 'PUT', body }),
      invalidatesTags: ['User'],
    }),
    deleteUser: builder.mutation<void, string>({
      query: (id) => ({ url: `/users/${id}`, method: 'DELETE' }),
      invalidatesTags: ['User'],
    }),

    // -----------------------------------------------------------------------
    // Holidays
    // -----------------------------------------------------------------------
    getHolidays: builder.query<HolidayItem[], void>({
      query: () => '/holidays',
      transformResponse: (res: any) => {
        const items = Array.isArray(res) ? res : (res.data || []);
        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return items.map((h: any) => {
          const dateObj = new Date(h.date);
          return {
            ...h,
            month: months[dateObj.getMonth()],
            day: String(dateObj.getDate()).padStart(2, '0'),
            dayOfWeek: days[dateObj.getDay()],
          };
        });
      },
      providesTags: ['Holiday'],
    }),
    createHoliday: builder.mutation<HolidayItem, Omit<HolidayItem, 'id'>>({
      query: (body) => ({ 
        url: '/holidays', 
        method: 'POST', 
        body: {
          name: body.name,
          date: body.date,
          type: body.type,
          description: body.description,
          is_mandatory: body.is_mandatory,
        }
      }),
      invalidatesTags: ['Holiday'],
    }),
    updateHoliday: builder.mutation<HolidayItem, Partial<HolidayItem> & { id: string }>({
      query: ({ id, ...body }) => ({ 
        url: `/holidays/${id}`, 
        method: 'PUT', 
        body: {
          name: body.name,
          date: body.date,
          type: body.type,
          description: body.description,
          is_mandatory: body.is_mandatory,
        }
      }),
      invalidatesTags: ['Holiday'],
    }),
    deleteHoliday: builder.mutation<void, string>({
      query: (id) => ({ url: `/holidays/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Holiday'],
    }),

    // -----------------------------------------------------------------------
    // Leave Types
    // -----------------------------------------------------------------------
    getLeaveTypes: builder.query<LeaveTypeConfig[], void>({
      query: () => '/leave-types?active_only=false',
      transformResponse: (res: any) => {
        const items = Array.isArray(res) ? res : (res.data || []);
        return items.map((lt: any) => ({
          id: String(lt.id),
          name: lt.name,
          code: lt.code,
          daysPerYear: lt.days_per_year,
          allocatedHours: lt.allocated_hours,
          isPaid: lt.is_paid,
          description: lt.description,
          requiresDocument: lt.requires_document,
          status: lt.is_active ? 'active' : 'inactive',
        }));
      },
      providesTags: ['LeaveType'],
    }),
    createLeaveType: builder.mutation<LeaveTypeConfig, Omit<LeaveTypeConfig, 'id' | 'status'>>({
      query: (body) => ({ 
        url: '/leave-types', 
        method: 'POST', 
        body: {
          name: body.name,
          code: body.code,
          days_per_year: body.daysPerYear,
          allocated_hours: body.allocatedHours,
          is_paid: body.isPaid,
          requires_document: body.requiresDocument,
          description: body.description,
        }
      }),
      invalidatesTags: ['LeaveType'],
    }),
    updateLeaveType: builder.mutation<LeaveTypeConfig, Partial<LeaveTypeConfig> & { id: string }>({
      query: ({ id, ...body }) => ({ 
        url: `/leave-types/${id}`, 
        method: 'PUT', 
        body: {
          name: body.name,
          code: body.code,
          days_per_year: body.daysPerYear,
          allocated_hours: body.allocatedHours,
          is_paid: body.isPaid,
          requires_document: body.requiresDocument,
          description: body.description,
          is_active: body.status !== undefined ? body.status === 'active' : undefined,
        }
      }),
      invalidatesTags: ['LeaveType'],
    }),
    deleteLeaveType: builder.mutation<void, string>({
      query: (id) => ({ url: `/leave-types/${id}`, method: 'DELETE' }),
      invalidatesTags: ['LeaveType'],
    }),

    // -----------------------------------------------------------------------
    // Roles
    // -----------------------------------------------------------------------
    getRoles: builder.query<any[], void>({
      query: () => '/roles',
      transformResponse: (res: any) => res.data || [],
    }),

    // -----------------------------------------------------------------------
    // Dashboard
    // -----------------------------------------------------------------------
    getDashboardSummary: builder.query<any, void>({
      query: () => '/dashboard/summary',
      transformResponse: (res: any) => res.data || {},
    }),

    // -----------------------------------------------------------------------
    // Working Calendar
    // -----------------------------------------------------------------------
    getWorkingCalendar: builder.query<import('../../types').WorkingCalendarConfig, void>({
      query: () => '/working-calendar',
      transformResponse: (res: any) => {
        const data = res.data || res;
        return {
          fullDayHours: data.full_day_hours,
          halfDayHours: data.half_day_hours,
          partialDayMinHours: data.partial_day_min_hours,
          partialDayMaxHours: data.partial_day_max_hours,
          workingDays: data.working_days,
          timeZone: data.time_zone,
          timesheetLockHours: data.timesheet_lock_hours ?? 24,
        };
      },
      providesTags: ['WorkingCalendar' as any],
    }),
    updateWorkingCalendar: builder.mutation<import('../../types').WorkingCalendarConfig, import('../../types').WorkingCalendarConfig>({
      query: (body) => ({
        url: '/working-calendar',
        method: 'PUT',
        body: {
          full_day_hours: body.fullDayHours,
          half_day_hours: body.halfDayHours,
          partial_day_min_hours: body.partialDayMinHours,
          partial_day_max_hours: body.partialDayMaxHours,
          working_days: body.workingDays,
          time_zone: body.timeZone,
          timesheet_lock_hours: body.timesheetLockHours ?? 24,
        },
      }),
      invalidatesTags: ['WorkingCalendar' as any],
    }),
    // -----------------------------------------------------------------------
    // Settings
    // -----------------------------------------------------------------------
    getSettings: builder.query<import('../../types').SystemSettingsConfig, void>({
      query: () => '/settings',
      transformResponse: (res: any) => {
        const data = res.data || res;
        return {
          orgName: data.org_name,
          orgRegId: data.org_reg_id,
          contactEmail: data.contact_email,
          companyLogoUrl: data.company_logo_url,
          timeZone: data.time_zone,
          emailNotifications: data.email_notifications,
          timesheetApprovalReminders: data.timesheet_approval_reminders,
          leaveRequestAlerts: data.leave_request_alerts,
          primaryColor: data.primary_color,
        };
      },
      providesTags: ['Settings' as any],
    }),
    updateSettings: builder.mutation<import('../../types').SystemSettingsConfig, import('../../types').SystemSettingsConfig>({
      query: (body) => ({
        url: '/settings',
        method: 'PUT',
        body: {
          org_name: body.orgName,
          org_reg_id: body.orgRegId,
          contact_email: body.contactEmail,
          company_logo_url: body.companyLogoUrl,
          time_zone: body.timeZone,
          email_notifications: body.emailNotifications,
          timesheet_approval_reminders: body.timesheetApprovalReminders,
          leave_request_alerts: body.leaveRequestAlerts,
          primary_color: body.primaryColor,
        },
      }),
      invalidatesTags: ['Settings' as any],
    }),
    // -----------------------------------------------------------------------
    // Analytics
    // -----------------------------------------------------------------------
    getTeamUtilization: builder.query<any, void>({
      query: () => '/analytics/team-utilization',
      transformResponse: (res: any) => res.data || {},
      providesTags: ['Timesheet', 'User'],
    }),
    getProjectFinancials: builder.query<any, void>({
      query: () => '/analytics/project-financials',
      transformResponse: (res: any) => res.data || {},
      providesTags: ['Project', 'Timesheet'],
    }),

    // -----------------------------------------------------------------------
    // Employee Utilization
    // -----------------------------------------------------------------------
    getUtilizationDashboard: builder.query<UtilizationDashboardData, { project_id?: number; milestone_id?: number; milestone_status?: string } | void>({
      query: (params) => {
        const p = params || {};
        const qs = new URLSearchParams();
        if (p.project_id) qs.append('project_id', String(p.project_id));
        if (p.milestone_id) qs.append('milestone_id', String(p.milestone_id));
        if (p.milestone_status) qs.append('milestone_status', p.milestone_status);
        const qStr = qs.toString();
        return `/utilization/dashboard${qStr ? `?${qStr}` : ''}`;
      },
      transformResponse: (res: any) => res.data || {},
      providesTags: ['Project', 'Timesheet'],
    }),
    getEmployeeUtilization: builder.query<EmployeeUtilizationData, { project_id?: number; milestone_id?: number; milestone_status?: string } | void>({
      query: (params) => {
        const p = params || {};
        const qs = new URLSearchParams();
        if (p.project_id) qs.append('project_id', String(p.project_id));
        if (p.milestone_id) qs.append('milestone_id', String(p.milestone_id));
        if (p.milestone_status) qs.append('milestone_status', p.milestone_status);
        const qStr = qs.toString();
        return `/utilization/employees${qStr ? `?${qStr}` : ''}`;
      },
      transformResponse: (res: any) => res.data || {},
      providesTags: ['Project', 'Timesheet'],
    }),
    getMilestoneUtilization: builder.query<MilestoneUtilizationData, { project_id?: number; milestone_id?: number; milestone_status?: string } | void>({
      query: (params) => {
        const p = params || {};
        const qs = new URLSearchParams();
        if (p.project_id) qs.append('project_id', String(p.project_id));
        if (p.milestone_id) qs.append('milestone_id', String(p.milestone_id));
        if (p.milestone_status) qs.append('milestone_status', p.milestone_status);
        const qStr = qs.toString();
        return `/utilization/milestones${qStr ? `?${qStr}` : ''}`;
      },
      transformResponse: (res: any) => res.data || {},
      providesTags: ['Project', 'Timesheet'],
    }),

    // -----------------------------------------------------------------------
    // Notifications
    // -----------------------------------------------------------------------
    getNotifications: builder.query<NotificationsResponse, void>({
      query: () => '/notifications',
      transformResponse: (res: any) => res.data || { notifications: [], unread_count: 0 },
      // Invalidate whenever leave / weekend work data changes
      providesTags: ['LeaveRequest', 'WeekendWork', 'Timesheet'],
    }),
    clearNotifications: builder.mutation<void, void>({
      query: () => ({ url: '/notifications/clear-all', method: 'DELETE' }),
      invalidatesTags: ['LeaveRequest', 'WeekendWork', 'Timesheet'],
    }),

    // -----------------------------------------------------------------------
    // Daily EOD Report Preview
    // -----------------------------------------------------------------------
        sendDailyEodToSlack: builder.mutation<{ ok: boolean; message: string }, { date?: string }>({
      query: (params) => {
        const d = params?.date;
        return {
          url: `/reports/daily-eod/slack-notify${d ? `?date=${d}` : ''}`,
          method: 'POST',
        };
      },
    }),
    getDailyEodPreview: builder.query<DailyEodPreviewData, string | void>({
      query: (date) => (date ? `/reports/daily-eod/preview?date=${date}` : '/reports/daily-eod/preview'),
      transformResponse: (res: any) =>
        res.data || {
          date: '',
          total_submissions: 0,
          total_employees: 0,
          total_billable_hours: 0,
          total_non_billable_hours: 0,
          grand_total_hours: 0,
          entries: [],
        },
      providesTags: ['Timesheet'],
    }),
  }),
});

export const {
  useGetDepartmentsQuery,
  useCreateDepartmentMutation,
  useUpdateDepartmentMutation,
  useDeleteDepartmentMutation,
  // Clients
  useGetClientsQuery,
  useCreateClientMutation,
  // Projects
  useGetProjectsQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useUploadProjectDocumentMutation,
  useDeleteProjectDocumentMutation,
  // Milestones
  useGetMilestonesByProjectQuery,
  useCreateMilestoneMutation,
  useUpdateMilestoneMutation,
  useDeleteMilestoneMutation,
  // Assignments
  useGetMyProjectAssignmentsQuery,
  useAssignUserToProjectMutation,
  useBatchAssignUsersToProjectsMutation,
  useRemoveUserFromProjectMutation,
  // Tools
  useGetToolsQuery,
  useCreateToolMutation,
  useUpdateToolMutation,
  useDeleteToolMutation,
  useAllocateToolMutation,
  useUpdateToolAllocationMutation,
  useDeallocateToolMutation,
  // Timesheets
  useGetTimesheetsQuery,
  useGetManagedTimesheetsQuery,
  useCreateTimesheetMutation,
  useCreateTimesheetsMutation,
  useUpdateTimesheetMutation,
  useDeleteTimesheetMutation,
  // Leave
  useGetLeaveRequestsQuery,
  useGetUpcomingLeavesQuery,
  useGetMyLeaveRequestsQuery,
  useCreateLeaveRequestMutation,
  useApproveLeaveRequestMutation,
  useRejectLeaveRequestMutation,
  useCancelLeaveRequestMutation,
  useUpdateLeaveStatusMutation,
  useGetMyLeaveBalancesQuery,
  useMarkLeaveFromTimesheetMutation,
  useGetLeaveForDateQuery,
  // Weekend
  useGetWeekendRequestsQuery,
  useGetManagedWeekendRequestsQuery,
  useSubmitWeekendWorkMutation,
  useApproveWeekendWorkMutation,
  useRejectWeekendWorkMutation,
  useCancelWeekendWorkMutation,
  // Users
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  // Holidays
  useGetHolidaysQuery,
  useCreateHolidayMutation,
  useUpdateHolidayMutation,
  useDeleteHolidayMutation,
  // Leave Types
  useGetLeaveTypesQuery,
  useCreateLeaveTypeMutation,
  useUpdateLeaveTypeMutation,
  useDeleteLeaveTypeMutation,
  // Misc
  useGetRolesQuery,
  useGetDashboardSummaryQuery,
  useGetWorkingCalendarQuery,
  useUpdateWorkingCalendarMutation,
  useGetSettingsQuery,
  useUpdateSettingsMutation,
  useGetTeamUtilizationQuery,
  useGetProjectFinancialsQuery,
  useGetNotificationsQuery,
  useClearNotificationsMutation,
  // Employee Utilization
  useGetUtilizationDashboardQuery,
  useGetEmployeeUtilizationQuery,
  useGetMilestoneUtilizationQuery,
  useGetDailyEodPreviewQuery,
  useSendDailyEodToSlackMutation,
} = dataApi;




