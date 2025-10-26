import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import './index.css';
import { App } from './App';
import { AuthProvider } from './app/providers/auth-provider';
import { BusinessProvider } from './app/providers/business-provider';
import { PreferencesProvider } from './app/providers/preferences-provider';
import { TerminologyProvider } from './app/contexts/TerminologyContext';
import { initializeFirebaseClient } from './app/utils/firebaseClient';
import './app/utils/debug-token'; // Load debug utility

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
        <PreferencesProvider>
          <BusinessProvider>
            <TerminologyProvider>
              <App />
            </TerminologyProvider>
          </BusinessProvider>
        </PreferencesProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
