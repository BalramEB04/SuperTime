import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User, ActivePortalMode } from '../../types';

interface AuthState {
  user: User | null;
  portalMode: ActivePortalMode;
}

const initialState: AuthState = {
  user: null,
  portalMode: 'employee', // default, will be overridden on login
};

function sanitizePortalMode(roleOrMode: string | undefined): ActivePortalMode {
  if (!roleOrMode) return 'employee';
  const r = String(roleOrMode).toLowerCase();
  if (r.includes('admin')) return 'admin';
  if (r.includes('project') || r === 'pm') return 'pm';
  if (r.includes('account') || r === 'ac_manager') return 'ac_manager';
  return 'employee';
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User }>
    ) => {
      const { user } = action.payload;
      const normalizedRole = sanitizePortalMode(user.role) as any;
      state.user = {
        ...user,
        role: normalizedRole,
      };
      state.portalMode = sanitizePortalMode(user.role);
    },
    logout: (state) => {
      state.user = null;
      state.portalMode = 'employee';
      localStorage.removeItem('SuperTime_current_user'); // cleanup old localstorage
    },
    setPortalMode: (state, action: PayloadAction<ActivePortalMode | string>) => {
      state.portalMode = sanitizePortalMode(action.payload);
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      if (!state.user) {
        state.portalMode = 'employee';
      }
    }
  },
});

export const { setCredentials, logout, setPortalMode, setUser } = authSlice.actions;
export default authSlice.reducer;
