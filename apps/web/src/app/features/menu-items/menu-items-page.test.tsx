import { vi, describe, beforeEach, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../hooks/use-ingredients', () => ({
  useIngredients: vi.fn(),
}));

vi.mock('../../hooks/use-menu-items', () => ({
  useMenuItems: vi.fn(),
  useMenuItemWithRecipes: vi.fn(),
  useUpsertMenuItem: vi.fn(),
  useDeleteMenuItem: vi.fn(),
}));

import { MenuItemsPage } from './menu-items-page';
import { useIngredients } from '../../hooks/use-ingredients';
import {
  useMenuItems,
  useMenuItemWithRecipes,
  useUpsertMenuItem,
  useDeleteMenuItem,
} from '../../hooks/use-menu-items';

const mockUseIngredients = vi.mocked(useIngredients);
const mockUseMenuItems = vi.mocked(useMenuItems);
const mockUseMenuItemWithRecipes = vi.mocked(useMenuItemWithRecipes);
const mockUseUpsertMenuItem = vi.mocked(useUpsertMenuItem);
const mockUseDeleteMenuItem = vi.mocked(useDeleteMenuItem);

describe('MenuItemsPage editing', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseIngredients.mockReturnValue({
      data: [
        {
          id: 'chedd',
          name: 'Chedd',
          unitOfMeasure: 'lb',
          unitsPerCase: 1,
          casePrice: 10,
          unitCost: 5.8,
          isActive: true,
          category: 'food',
        },
        {
          id: 'flour',
          name: 'Flour',
          unitOfMeasure: 'oz',
          unitsPerCase: 16,
          casePrice: 12,
          unitCost: 0.52,
          isActive: true,
          category: 'food',
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
    });

    mockUseMenuItems.mockReturnValue({
      data: [
        {
          id: 'cheese-pizza',
          name: 'Cheese Pizza',
          isActive: true,
          sellingPrice: 15,
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
    });

    const menuItemDetail = {
      item: {
        id: 'cheese-pizza',
        name: 'Cheese Pizza',
        isActive: true,
        sellingPrice: 15,
      },
      recipes: [
        {
          id: 'chedd-line',
          ingredientId: 'chedd',
          quantity: 1.6,
          unitOfMeasure: 'lb',
        },
        {
          id: 'flour-line',
          ingredientId: 'flour',
          quantity: 16,
          unitOfMeasure: 'oz',
        },
      ],
    } as const;

    mockUseMenuItemWithRecipes.mockImplementation((menuItemId?: string) => ({
      data: menuItemId ? menuItemDetail : null,
      isLoading: false,
      isError: false,
      error: null,
    }));

    mockUseUpsertMenuItem.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    mockUseDeleteMenuItem.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
  });

  it('allows editing form fields without resetting to the original recipe', async () => {
    const user = userEvent.setup();
    render(<MenuItemsPage />);

    await user.click(screen.getByRole('button', { name: /edit/i }));

    const editHeading = await screen.findByRole('heading', { name: /edit menu item/i });
    const editCard = editHeading.parentElement?.parentElement as HTMLElement;

    const sellingPriceInput = within(editCard).getByLabelText('Selling Price') as HTMLInputElement;
    expect(sellingPriceInput).toHaveValue(15);

    await user.clear(sellingPriceInput);
    await user.type(sellingPriceInput, '20');
    expect(sellingPriceInput).toHaveValue(20);

    const quantityInput = within(editCard).getByDisplayValue('1.6') as HTMLInputElement;
    await user.clear(quantityInput);
    await user.type(quantityInput, '2.5');
    expect(quantityInput).toHaveValue(2.5);

    const removeButtons = within(editCard).getAllByRole('button', { name: 'Remove' });
    await user.click(removeButtons[1]);
    expect(within(editCard).getAllByRole('button', { name: 'Remove' })).toHaveLength(1);
  });
});
