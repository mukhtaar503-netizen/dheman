'use client';

import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/hooks/use-auth';
import { Toaster } from '@/components/ui/toaster';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        // refetchOnWindowFocus defaults to true in React Query, which would refetch every
        // mounted query (10+ on the dashboard alone) on every tab refocus. Every mutation in
        // this app already calls invalidateQueries explicitly, so data stays fresh without it.
        defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
