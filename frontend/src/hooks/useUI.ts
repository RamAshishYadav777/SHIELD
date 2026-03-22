import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { setSidebarOpen, toggleSidebar } from '@/store/slices/uiSlice';
import { useCallback } from 'react';

export const useUI = () => {
  const dispatch = useDispatch();
  const { sidebarOpen } = useSelector((state: RootState) => state.ui);

  const _setSidebarOpen = useCallback((open: boolean) => {
    dispatch(setSidebarOpen(open));
  }, [dispatch]);

  const _toggleSidebar = useCallback(() => {
    dispatch(toggleSidebar());
  }, [dispatch]);

  return {
    sidebarOpen,
    setSidebarOpen: _setSidebarOpen,
    toggleSidebar: _toggleSidebar,
  };
};
