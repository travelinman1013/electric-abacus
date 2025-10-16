import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, cleanup } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, test, vi } from 'vitest';

// Mock all the hooks
const mockUseWeek = vi.fn();
const mockUseWeekInventory = vi.fn();
const mockUseWeekCostSnapshot = vi.fn();
const mockUseWeekReport = vi.fn();
const mockUseWeekSales = vi.fn();
const mockUseIngredients = vi.fn();
const mockUseFinalizeWeek = vi.fn();
const mockUseAuthContext = vi.fn();

vi.mock('../../hooks/use-weeks', () => ({
  useWeek: (): unknown => mockUseWeek(),
  useWeekInventory: (): unknown => mockUseWeekInventory(),
  useWeekCostSnapshot: (): unknown => mockUseWeekCostSnapshot(),
  useWeekReport: (): unknown => mockUseWeekReport(),
  useWeekSales: (): unknown => mockUseWeekSales(),
  useFinalizeWeek: (): unknown => mockUseFinalizeWeek()
}));

vi.mock('../../hooks/use-ingredients', () => ({
  useIngredients: (): unknown => mockUseIngredients()
}));

vi.mock('../../providers/auth-provider', () => ({
  useAuthContext: (): unknown => mockUseAuthContext()
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ weekId: '2025-W01' })
  };
});

import { WeekReviewPage } from './week-review-page';

const renderWithProviders = (initialEntries = ['/weeks/2025-W01/review']) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0
      }
    }
  });

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
    </QueryClientProvider>
  );

  return render(<WeekReviewPage />, { wrapper: Wrapper });
};

const mockDraftWeek = {
  id: '2025-W01',
  status: 'draft' as const,
  createdAt: '2025-01-01T00:00:00.000Z',
  finalizedAt: null,
  finalizedBy: null
};


const mockInventoryEntries = [
  { ingredientId: 'beef', begin: 10, received: 5, end: 3 },
  { ingredientId: 'cheese', begin: 20, received: 10, end: 8 }
];

const mockIngredients = [
  {
    id: 'beef',
    name: 'Ground Beef',
    unitCost: 8.50,
    currentVersionId: 'v1',
    casePrice: 85,
    unitsPerCase: 10,
    unitOfMeasure: 'lb',
    isActive: true
  },
  {
    id: 'cheese',
    name: 'Shredded Cheese',
    unitCost: 3.00,
    currentVersionId: 'v2',
    casePrice: 30,
    unitsPerCase: 10,
    unitOfMeasure: 'lb',
    isActive: true
  }
];

const mockOwnerAuthContext = {
  profile: { role: 'owner' },
  user: { uid: 'owner-1' },
  loading: false,
  signIn: vi.fn(),
  signOut: vi.fn(),
  hasRole: vi.fn()
};


describe('WeekReviewPage', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    // Reset all mocks
    mockUseWeek.mockReset();
    mockUseWeekInventory.mockReset();
    mockUseWeekCostSnapshot.mockReset();
    mockUseWeekReport.mockReset();
    mockUseWeekSales.mockReset();
    mockUseIngredients.mockReset();
    mockUseFinalizeWeek.mockReset();
    mockUseAuthContext.mockReset();

    // Set default successful responses
    mockUseWeek.mockReturnValue({
      data: mockDraftWeek,
      isLoading: false,
      isError: false,
      error: null
    });

    mockUseWeekInventory.mockReturnValue({
      data: mockInventoryEntries,
      isLoading: false,
      isError: false,
      error: null
    });

    mockUseWeekCostSnapshot.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null
    });

    mockUseWeekReport.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      error: null
    });

    mockUseWeekSales.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      error: null
    });

    mockUseIngredients.mockReturnValue({
      data: mockIngredients,
      isLoading: false,
      isError: false,
      error: null
    });

    mockUseFinalizeWeek.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false
    });

    mockUseAuthContext.mockReturnValue(mockOwnerAuthContext);
  });

  test('shows loading state when data is loading', () => {
    mockUseWeek.mockReturnValue({
      data: null,
      isLoading: true,
      isError: false,
      error: null
    });

    renderWithProviders();

    expect(screen.getByText('Loading week data...')).toBeInTheDocument();
  });

  test('displays week header with status badge for draft week', () => {
    renderWithProviders();

    expect(screen.getByText('Weekly review')).toBeInTheDocument();
    expect(screen.getByText('draft')).toBeInTheDocument();
  });

  test('shows finalize button for owners with draft week', () => {
    renderWithProviders();

    const finalizeButton = screen.getByRole('button', { name: 'Finalize week' });
    expect(finalizeButton).toBeInTheDocument();
    expect(finalizeButton).toBeEnabled();
  });

  test('displays costing summary cards', () => {
    renderWithProviders();

    expect(screen.getByText('Total usage units')).toBeInTheDocument();
    expect(screen.getByText('Total cost of sales')).toBeInTheDocument();
    expect(screen.getByText('Food cost percentage')).toBeInTheDocument();
  });
});