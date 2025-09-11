import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AddTab from '../components/AddTab';
import { hasAccessTo, Feature } from '../subscriptionManager';
import type { Mock } from 'vitest';
import { Transaction, CustomBudget } from '../types'

// Mock the subscriptionManager to control feature access in tests
vi.mock('../subscriptionManager');

const createDefaultProps = () => ({
  editingTransaction: null,
  formData: {
    category: '',
    amount: '',
    description: '',
    date: '2024-01-15',
    type: 'expense' as 'expense' | 'income',
    budgetType: 'monthly' as 'monthly' | 'custom' | 'transfer',
    customBudgetId: null,
    customCategory: '',
    tags: '',
    isRecurring: false,
    recurringFrequency: null,
  },
  setFormData: vi.fn(),
  categories: ['Food', 'Transport'],
  customBudgets: [
    { id: 1, name: 'Vacation', description: 'Trip to Goa', categories: ['Flights', 'Hotels'], totalAmount: 1000, spentAmount: 0, remainingAmount: 1000, deadline: null, priority: 'medium', status: 'active', categoryBudgets: {}, createdAt: '', updatedAt: '' },
  ] as CustomBudget[],
  budgets: {},
  onTransactionAdd: vi.fn(),
  onTransactionUpdate: vi.fn(),
  onCancelEdit: vi.fn(),
  getCustomBudgetCategories: vi.fn((id) => (id === 1 ? ['Flights', 'Hotels'] : [])),
  categorySuggestion: null,
  onDescriptionChange: vi.fn(),
  onSetCategoryFromSuggestion: vi.fn(),
});

