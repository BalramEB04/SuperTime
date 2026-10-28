import { apiSlice } from '../apiSlice';
import { User, UserRole } from '../../types';

export interface AuthSuccessData {
  user: User;
}

export function mapBackendRoleToFrontendRole(backendRole: string | any): UserRole {
  if (!backendRole) return 'employee';
  const roleStr = (typeof backendRole === 'string' ? backendRole : backendRole.name || '').toLowerCase();
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
    department: backendUser.department?.name || backendUser.department_name || (role === 'admin' ? 'Executive' : role === 'pm' ? 'Project Management' : role === 'ac_manager' ? 'Account Management' : 'General'),
    departmentId: backendUser.department_id || backendUser.department?.id || undefined,
    departmentName: backendUser.department?.name || backendUser.department_name || undefined,
    title: backendUser.role?.name || backendUser.role || 'Employee',
    status: userStatus,
    joinDate: joinDate,
    allocatedProjectsCount: backendUser.allocatedProjectsCount || 0,
  };
}

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    loginWithGoogle: builder.mutation<AuthSuccessData, string>({
      query: (credential) => ({
        url: '/auth/google/login',
        method: 'POST',
        body: { credential },
      }),
      transformResponse: (response: any) => {
        const data = response.data;
        return {
          ...data,
          user: mapBackendUserToFrontendUser(data.user),
        };
      },
    }),
    getCurrentUser: builder.query<User, void>({
      query: () => '/auth/me',
      transformResponse: (response: any) => mapBackendUserToFrontendUser(response.data),
      providesTags: ['User'],
    }),
    logout: builder.mutation<void, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
    }),
  }),
});

export const { useLoginWithGoogleMutation, useGetCurrentUserQuery, useLazyGetCurrentUserQuery, useLogoutMutation } = authApi;
