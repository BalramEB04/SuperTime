import { User, UserRole } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
if (!API_BASE_URL) {
  throw new Error(
    '[api] VITE_API_BASE_URL is not set. ' +
    'Set it in Vercel environment variables (production) to your Render URL.'
  );
}

export function mapBackendRoleToFrontendRole(backendRole: string): UserRole {
  const roleStr = (backendRole || '').toLowerCase();
  if (roleStr.includes('admin')) return 'admin';
  if (roleStr.includes('project') || roleStr === 'pm') return 'pm';
  if (roleStr.includes('account') || roleStr === 'ac_manager') return 'ac_manager';
  return 'employee';
}

export function mapBackendUserToFrontendUser(backendUser: any): User {
  const name = [backendUser.first_name, backendUser.last_name].filter(Boolean).join(' ') || backendUser.email;
  const role = mapBackendRoleToFrontendRole(backendUser.role);

  // Normalize status dynamically from backend
  let userStatus: User['status'] = 'active';
  if (backendUser.status) {
    const s = String(backendUser.status).toLowerCase();
    if (s === 'pending') userStatus = 'pending';
    else if (s === 'inactive') userStatus = 'inactive';
    else if (s === 'on_leave') userStatus = 'on_leave';
    else if (s === 'resigned') userStatus = 'resigned';
    else userStatus = 'active';
  } else if (backendUser.is_active === false) {
    userStatus = 'pending';
  }

  // Format joining date
  let joinDate = new Date().toISOString().split('T')[0];
  if (backendUser.joining_date) {
    joinDate = String(backendUser.joining_date).split('T')[0];
  } else if (backendUser.created_at) {
    joinDate = String(backendUser.created_at).split('T')[0];
  }

  return {
    id: String(backendUser.id),
    employee_id: backendUser.employee_id || undefined,
    name: name,
    email: backendUser.email,
    avatar: backendUser.avatar || `https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80`,
    role: role,
    department: role === 'admin' ? 'Executive' : role === 'pm' ? 'Project Management' : role === 'ac_manager' ? 'Account Management' : 'Engineering',
    title: backendUser.role?.name || backendUser.role || 'Employee',
    status: userStatus,
    joinDate: joinDate,
    allocatedProjectsCount: backendUser.allocatedProjectsCount || 0,
  };
}

export interface AuthSuccessData {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export async function loginWithGoogleApi(credential: string): Promise<AuthSuccessData> {
  const response = await fetch(`${API_BASE_URL}/auth/google/login`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ credential }),
  });

  const json = await response.json();

  if (!response.ok || !json.success) {
    const errorMsg = json.message || (json.errors && json.errors[0]?.msg) || 'Google SSO Login failed';
    throw new Error(errorMsg);
  }

  const data = json.data;
  const frontendUser = mapBackendUserToFrontendUser(data.user);

  return {
    user: frontendUser,
  } as AuthSuccessData;
}

export async function fetchCurrentUserApi(): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    credentials: 'include',
  });

  const json = await response.json();

  if (!response.ok || !json.success) {
    throw new Error(json.message || 'Session expired');
  }

  return mapBackendUserToFrontendUser(json.data);
}

export async function refreshAccessTokenApi(): Promise<AuthSuccessData> {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const json = await response.json();

  if (!response.ok || !json.success) {
    throw new Error(json.message || 'Token refresh failed');
  }

  const data = json.data;
  const frontendUser = mapBackendUserToFrontendUser(data.user);

  return {
    user: frontendUser,
  } as AuthSuccessData;
}

export async function logoutApi(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch {
    // Stateless logout ignore network errors
  }
}

// ---------------------------------------------------------------------------
// Users API
// ---------------------------------------------------------------------------

