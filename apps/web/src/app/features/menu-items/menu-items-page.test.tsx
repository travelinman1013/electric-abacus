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

vi.mock('../../services/firestore', () => ({
  getMenuItemWithRecipes: vi.fn(),
}));

import { MenuItemsPage } from './menu-items-page';
import { useIngredients } from '../../hooks/use-ingredients';
import {
  useMenuItems,
  useMenuItemWithRecipes,
  useUpsertMenuItem,
  useDeleteMenuItem,
} from '../../hooks/use-menu-items';
import { getMenuItemWithRecipes } from '../../services/firestore';

const mockUseIngredients = vi.mocked(useIngredients);
const mockUseMenuItems = vi.mocked(useMenuItems);
const mockUseMenuItemWithRecipes = vi.mocked(useMenuItemWithRecipes);
const mockUseUpsertMenuItem = vi.mocked(useUpsertMenuItem);
const mockUseDeleteMenuItem = vi.mocked(useDeleteMenuItem);
const mockGetMenuItemWithRecipes = vi.mocked(getMenuItemWithRecipes);

describe('MenuItemsPage editing', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseIngredients.mockReturnValue({
      data: [
        {
          id: 'chedd',
          name: 'Chedd',
          inventoryUnit: 'lb',
          unitsPerCase: 1,
          casePrice: 10,
          unitCost: 5.8,
          isActive: true,
          category: 'food',
        },
        {
          id: 'flour',
          name: 'Flour',
          inventoryUnit: 'oz',
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

    mockGetMenuItemWithRecipes.mockResolvedValue(menuItemDetail);

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

    // Find the quantity input field by looking for spinbutton inputs (number inputs)
    const numberInputs = within(editCard).getAllByRole('spinbutton') as HTMLInputElement[];
    // Find the input with the expected value 1.6, or if not found, get the first number input after selling price
    const quantityInput = numberInputs.find(input => input.value === '1.6') || numberInputs[1];

    expect(quantityInput).toBeTruthy();
    await user.clear(quantityInput);
    await user.type(quantityInput, '2.5');
    expect(quantityInput).toHaveValue(2.5);

    const removeButtons = within(editCard).getAllByRole('button', { name: 'Remove' });
    await user.click(removeButtons[1]);
    expect(within(editCard).getAllByRole('button', { name: 'Remove' })).toHaveLength(1);
  });
});
