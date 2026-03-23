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

  // Hydrate Redux state from localStorage early to avoid flickering (speculative set)
  useEffect(() => {
    if (!user && typeof window !== 'undefined') {
      const stored = localStorage.getItem('shield_user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          dispatch(setUser(parsed));
        } catch (e) {
          localStorage.removeItem('shield_user');
        }
      } else {
        // If nothing is stored, and it's not currently loading from react-query,
        // then it's probably a guest. Give it a moment then settle.
      }
    }
  }, [dispatch, user]);

  // Keep Redux in sync with React Query
  useEffect(() => {
    if (!isLoading) {
      const dataToSave = userData ?? null;
      dispatch(setUser(dataToSave));
      
      // Update local storage snippet
      if (typeof window !== 'undefined') {
        if (dataToSave) {
          localStorage.setItem('shield_user', JSON.stringify(dataToSave));
        } else {
          localStorage.removeItem('shield_user');
        }
      }
    }
  }, [userData, isLoading, dispatch]);

  const login = useCallback((userData: any) => {
    if (!userData) return;
    
    // Save to local cache first for instant subsequent navigations
    if (typeof window !== 'undefined') {
      localStorage.setItem('shield_user', JSON.stringify(userData));
    }

    // Nuclear state clearing and setting
    queryClient.setQueryData(['auth-me'], userData);
    dispatch(setUser(userData));
    
    // Give state a moment to propagate
    setTimeout(() => {
      toast.success(`Welcome back, ${userData.name}!`, { id: 'auth-toast' });
      
      const target = userData.role === 'admin' ? '/admin' : '/dashboard';
      router.replace(target);
    }, 100);
  }, [dispatch, router, queryClient]);

  const logout = useCallback(async () => {
    try {
      const { setLoggingOutFlag } = await import('@/lib/api');
      setLoggingOutFlag(true);
      await api.get('/auth/logout');
    } catch (e) {
      // Ignore
    } finally {
      dispatch(logoutUser());
      queryClient.clear();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('shield_user');
        localStorage.clear();
        sessionStorage.clear();
      }
      
      const { setLoggingOutFlag } = await import('@/lib/api');
      setLoggingOutFlag(false);
      
      toast.success('Logged out successfully', { id: 'logout-toast' });
      
      setTimeout(() => {
        router.push('/');
      }, 100);
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
