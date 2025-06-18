import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface User {
  id: number;
  email: string;
  username: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action: PayloadAction<{ access_token: string; token_type: string }>) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.token = action.payload.access_token;
      localStorage.setItem('token', action.payload.access_token);
      // User data will be fetched separately via /me endpoint
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem('token');
    },
    clearError: (state) => {
      state.error = null;
    },
    restoreAuthState: (state) => {
      const token = localStorage.getItem('token');
      if (token) {
        state.token = token;
        state.isAuthenticated = true;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

export const { loginStart, loginSuccess, loginFailure, setUser, logout, clearError, restoreAuthState, setLoading } = authSlice.actions;
export default authSlice.reducer; 