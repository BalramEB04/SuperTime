import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { Mutex } from 'async-mutex';
import { RootState } from './index';
import { logout } from './slices/authSlice';
import { mapBackendUserToFrontendUser } from '../utils/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
if (!API_BASE_URL) {
  throw new Error(
    '[apiSlice] VITE_API_BASE_URL is not set. ' +
    'Set it in Vercel environment variables (production) to your Render URL.'
  );
}

const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  credentials: 'include',
  timeout: 30000, // 30 second timeout to accommodate Render cold starts & large uploads
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth?.token || (typeof window !== 'undefined' ? localStorage.getItem('access_token') : null);
    if (token) {
      headers.set('Authorization', 'Bearer ' + token);
    }
    return headers;
  },
});

const mutex = new Mutex();
let lastRefreshFailTime = 0;
const REFRESH_TIMEOUT = 30000; // 30 seconds

const baseQueryWithReauth = async (args: any, api: any, extraOptions: any) => {
  await mutex.waitForUnlock();
  let result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    if (Date.now() - lastRefreshFailTime < REFRESH_TIMEOUT) {
      api.dispatch(logout());
      return result;
    }

    if (!mutex.isLocked()) {
      const release = await mutex.acquire();
      try {
        const storedRefreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : undefined;
        const refreshResult = await baseQuery(
          {
            url: '/auth/refresh',
            method: 'POST',
            body: storedRefreshToken ? { refresh_token: storedRefreshToken } : undefined,
          },
          api,
          extraOptions
        );

        if (refreshResult.data) {
          const data = (refreshResult.data as any).data;
          if (data && data.user) {
            const normalizedUser = mapBackendUserToFrontendUser(data.user);
            const newToken = data.access_token || data.accessToken;
            if (newToken && typeof window !== 'undefined') {
              localStorage.setItem('access_token', newToken);
            }
            if (data.refresh_token && typeof window !== 'undefined') {
              localStorage.setItem('refresh_token', data.refresh_token);
            }
            api.dispatch({
              type: 'auth/setCredentials',
              payload: {
                user: normalizedUser,
                token: newToken,
                refreshToken: data.refresh_token,
              },
            });
            result = await baseQuery(args, api, extraOptions);
          } else {
            lastRefreshFailTime = Date.now();
            api.dispatch(logout());
            api.dispatch(apiSlice.util.resetApiState());
          }
        } else {
          lastRefreshFailTime = Date.now();
          api.dispatch(logout());
          api.dispatch(apiSlice.util.resetApiState());
        }
      } finally {
        release();
      }
    } else {
      await mutex.waitForUnlock();
      result = await baseQuery(args, api, extraOptions);
    }
  }

  return result;
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'User',
    'Project',
    'Timesheet',
    'Holiday',
    'LeaveRequest',
    'LeaveBalance',
    'LeaveType',
    'Setting',
    'Dashboard',
    'Client',
    'Tool',
    'Department',
    'WorkingCalendar',
    'Notifications',
    'WeekendWork',
    'Role',
  ],
  endpoints: () => ({}),
});
