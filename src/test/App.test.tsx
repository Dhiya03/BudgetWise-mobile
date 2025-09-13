import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from '../App';
import { hasAccessTo } from '../subscriptionManager';
import type { Mock } from 'vitest';
import { renderWithProvider } from '../setupTests';

// Mock dependencies
vi.mock('../subscriptionManager');
vi.mock('../utils/analytics');
vi.mock('@capacitor/local-notifications');
vi.mock('@capacitor/app');
vi.mock('../billing/AdsManager');
vi.mock('../billing/BillingManager');
vi.mock('../components/FinancialTipsService', () => ({
  default: {
    getUserLanguage: () => 'en',
    getTodaysTip: () => null,
  }
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });


describe('App Integration Tests - Monthly Budget Deletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    // Default to premium user with all features
    (hasAccessTo as Mock).mockReturnValue(true);
    // Mock alert used in the app
    window.alert = vi.fn();
  });

  it('should correctly delete a monthly category and re-categorize its transactions', async () => {
    // Arrange: Render the app, which will initialize with sample data
    renderWithProvider(<App />);
    const user = userEvent.setup();

    // 1. Verify initial state: A transaction with the 'Food' category exists in the history.
    await user.click(screen.getByRole('button', { name: /history/i }));
    // The sample data has a 'Groceries' transaction in the 'Food' category
    expect(await screen.findByText('Groceries')).toBeInTheDocument();
    expect(screen.getByText('Food')).toBeInTheDocument();

    // 2. Act: Navigate to the Budget tab and delete the 'Food' category.
    await user.click(screen.getByRole('button', { name: /budget/i }));

    // Enter edit mode for monthly budgets.
    const monthlyOverview = screen.getByText('Monthly Budget Overview').closest('div');
    const editButton = monthlyOverview?.querySelector('button[title="Edit"]');
    expect(editButton).toBeInTheDocument();
    if (!editButton) return;
    await user.click(editButton);

    // Find and click the delete button for the 'Food' category.
    const foodLabel = await screen.findByLabelText('Food');
    const deleteButton = foodLabel.parentElement?.querySelector('button[title="Delete Budget"]');
    expect(deleteButton).toBeInTheDocument();
    if (!deleteButton) return;
    await user.click(deleteButton);

    // Confirm the deletion in the modal.
    const confirmationModal = await screen.findByRole('dialog');
    expect(confirmationModal).toBeInTheDocument();
    expect(screen.getByText('Delete Category')).toBeInTheDocument();
    const confirmButton = screen.getByRole('button', { name: /yes/i });
    await user.click(confirmButton);

    // 3. Assert: Check that the category is gone from the budget tab's edit mode.
    await waitFor(() => {
      expect(screen.queryByLabelText('Food')).not.toBeInTheDocument();
    });
    expect(screen.getByLabelText('Transport')).toBeInTheDocument(); // Ensure other categories remain.

    // 4. Assert: Check that the transaction is now 'Uncategorized' in the history tab.
    await user.click(screen.getByRole('button', { name: /history/i }));
    
    await waitFor(() => {
        expect(screen.getByText('Groceries')).toBeInTheDocument();
        expect(screen.queryByText('Food')).not.toBeInTheDocument();
        expect(screen.getByText('Uncategorized')).toBeInTheDocument();
    });
  });
});