import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User, ActivePortalMode } from '../../types';

interface AuthState {
  user: User | null;
  token: string | null;
  portalMode: ActivePortalMode;
}

function sanitizePortalMode(roleOrMode: string | undefined): ActivePortalMode {
  if (!roleOrMode) return 'employee';
  const r = String(roleOrMode).toLowerCase();
  if (r.includes('admin')) return 'admin';
  if (r.includes('project') || r === 'pm') return 'pm';
  if (r.includes('account') || r === 'ac_manager') return 'ac_manager';
  return 'employee';
}

function getSavedUser(): User | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('access_token');
  if (!token) return null;
  try {
    const raw = localStorage.getItem('SuperTime_current_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const savedUser = getSavedUser();
const savedToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

const initialState: AuthState = {
  user: savedUser,
  token: savedToken,
  portalMode: sanitizePortalMode(savedUser?.role),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; token?: string; accessToken?: string; refreshToken?: string }>
    ) => {
      const { user } = action.payload;
      const token = action.payload.token || action.payload.accessToken;
      if (token) {
        state.token = token;
        localStorage.setItem('access_token', token);
      }
      if (action.payload.refreshToken) {
        localStorage.setItem('refresh_token', action.payload.refreshToken);
      }
      const normalizedRole = sanitizePortalMode(user.role) as any;
      state.user = {
        ...user,
        role: normalizedRole,
      };
      state.portalMode = sanitizePortalMode(user.role);
      try {
        localStorage.setItem('SuperTime_current_user', JSON.stringify(state.user));
      } catch { /* ignore storage quota error */ }
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.portalMode = 'employee';
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('SuperTime_current_user');
    },
    setPortalMode: (state, action: PayloadAction<ActivePortalMode | string>) => {
      state.portalMode = sanitizePortalMode(action.payload);
    },
    setUser: (state, action: PayloadAction<User>) => {
      if (action.payload) {
        const normalizedRole = sanitizePortalMode(action.payload.role) as any;
        state.user = {
          ...action.payload,
          role: normalizedRole,
        };
        try {
          localStorage.setItem('SuperTime_current_user', JSON.stringify(state.user));
        } catch { /* ignore */ }
      } else {
        state.user = null;
        state.portalMode = 'employee';
        localStorage.removeItem('SuperTime_current_user');
      }
    }
  },
});

export const { setCredentials, logout, setPortalMode, setUser } = authSlice.actions;
export default authSlice.reducer;