describe('AddTab', () => {
  beforeEach(() => {
    (hasAccessTo as Mock).mockReturnValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the form with default values', () => {
    const props = createDefaultProps();
    render(<AddTab {...props} />);

    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add transaction/i })).toBeInTheDocument();
  });

  it('allows toggling between expense and income', async () => {
    const props = createDefaultProps();
    render(<AddTab {...props} />);
    const incomeButton = screen.getByRole('button', { name: /income/i });

    await userEvent.click(incomeButton);

    expect(props.setFormData).toHaveBeenCalledWith(expect.objectContaining({ type: 'income' }));
  });

  it('shows custom budget fields when toggled', async () => {
    const props = createDefaultProps();
    render(<AddTab {...props} />);

    const customBudgetButton = screen.getByRole('button', { name: /custom/i });
    await userEvent.click(customBudgetButton);

    expect(props.setFormData).toHaveBeenCalledWith(expect.objectContaining({ budgetType: 'custom' }));
  });

  it('calls onTransactionAdd with correct data on valid submission', async () => {
    const props = createDefaultProps();
    render(<AddTab {...props} />);

    await userEvent.type(screen.getByLabelText(/amount/i), '100');
    await userEvent.selectOptions(screen.getByLabelText(/category/i), 'Food');
    await userEvent.type(screen.getByLabelText(/description/i), 'Test lunch');

    await userEvent.click(screen.getByRole('button', { name: /add transaction/i }));

    expect(props.onTransactionAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionData: expect.objectContaining({
          amount: '100',
          category: 'Food',
          description: 'Test lunch',
        }),
      })
    );
  });

  describe('Validation', () => {
    it('does not call onTransactionAdd if amount is missing', async () => {
      const props = createDefaultProps();
      render(<AddTab {...props} />);
      await userEvent.selectOptions(screen.getByLabelText(/category/i), 'Food');
      await userEvent.click(screen.getByRole('button', { name: /add transaction/i }));
      expect(props.onTransactionAdd).not.toHaveBeenCalled();
    });

    it('does not call onTransactionAdd if category is missing for monthly budget', async () => {
      const props = createDefaultProps();
      render(<AddTab {...props} />);
      await userEvent.type(screen.getByLabelText(/amount/i), '50');
      // No category selected
      await userEvent.click(screen.getByRole('button', { name: /add transaction/i }));

      expect(props.onTransactionAdd).not.toHaveBeenCalled();
    });
  });

  it('sends a complete payload when adding a transaction with a new category', async () => {
    const props = createDefaultProps();
    render(<AddTab {...props} />);
    
    // Show the new category inputs
    await userEvent.selectOptions(screen.getByLabelText(/category/i), 'add_new');
    
    // Fill out the new category and the transaction details
    await userEvent.type(screen.getByPlaceholderText(/new category name/i), 'Utilities');
    await userEvent.type(screen.getByPlaceholderText('Budget'), '2500');
    await userEvent.type(screen.getByLabelText(/amount/i), '150');
    await userEvent.type(screen.getByLabelText(/description/i), 'Electric Bill');
    
    // Submit the form
    await userEvent.click(screen.getByRole('button', { name: /add transaction/i }));

    // Assert that the correct payload was sent
    expect(props.onTransactionAdd).toHaveBeenCalledTimes(1);
    expect(props.onTransactionAdd).toHaveBeenCalledWith({
      transactionData: expect.objectContaining({
        amount: '150',
        description: 'Electric Bill',
        category: 'Utilities', // Should be set to the new category
      }),
      newMonthlyCategory: {
        name: 'Utilities',
        budget: 2500,
      },
    });
  });

  it('sends a correct payload when adding a transaction to an existing custom budget', async () => {
    const props = createDefaultProps();
    render(<AddTab {...props} />);

    await userEvent.click(screen.getByRole('button', { name: /custom budget/i }));
    await userEvent.selectOptions(screen.getByLabelText(/custom budget/i), '1'); // Vacation
    await userEvent.selectOptions(screen.getByLabelText(/category within budget/i), 'Flights');
    await userEvent.type(screen.getByLabelText(/amount/i), '12000');
    await userEvent.type(screen.getByLabelText(/description/i), 'Round trip tickets');

    await userEvent.click(screen.getByRole('button', { name: /add transaction/i }));

    expect(props.onTransactionAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionData: expect.objectContaining({
          budgetType: 'custom',
          customBudgetId: 1,
          customCategory: 'Flights',
          amount: '12000',
        }),
      })
    );
  });

  it('sends a complete payload when adding a transaction with a new custom category', async () => {
    const props = createDefaultProps();
    render(<AddTab {...props} />);

    await userEvent.click(screen.getByRole('button', { name: /custom budget/i }));
    await userEvent.selectOptions(screen.getByLabelText(/custom budget/i), '1');
    await userEvent.selectOptions(screen.getByLabelText(/category within budget/i), 'add_new_custom');

    await userEvent.type(screen.getByPlaceholderText(/new category name/i), 'Souvenirs');
    await userEvent.type(screen.getByPlaceholderText('Budget'), '5000');
    await userEvent.type(screen.getByLabelText(/amount/i), '800');

    await userEvent.click(screen.getByRole('button', { name: /add transaction/i }));

    expect(props.onTransactionAdd).toHaveBeenCalledWith({
      transactionData: expect.objectContaining({ customCategory: 'Souvenirs', amount: '800' }),
      newCustomCategory: { budgetId: 1, name: 'Souvenirs', budget: 5000 },
    });
  });

  describe('Feature Gating', () => {
    it('disables Custom Budget and Recurring toggles for free users', () => {
      (hasAccessTo as Mock).mockImplementation((feature: Feature) => {
        return feature !== Feature.CustomBudgets && feature !== Feature.RecurringTransactions;
      });

      const props = createDefaultProps();
      render(<AddTab {...props} />);

      expect(screen.getByRole('button', { name: /custom/i })).toBeDisabled();
      expect(screen.getByLabelText(/recurring transaction/i)).toBeDisabled();
    });

    it('enables Custom Budget and Recurring toggles for premium users', () => {
      (hasAccessTo as Mock).mockReturnValue(true);
      const props = createDefaultProps();
      render(<AddTab {...props} />);

      expect(screen.getByRole('button', { name: /custom/i })).not.toBeDisabled();
      expect(screen.getByLabelText(/recurring transaction/i)).not.toBeDisabled();
    });
  });

  describe('Editing Transaction', () => {
    const editingTransaction: Transaction = {
      id: 123,
      amount: -50,
      category: 'Food',
      description: 'Editing this',
      date: '2024-01-10',
      type: 'expense',
      budgetType: 'monthly',
      customBudgetId: null,
      customCategory: '',
      tags: ['edit-test'],
      isRecurring: false,
      recurringFrequency: null,
      timestamp: new Date().toISOString(),
    };

    it('populates the form with data from editingTransaction', () => {
      const props = { ...createDefaultProps(), editingTransaction };
      render(<AddTab {...props} />);

      expect(screen.getByLabelText(/amount/i)).toHaveValue(50);
      expect(screen.getByLabelText(/description/i)).toHaveValue('Editing this');
      expect(screen.getByLabelText(/category/i)).toHaveValue('Food');
      expect(screen.getByRole('button', { name: /update transaction/i })).toBeInTheDocument();
    });

    it('calls onTransactionUpdate when the update button is clicked', async () => {
      const props = { ...createDefaultProps(), editingTransaction };
      render(<AddTab {...props} />);

      await userEvent.click(screen.getByRole('button', { name: /update transaction/i }));

      expect(props.onTransactionUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionData: expect.objectContaining({
            amount: '50',
          }),
        })
      );
    });
  });
});