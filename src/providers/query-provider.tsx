
'use client';

import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function AppQueryClientProvider({ children }: { children: React.ReactNode }) {
  // Create a client
  // Use useState to ensure the client is only created once per render.
  // See: https://tanstack.com/query/v5/docs/react/guides/ssr#using-hydration
  const [queryClient] = React.useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
