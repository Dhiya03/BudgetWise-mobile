import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HistoryTab from '../components/HistoryTab';
import { hasAccessTo, Feature } from '../subscriptionManager';
import type { Mock } from 'vitest';
import { SupportedLanguage, Transaction } from '../types';

vi.mock('../subscriptionManager');

const sampleTransactions: Transaction[] = [
  { id: 1, amount: -50, description: 'Coffee', category: 'Food', date: '2024-03-15', type: 'expense', budgetType: 'monthly', customBudgetId: null, customCategory: '', tags: ['morning'], isRecurring: false, recurringFrequency: null, timestamp: '2024-03-15T09:00:00.000Z' },
  { id: 2, amount: -120, description: 'Train ticket', category: 'Transport', date: '2024-03-14', type: 'expense', budgetType: 'monthly', customBudgetId: null, customCategory: '', tags: ['work'], isRecurring: false, recurringFrequency: null, timestamp: '2024-03-14T08:00:00.000Z' },
  { id: 3, amount: 2000, description: 'Salary', category: 'Income', date: '2024-03-01', type: 'income', budgetType: 'monthly', customBudgetId: null, customCategory: '', tags: [], isRecurring: false, recurringFrequency: null, timestamp: '2024-03-01T12:00:00.000Z' },
];

const createDefaultProps = () => ({
  transactions: sampleTransactions,
  transferLog: [],
  currentYear: 2024,
  currentMonth: 2, // March
  filterCategory: '',
  setFilterCategory: vi.fn(),
  filterTag: '',
  setFilterTag: vi.fn(),
  categories: ['Food', 'Transport', 'Income'],
  customBudgets: [],
  allTags: ['morning', 'work'],
  editTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
  getCustomBudgetName: vi.fn(),
  language: 'en' as SupportedLanguage,
});

describe('HistoryTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to premium user to have all features enabled
    (hasAccessTo as Mock).mockReturnValue(true);
  });

  it('renders all transactions by default', () => {
    const props = createDefaultProps();
    render(<HistoryTab {...props} />);

    expect(screen.getByText(/Coffee/i)).toBeInTheDocument();
    expect(screen.getByText(/Train ticket/i)).toBeInTheDocument();
    expect(screen.getByText(/Salary/i)).toBeInTheDocument();
    // The component uses divs, not LIs. We find the card and check the items inside.
    const card = screen.getByText(/transactions/i).closest('.p-4.shadow-lg');
    const items = card?.querySelectorAll('.bg-gray-50, .bg-indigo-50');
    expect(items).toHaveLength(3);
  });

  it('filters transactions by search term', async () => {
    const props = createDefaultProps();
    render(<HistoryTab {...props} />);

    const searchInput = screen.getByPlaceholderText(/search by description/i);
    await userEvent.type(searchInput, 'Coffee');

    expect(screen.getByText(/Coffee/i)).toBeInTheDocument();
    expect(screen.queryByText(/Train ticket/i)).not.toBeInTheDocument();
    const card = screen.getByText(/transactions/i).closest('.p-4.shadow-lg');
    const items = card?.querySelectorAll('.bg-gray-50, .bg-indigo-50');
    expect(items).toHaveLength(1);
  });

  it('filters transactions by category', async () => {
    const props = createDefaultProps();
    render(<HistoryTab {...props} />);

    // The select element lacks a proper label, so we find it by its default displayed value.
    const categoryFilter = screen.getByDisplayValue(/all transactions/i);
    await userEvent.selectOptions(categoryFilter, 'Transport');

    expect(props.setFilterCategory).toHaveBeenCalledWith('Transport');
  });

  it('calls editTransaction when edit button is clicked', async () => {
    const props = createDefaultProps();
    render(<HistoryTab {...props} />);

    // Get all edit buttons and click the first one (for 'Coffee')
    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    await userEvent.click(editButtons[0]);

    expect(props.editTransaction).toHaveBeenCalledWith(sampleTransactions[0]);
  });

  it('calls deleteTransaction when delete button is clicked', async () => {
    const props = createDefaultProps();
    render(<HistoryTab {...props} />);

    // Get all delete buttons and click the second one (for 'Train ticket')
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await userEvent.click(deleteButtons[1]);

    expect(props.deleteTransaction).toHaveBeenCalledWith(sampleTransactions[1].id);
  });

  it('sorts transactions by amount (high to low) to match component behavior', async () => {
    const props = createDefaultProps();
    render(<HistoryTab {...props} />);

    // The select element lacks a proper label, so we find it by its default displayed value.
    await userEvent.selectOptions(screen.getByDisplayValue(/sort by date/i), 'amount');

    // The component's original logic sorts by absolute amount, descending (High-Low)
    const card = screen.getByText(/transactions/i).closest('.p-4.shadow-lg');
    const listItems = card?.querySelectorAll('.bg-gray-50, .bg-indigo-50');
    expect(listItems).not.toBeNull();
    if (!listItems) return;

    // Expected order: Salary (2000), Train ticket (120), Coffee (50)
    expect(listItems[0]).toHaveTextContent(/Salary/i);
    expect(listItems[1]).toHaveTextContent(/Train ticket/i);
    expect(listItems[2]).toHaveTextContent(/Coffee/i);
  });

  describe('Feature Gating', () => {
    it('filters transactions by tag', async () => {
      const props = createDefaultProps();
      render(<HistoryTab {...props} />);
      // The select element lacks a proper label, so we find it by its default displayed value.
      await userEvent.selectOptions(screen.getByDisplayValue(/filter by tag/i), 'work');
      expect(props.setFilterTag).toHaveBeenCalledWith('work');
    });

    it('disables tag filter for free users', () => {
      (hasAccessTo as Mock).mockImplementation((feature: Feature) => feature !== Feature.Tagging);

      const props = createDefaultProps();
      render(<HistoryTab {...props} />);

      expect(screen.getByDisplayValue(/filter by tag/i)).toBeDisabled();
    });

    it('enables tag filter for premium users', () => {
      (hasAccessTo as Mock).mockReturnValue(true);
      const props = createDefaultProps();
      render(<HistoryTab {...props} />);

      expect(screen.getByDisplayValue(/filter by tag/i)).not.toBeDisabled();
    });
  });
});