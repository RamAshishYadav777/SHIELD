import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { getCookie } from '@/lib/cookies';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isVerified: boolean;
  contactSlots: number;
  createdAt: string;
  location?: {
    type: string;
    coordinates: [number, number];
  };
  token?: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
}

const getInitialUser = () => {
  if (typeof window !== 'undefined') {
    const stored = getCookie('shield_profile');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return null;
      }
    }
  }
  return null;
};

const initialState: AuthState = {
  user: getInitialUser(),
  loading: typeof window === 'undefined' || !getInitialUser(),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      state.loading = false;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    logoutUser: (state) => {
      state.user = null;
      state.loading = false;
    },
  },
});

export const { setUser, setLoading, logoutUser } = authSlice.actions;
export default authSlice.reducer;
