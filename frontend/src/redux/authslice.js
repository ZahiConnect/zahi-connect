import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  accessToken: null,
  profile: null,       // Profile cache 
  isAuthenticated: false,
  loading: true,       // For initial app-wide auth check
  loadingCount: 0,     // For background API calls
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { user, accessToken } = action.payload;
      state.user = user;
      state.accessToken = accessToken;
      state.isAuthenticated = true;
      state.loading = false;
    },
    setProfile: (state, action) => {
      state.profile = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.profile = null;
      state.isAuthenticated = false;
      state.loading = false;
    },
    finishInitialLoad: (state) => {
      state.loading = false;
    },
    // Increments and decrements the counter for global loader
    startFetching: (state) => {
      state.loadingCount += 1;
    },
    stopFetching: (state) => {
      state.loadingCount = Math.max(0, state.loadingCount - 1);
    }
  },
});

export const { setCredentials, setProfile, logout, finishInitialLoad, startFetching, stopFetching } = authSlice.actions;
export default authSlice.reducer;
