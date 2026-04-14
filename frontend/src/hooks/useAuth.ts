import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { setUser, setLoading, logoutUser } from '@/store/slices/authSlice';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useEffect, useCallback } from 'react';
import { subscribeToNotifications } from '@/lib/notifications';
import { setCookie, getCookie, removeCookie } from '@/lib/cookies';

export const useAuth = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user, loading } = useSelector((state: RootState) => state.auth);

  // check with server if we are still logged in
  const { data: userData, isLoading, isError, refetch } = useQuery({
    queryKey: ['auth-me'],
    queryFn: async () => {
      try {
        const res = await api.get('/auth/me');
        return res.data.user;
      } catch (err) {
        return null; // session probably died
      }
    },
    initialData: () => {
      // try to load profile from cookies quickly
      if (typeof window !== 'undefined') {
        const stored = getCookie('shield_profile');
        if (stored) {
          try { return JSON.parse(stored); } catch (e) { return null; }
        }
      }
      return null;
    },
    staleTime: 5 * 60 * 1000, 
    retry: false,
    refetchOnWindowFocus: true,
  });

  // if socket auth fails, we refresh the whole user session
  useEffect(() => {
    const handleExpired = () => {
      console.warn('Session expired, refreshing user data...');
      refetch();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('shield-auth-expired', handleExpired);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('shield-auth-expired', handleExpired);
      }
    };
  }, [refetch]);

  // sync state whenever api profile returns
  useEffect(() => {
    if (!isLoading) {
      if (userData) {
        // save name/role but keep token out of plain cookies
        const dataToSave = { ...userData };
        delete dataToSave.token; 
        
        dispatch(setUser(dataToSave));
        
        if (typeof window !== 'undefined') {
          setCookie('shield_profile', JSON.stringify(dataToSave));
        }
      } else {
        dispatch(setUser(null));
        if (typeof window !== 'undefined') {
          removeCookie('shield_profile');
        }
      }
    }
  }, [userData, isLoading, dispatch]);

  const login = useCallback((userData: any) => {
    if (!userData) return;
    
    // store basic profile in cookie so it survives refresh
    const profile = { ...userData };
    delete profile.token; 

    if (typeof window !== 'undefined') {
      setCookie('shield_profile', JSON.stringify(profile));
    }

    // go to dashboard or admin based on who they are
    queryClient.setQueryData(['auth-me'], profile);
    dispatch(setUser(profile));
    
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
      // just ignore logout errors
    } finally {
      // clear cookies and redirect home
      dispatch(logoutUser());
      queryClient.clear();
      if (typeof window !== 'undefined') {
        removeCookie('shield_profile');
      }
      
      const { setLoggingOutFlag } = await import('@/lib/api');
      setLoggingOutFlag(false);
      
      toast.success('Goodbye!', { id: 'logout-toast' });
      
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
    loading: loading,
    isFetching: isLoading,
    login,
    logout,
    refreshUser,
  };
};
