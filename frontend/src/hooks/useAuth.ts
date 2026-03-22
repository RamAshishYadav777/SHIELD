import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { setUser, setLoading, logoutUser } from '@/store/slices/authSlice';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useEffect, useCallback } from 'react';
import { subscribeToNotifications } from '@/lib/notifications';

export const useAuth = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user, loading } = useSelector((state: RootState) => state.auth);

  // Use React Query to fetch the user session
  const { data: userData, isLoading, isError, refetch } = useQuery({
    queryKey: ['auth-me'],
    queryFn: async () => {
      try {
        const res = await api.get('/auth/me');
        return res.data.user;
      } catch (err) {
        return null; // Guest or expired
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  // Keep Redux in sync with React Query
  useEffect(() => {
    if (!isLoading) {
      dispatch(setUser(userData));
    }
  }, [userData, isLoading, dispatch]);

  const login = useCallback((userData: any) => {
    dispatch(setUser(userData));
    // Background tasks
    subscribeToNotifications().catch(err => console.error('Silent notification failure:', err));
    
    toast.success(`Welcome back, ${userData.name}!`);
    if (userData.role === 'admin') {
      router.push('/admin');
    } else {
      router.push('/dashboard');
    }
  }, [dispatch, router]);

  const logout = useCallback(async () => {
    try {
      await api.get('/auth/logout');
    } catch (e) {
      // Ignore
    }
    dispatch(logoutUser());
    queryClient.setQueryData(['auth-me'], null);
    toast.success('Logged out successfully');
    router.push('/');
  }, [dispatch, queryClient, router]);

  const refreshUser = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    user,
    loading: loading || isLoading,
    login,
    logout,
    refreshUser,
  };
};
