import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mockUseWeeks = vi.fn();
const mockUseActiveIngredientIds = vi.fn();
const mockUseCreateWeek = vi.fn();
const mockUseAuthContext = vi.fn();

vi.mock('../../hooks/use-weeks', () => ({
  useWeeks: () => mockUseWeeks(),
  useActiveIngredientIds: () => mockUseActiveIngredientIds(),
  useCreateWeek: () => mockUseCreateWeek()
}));

vi.mock('../../providers/auth-provider', () => ({
  useAuthContext: () => mockUseAuthContext()
}));

vi.mock('@firebase/services', () => ({
  getClientAuth: vi.fn(),
  getClientFirestore: vi.fn()
}));

import { WeekListPage } from './week-list-page';

const renderWithProviders = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0
      }
    }
  });

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );

  return render(<WeekListPage />, { wrapper: Wrapper });
};

describe('WeekListPage', () => {
  beforeEach(() => {
    mockUseWeeks.mockReset();
    mockUseActiveIngredientIds.mockReset();
    mockUseCreateWeek.mockReset();
    mockUseAuthContext.mockReset();

    mockUseWeeks.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null
    });

    mockUseActiveIngredientIds.mockReturnValue({
      data: [],
      isLoading: false
    });

    mockUseCreateWeek.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false
    });

    mockUseAuthContext.mockReturnValue({
      profile: { role: 'owner' },
      user: { uid: 'owner-1' },
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
      hasRole: vi.fn()
    });
  });

  test('shows loading state while weeks load', () => {
    mockUseWeeks.mockReturnValue({
      data: [],
      isLoading: true,
      isError: false,
      error: null
    });

    renderWithProviders();

    expect(screen.getAllByText('Loading weeks...').length).toBeGreaterThan(0);
  });

  test('renders empty state and create form for owners', () => {
    renderWithProviders();

    expect(screen.getAllByText('Active weeks').length).toBeGreaterThan(0);
    expect(
      screen.getByText('No weeks yet. Owners can create the first week to kick off data collection.')
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Create week' })[0]).toBeEnabled();
  });
});
