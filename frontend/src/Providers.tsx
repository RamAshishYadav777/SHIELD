'use client';

import React from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { store } from './store';
import { useSocket } from './hooks/useSocket';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function SocketInitializer({ children }: { children: React.ReactNode }) {
  useSocket();
  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ReduxProvider store={store}>
      <QueryClientProvider client={queryClient}>
        <SocketInitializer>
          {children}
          <ReactQueryDevtools initialIsOpen={false} />
        </SocketInitializer>
      </QueryClientProvider>
    </ReduxProvider>
  );
}
