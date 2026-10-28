export interface ProjectDocument {
  id: string;
  projectId?: string;
  fileName: string;
  filePath: string;
  fileSize?: number;
  fileType?: string;
  uploadedAt?: string;
}

/// <reference types="vite/client" />

export type UserRole = 'employee' | 'pm' | 'ac_manager' | 'admin';
export type ActivePortalMode = 'employee' | 'pm' | 'ac_manager' | 'admin';


export interface Department {
  id: number;
  name: string;
  code?: string;
  description?: string;
  isActive: boolean;
  employeeCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  departmentId?: number;
  departmentName?: string;
  id: string;
  employee_id?: string;
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
  department: string;
  title: string;
  status: 'active' | 'inactive' | 'on_leave' | 'resigned' | 'pending';
  joinDate: string;
  allocatedProjectsCount: number;
  ctc?: number;
}

export interface HolidayItem {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  month: string;
  day: string;
  dayOfWeek: string;
  type: 'National' | 'Global' | 'Regional' | 'Observance' | 'Other';
  description?: string;
  is_mandatory: boolean;
}

export interface LeaveTypeConfig {
  id: string;
  name: string;
  code: string;
  daysPerYear: number;
  isPaid: boolean;
  status: 'active' | 'inactive';
  description: string;
  requiresDocument?: boolean;
  allocatedHours?: number;
}

export interface WorkingCalendarConfig {
  fullDayHours: number;
  halfDayHours: number;
  partialDayMinHours: number;
  partialDayMaxHours: number;
  workingDays: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
  timeZone: string;
  timesheetLockHours?: number;
}

export interface SystemSettingsConfig {
  orgName: string;
  orgRegId: string;
  contactEmail: string;
  companyLogoUrl: string;
  timeZone: string;
  emailNotifications: boolean;
  timesheetApprovalReminders: boolean;
  leaveRequestAlerts: boolean;
  primaryColor: string;
}

export interface MasterTool {
  id: string;
  name: string;
  category: 'Cloud' | 'Design' | 'Dev' | 'AI' | 'SaaS' | 'Testing' | string;
  cost_per_month?: number;
  status: 'Active' | 'Inactive' | string;
  created_at?: string;
}

export interface ProjectTool {
  id: string;
  allocationId?: string;
  milestoneId?: string;
  milestoneName?: string;
  name: string;
  category: 'Cloud' | 'Design' | 'Dev' | 'AI' | 'SaaS' | 'Testing' | string;
  monthlyCost: number;
  seats: number;
  assignedUsersCount?: number;
  allocationDate?: string;
  deallocationDate?: string;
  status?: 'active' | 'deallocated' | 'Active' | 'Inactive';
}

export interface MilestoneAssignment {
  id: number;
  milestone_id: number;
  user_id: number;
  user?: User;
  is_active: boolean;
}

export interface Milestone {
  id: number;
  project_id: number;
  name: string;
  description?: string;
  start_date?: string;
  expected_completion_date?: string;
  budget?: number;
  status: 'planned' | 'in_progress' | 'achieved';
  weight_percentage: number;
  actual_achievement_date?: string;
  completion_percentage: number;
  actual_start_date?: string;
  planned_duration_days?: number;
  actual_duration_days?: number;
  delay_days?: number;
  earned_value?: number;
  planned_value?: number;
  actual_cost?: number;
  forecast_cost?: number;
  cpi?: number;
  cost_variance?: number;
  assignments?: MilestoneAssignment[];
}

export interface Project {
  id: string;
  name: string;
  code: string;
  client: string;
  accountManagerName?: string;
  pmName: string;
  pmAvatar: string;
  status: 'Milestone Planning' | 'Design' | 'Development' | 'UAT' | 'Completed' | 'active' | 'completed' | 'on_hold' | 'planning' | string;
  isActive?: boolean;
  is_active?: boolean;
  budget: number; // in INR ₹
  loggedHours: number;
  billableHours: number;
  startDate: string;
  endDate: string;
  description: string;
  tools: ProjectTool[];
  assignedUserIds: string[];
  milestones?: Milestone[];
  completion_percentage?: number;
  cost?: number;
  revenue?: number;
  profit?: number;
  earned_value?: number;
  actual_cost?: number;
  budget_utilization_percentage?: number;
  cost_utilization_percentage?: number;
  cost_variance?: number;
  cpi?: number;
  forecast_cost?: number;
  financial_status?: string;
  health?: string;
  documents?: ProjectDocument[];
}

export interface TimesheetEntry {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  projectId: string;
  projectName: string;
  date: string; // YYYY-MM-DD
  billableHours: number;
  nonBillableHours: number;
  description: string; // Combined summary or main task
  billableDescription?: string; // Separate description for billable work
  nonBillableDescription?: string; // Separate description for non-billable work
  category: 'Development' | 'Design' | 'Meeting' | 'Code Review' | 'Testing' | 'Documentation' | 'DevOps';
  status: 'submitted' | 'approved' | 'rejected' | 'pending';
  submittedAt?: string;
  rejectionReason?: string;
  milestoneId?: number;
  milestoneName?: string;
}

