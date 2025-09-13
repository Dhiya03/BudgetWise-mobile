import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import BudgetTab from '../components/BudgetTab';
import { BudgetTabProps } from '../types';

// Mock the localization hook
vi.mock('../LocalizationContext', () => ({
  useLocalization: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}));

// Mock the subscription manager
vi.mock('../subscriptionManager', () => ({
  hasAccessTo: vi.fn(() => true),
  isLimitReached: vi.fn(() => false),
}));

const createDefaultProps = (): BudgetTabProps => ({
  monthlyIncome: 10000,
  totalMonthlyBudget: 7500,
  budgetForm: { category: '', amount: '' },
  setBudgetForm: vi.fn(),
  categories: ['Food', 'Transport'],
  budgets: {
    'Food': 5000,
    'Transport': 2500,
  },
  setBudget: vi.fn(),
  onUpdateAllMonthlyBudgets: vi.fn(),
  onDeleteMonthlyBudget: vi.fn(),
  customBudgetFormRef: { current: null },
  editingCustomBudget: null,
  customBudgetForm: { name: '', amount: '', description: '', deadline: '', priority: 'medium', categories: [], categoryBudgets: {} },
  setCustomBudgetForm: vi.fn(),
  handleSaveCustomBudget: vi.fn(),
  handleCancelEdit: vi.fn(),
  saveAsTemplate: vi.fn(),
  budgetTemplates: [],
  selectedTemplate: '',
  setSelectedTemplate: vi.fn(),
  applyTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
  relationshipForm: { sourceCategory: '', destinationBudgetId: '', condition: 'end_of_month_surplus' },
  setRelationshipForm: vi.fn(),
  getRemainingBudget: vi.fn(() => 1000),
  currentYear: 2024,
  currentMonth: 6,
  customBudgets: [],
  addRelationship: vi.fn(),
  budgetRelationships: [],
  getCustomBudgetName: vi.fn(),
  deleteRelationship: vi.fn(),
  processEndOfMonthRollovers: vi.fn(),
  setShowTransferModal: vi.fn(),
  handleLockBudget: vi.fn(),
  pauseCustomBudget: vi.fn(),
  handleEditCustomBudget: vi.fn(),
  deleteCustomBudget: vi.fn(),
  resumeCustomBudget: vi.fn(),
  getCustomBudgetCategoryBudget: vi.fn(),
  customCategorySpending: {},
  transactions: [],
  newCustomCategory: '',
  setNewCustomCategory: vi.fn(),
  addCustomCategoryToForm: vi.fn(),
  getSpentAmount: vi.fn(() => 0),
  removeCategoryFromForm: vi.fn(),
  updateCategoryBudget: vi.fn(),
  language: 'en',
});

describe('BudgetTab - Monthly Budget Overview', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the monthly budget overview in read-only mode by default', () => {
    const props = createDefaultProps();
    render(<BudgetTab {...props} />);

    expect(screen.getByText('Monthly Budget Overview')).toBeInTheDocument();
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Transport')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
  });

  it('switches to edit mode when the edit button is clicked', async () => {
    const props = createDefaultProps();
    render(<BudgetTab {...props} />);

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));

    // Check that inputs are now visible with correct values
    expect(screen.getByLabelText('Food')).toBeInTheDocument();
    expect(screen.getByLabelText('Food')).toHaveValue(5000);
    expect(screen.getByLabelText('Transport')).toHaveValue(2500);

    // Check that Save and Cancel buttons are visible
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /x/i })).toBeInTheDocument(); // Cancel button
  });

  it('updates budget values in edit mode and saves them on click', async () => {
    const props = createDefaultProps();
    render(<BudgetTab {...props} />);

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));

    const foodInput = screen.getByLabelText('Food');
    await userEvent.clear(foodInput);
    await userEvent.type(foodInput, '5500');

    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(props.onUpdateAllMonthlyBudgets).toHaveBeenCalledTimes(1);
    expect(props.onUpdateAllMonthlyBudgets).toHaveBeenCalledWith({
      'Food': 5500,
      'Transport': 2500,
    });

    // Should exit edit mode
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
  });

  it('cancels edit mode and discards changes when cancel is clicked', async () => {
    const props = createDefaultProps();
    render(<BudgetTab {...props} />);

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));

    const foodInput = screen.getByLabelText('Food');
    await userEvent.clear(foodInput);
    await userEvent.type(foodInput, '9999');

    await userEvent.click(screen.getByRole('button', { name: /x/i })); // Cancel button

    expect(props.onUpdateAllMonthlyBudgets).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
  });

  it('calls onDeleteMonthlyBudget when delete button is clicked in edit mode', async () => {
    const props = createDefaultProps();
    render(<BudgetTab {...props} />);

    // Enter edit mode
    await userEvent.click(screen.getByRole('button', { name: /edit/i }));

    // Find the delete button for the 'Food' category by its title
    const deleteButtons = screen.getAllByTitle('Delete Budget');
    expect(deleteButtons).toHaveLength(2); // One for Food, one for Transport

    await userEvent.click(deleteButtons[0]); // Click delete for 'Food'

    expect(props.onDeleteMonthlyBudget).toHaveBeenCalledTimes(1);
    expect(props.onDeleteMonthlyBudget).toHaveBeenCalledWith('Food');
  });
});