import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import './index.css';
import { App } from './App';
import { AuthProvider } from './app/providers/auth-provider';
import { BusinessProvider } from './app/providers/business-provider';
import { initializeFirebaseClient } from './app/utils/firebaseClient';

initializeFirebaseClient();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false
    }
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BusinessProvider>
          <App />
        </BusinessProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