export interface LeaveBalance {
  annualLeaveTotal: number;
  annualLeaveUsed: number;
  sickLeaveTotal: number;
  sickLeaveUsed: number;
  parentalLeaveTotal: number;
  parentalLeaveUsed: number;
  compOffTotal: number;
  compOffUsed: number;
}

export interface LeaveRequest {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  type: 'Annual Leave' | 'Sick Leave' | 'Parental Leave' | 'Compensatory Off';
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  daysCount: number;
  reason: string;
  backupContact?: string;
  isHalfDay?: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  appliedOn: string;
  reviewedBy?: string;
  reviewComment?: string;
  // Inline mark-leave fields
  leaveDurationType?: 'full_day' | 'half_day' | 'partial_day' | 'multiple_days';
  halfDayPeriod?: 'first' | 'second';
  partialStartTime?: string; // HH:MM
  partialEndTime?: string;   // HH:MM
}

/** Response from GET /leave-requests/check-date */
export interface LeaveStatusForDate {
  date: string;
  has_leave: boolean;
  leave_duration_type?: 'full_day' | 'half_day' | 'partial_day';
  half_day_period?: 'first' | 'second';
  partial_start_time?: string;
  partial_end_time?: string;
  leave_id?: number;
  leave_type_name?: string;
  available_hours: number;
  blocked_message?: string;
}


export interface WeekendWorkRequest {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  projectId: string;
  projectName: string;
  workDate: string; // YYYY-MM-DD (Sat or Sun)
  plannedHours: number;
  billableHours?: number;
  billableWorkSummary?: string;
  nonBillableHours?: number;
  nonBillableWorkSummary?: string;
  deliverableObjective: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedOn: string;
  reviewedBy?: string;
}

export interface ActivityLog {
  id: string;
  userName: string;
  userAvatar: string;
  action: string;
  target: string;
  timestamp: string;
  type: 'timesheet' | 'leave' | 'project' | 'user' | 'system';
}

export type NotificationType =
  | 'timesheet_submitted'
  | 'timesheet_approved'
  | 'timesheet_rejected'
  | 'leave_requested'
  | 'leave_approved'
  | 'leave_rejected'
  | 'leave_cancelled'
  | 'weekend_work_requested'
  | 'weekend_work_approved'
  | 'weekend_work_rejected'
  | 'pending_approval';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: string; // ISO datetime string
  is_read: boolean;
  related_id?: number;
  related_entity?: 'timesheet' | 'leave_request' | 'weekend_work';
}

export interface NotificationsResponse {
  notifications: Notification[];
  unread_count: number;
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'error' | 'info';
}

declare global {
  interface Window {
    google?: any;
  }
}

// -----------------------------------------------------------------------------
// Employee & Milestone Utilization Types
// -----------------------------------------------------------------------------

export interface CapacityKPI {
  total_employees: number;
  available_hours: number;
  billable_hours: number;
  non_billable_hours: number;
  employee_utilization_pct: number;
}

export interface CostKPI {
  employee_cost: number;
  tool_cost: number;
  total_actual_cost: number;
}

export interface BudgetKPI {
  total_budget: number;
  budget_utilization_pct: number;
  remaining_budget: number;
  cost_variance: number;
  cost_variance_pct: number;
}

export interface ForecastKPI {
  forecasted_final_cost: number;
  projected_overrun: number;
}

export interface UtilizationDashboardData {
  capacity: CapacityKPI;
  cost: CostKPI;
  budget: BudgetKPI;
  forecast: ForecastKPI;
}

export interface EmployeeUtilizationRow {
  employee_id: number;
  employee_name: string;
  available_hours: number;
  billable_hours: number;
  non_billable_hours: number;
  utilization_pct: number;
  hourly_cost: number;
  employee_cost: number;
}

export interface EmployeeUtilizationData {
  employees: EmployeeUtilizationRow[];
  total_count: number;
}

export interface MilestoneUtilizationRow {
  milestone_id: number;
  milestone_name: string;
  project_id: number;
  project_name: string;
  status: string;
  completion_percentage: number;
  budget: number;
  planned_hours: number;
  billable_hours: number;
  employee_cost: number;
  tool_cost: number;
  total_actual_cost: number;
  budget_utilization_pct: number;
  remaining_budget: number;
  cost_variance: number;
  forecasted_final_cost: number;
  projected_overrun: number;
  planned_duration_days: number;
  actual_duration_days: number;
  schedule_variance_days: number;
  schedule_status: 'early' | 'on_time' | 'late' | 'pending' | string;
  cpi: number;
}

export interface MilestoneUtilizationData {
  milestones: MilestoneUtilizationRow[];
  total_count: number;
}

