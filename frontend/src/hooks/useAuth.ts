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
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: true,
  });

  // Keep Redux in sync with React Query
  // CRITICAL: only sync when the query is DONE loading, and only clear if it
  // explicitly returned null (logged out). Never overwrite a live user with
  // 'undefined' (which means the query is still in-flight).
  useEffect(() => {
    if (!isLoading) {
      dispatch(setUser(userData ?? null));
    }
  }, [userData, isLoading, dispatch]);

  const login = useCallback((userData: any) => {
    if (!userData) return;
    
    // Nuclear state clearing and setting
    queryClient.setQueryData(['auth-me'], userData);
    dispatch(setUser(userData));
    
    // Give state a moment to propagate
    setTimeout(() => {
      toast.success(`Welcome back, ${userData.name}!`, { id: 'auth-toast' });
      
      // High Priority Redirect Strategy
      const target = userData.role === 'admin' ? '/admin' : '/dashboard';
      router.replace(target);
    }, 100);
  }, [dispatch, router, queryClient]);

  const logout = useCallback(async () => {
    try {
      // Signal to API interceptor to NOT refresh
      const { setLoggingOutFlag } = await import('@/lib/api');
      setLoggingOutFlag(true);
      
      await api.get('/auth/logout');
    } catch (e) {
      // Ignore
    } finally {
      // Nuclear wipe of all potential persistent stores
      dispatch(logoutUser());
      queryClient.clear();
      localStorage.clear();
      sessionStorage.clear();
      
      // Signal cleanup
      const { setLoggingOutFlag } = await import('@/lib/api');
      setLoggingOutFlag(false);
      
      // Force a hard reload to ensure zero memory-resident states
      window.location.href = "/";
    }
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