export interface BackendDepartment {
  id: number;
  name: string;
  code?: string | null;
  description?: string | null;
  is_active: boolean;
  employee_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface BackendUser {
  id: number;
  department_id?: number | null;
  department?: BackendDepartment | null;
  email: string;
  first_name: string;
  last_name: string;
  employee_id: string;
  role_id: number;
  joining_date: string | null;
  status: string;
  ctc?: number;
  created_at: string;
  updated_at: string;
  role: { id: number; name: string; description: string | null; created_at: string };
}

export interface PaginatedUsersResponse {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  items: BackendUser[];
}

export interface UserCreatePayload {
  email: string;
  department_id?: number | null;
  first_name: string;
  last_name: string;
  employee_id?: string;
  role_id: number;
  joining_date?: string | null;
  status?: string;
  ctc?: number;
}

export interface UserUpdatePayload {
  email?: string;
  department_id?: number | null;
  first_name?: string;
  last_name?: string;
  employee_id?: string;
  role_id?: number;
  joining_date?: string | null;
  status?: string;
  ctc?: number;
}

function authHeader() {
  return { 'Content-Type': 'application/json' };
}

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Request failed');
  }
  return json.data as T;
}

export async function fetchUsersApi(
  params?: { page?: number; limit?: number; role_id?: number; status?: string; search?: string }
): Promise<PaginatedUsersResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.role_id) query.set('role_id', String(params.role_id));
  if (params?.status) query.set('status', params.status);
  if (params?.search) query.set('search', params.search);

  const res = await fetch(`${API_BASE_URL}/users?${query}`, { credentials: 'include', headers: authHeader() });
  return handleResponse<PaginatedUsersResponse>(res);
}

export async function fetchUserByIdApi(userId: number): Promise<BackendUser> {
  const res = await fetch(`${API_BASE_URL}/users/${userId}`, { credentials: 'include', headers: authHeader() });
  return handleResponse<BackendUser>(res);
}

export async function createUserApi(payload: UserCreatePayload): Promise<BackendUser> {
  const res = await fetch(`${API_BASE_URL}/users`, {
    method: 'POST',
    credentials: 'include',
    headers: authHeader(),
    body: JSON.stringify(payload),
  });
  return handleResponse<BackendUser>(res);
}

export async function updateUserApi(userId: number, payload: UserUpdatePayload): Promise<BackendUser> {
  const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
    method: 'PUT',
    credentials: 'include',
    headers: authHeader(),
    body: JSON.stringify(payload),
  });
  return handleResponse<BackendUser>(res);
}

export async function toggleUserStatusApi(userId: number, status: 'Active' | 'Inactive'): Promise<BackendUser> {
  const res = await fetch(`${API_BASE_URL}/users/${userId}/status`, {
    method: 'PATCH',
    credentials: 'include',
    headers: authHeader(),
    body: JSON.stringify({ status }),
  });
  return handleResponse<BackendUser>(res);
}

// ---------------------------------------------------------------------------
// Roles API
// ---------------------------------------------------------------------------

export interface BackendRole {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
}

export async function fetchRolesApi(): Promise<BackendRole[]> {
  const res = await fetch(`${API_BASE_URL}/roles`, { credentials: 'include', headers: authHeader() });
  return handleResponse<BackendRole[]>(res);
}

// ---------------------------------------------------------------------------
// Departments API
// ---------------------------------------------------------------------------

export interface DepartmentCreatePayload {
  name: string;
  code?: string;
  description?: string;
}

export interface DepartmentUpdatePayload {
  name?: string;
  code?: string;
  description?: string;
  is_active?: boolean;
}

export async function fetchDepartmentsApi(activeOnly: boolean = true): Promise<BackendDepartment[]> {
  const res = await fetch(`${API_BASE_URL}/departments?active_only=${activeOnly}`, { credentials: 'include', headers: authHeader() });
  return handleResponse<BackendDepartment[]>(res);
}

export async function createDepartmentApi(payload: DepartmentCreatePayload): Promise<BackendDepartment> {
  const res = await fetch(`${API_BASE_URL}/departments`, {
    method: 'POST',
    credentials: 'include',
    headers: authHeader(),
    body: JSON.stringify(payload),
  });
  return handleResponse<BackendDepartment>(res);
}

export async function updateDepartmentApi(deptId: number, payload: DepartmentUpdatePayload): Promise<BackendDepartment> {
  const res = await fetch(`${API_BASE_URL}/departments/${deptId}`, {
    method: 'PUT',
    credentials: 'include',
    headers: authHeader(),
    body: JSON.stringify(payload),
  });
  return handleResponse<BackendDepartment>(res);
}

export async function deleteDepartmentApi(deptId: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/departments/${deptId}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: authHeader(),
  });
  await handleResponse<any>(res);
}
