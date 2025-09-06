import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BillReminderTab from '../components/BillReminderTab';
import { isLimitReached, Limit } from '../subscriptionManager';
import type { Mock } from 'vitest';
import { BillReminder } from '../types';

vi.mock('../subscriptionManager');

const sampleReminders: BillReminder[] = [
  { id: 1, name: 'Credit Card', amount: 5000, dueDate: '2024-12-20' },
  { id: 2, name: 'Internet Bill', amount: 800, dueDate: '2024-12-15' },
];

const createDefaultProps = () => ({
  billReminders: sampleReminders,
  setBillReminders: vi.fn(),
  showConfirmation: vi.fn((_title, _message, onConfirm) => onConfirm()), // Auto-confirm for tests
});

describe('BillReminderTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to no limits reached
    (isLimitReached as Mock).mockReturnValue(false);
  });

  it('renders the list of existing bill reminders', () => {
    const props = createDefaultProps();
    render(<BillReminderTab {...props} />);

    expect(screen.getByText('Credit Card')).toBeInTheDocument();
    expect(screen.getByText('Internet Bill')).toBeInTheDocument();

    // The component uses divs, not LIs. We find the list container and query within it.
    const listContainer = screen.getByText(/upcoming bills/i).closest('div');
    const listItems = listContainer?.querySelectorAll('.bg-gray-50');
    expect(listItems).not.toBeNull();
    if (!listItems) return; // Add type guard to satisfy TypeScript
    expect(listItems.length).toBe(2);

    // Sorted by due date
    expect(listItems[0]).toHaveTextContent('Internet Bill');
    expect(listItems[1]).toHaveTextContent('Credit Card');
  });

  it('allows adding a new bill reminder', async () => {
    const props = createDefaultProps();
    render(<BillReminderTab {...props} />);

    await userEvent.type(screen.getByPlaceholderText(/bill name/i), 'Rent');
    await userEvent.type(screen.getByPlaceholderText(/amount/i), '20000');
    // Note: userEvent.type on date input is tricky, we'll check the final state

    await userEvent.click(screen.getByRole('button', { name: /add reminder/i }));

    expect(props.setBillReminders).toHaveBeenCalled();
    const updaterFn = props.setBillReminders.mock.calls[0][0];
    const newState = updaterFn(sampleReminders) as BillReminder[];
    expect(newState).toHaveLength(3);
    expect(newState[2].name).toBe('Rent');
    expect(newState[2].amount).toBe(20000);
  });

  it('does not add a reminder if form is incomplete', async () => {
    const props = createDefaultProps();
    render(<BillReminderTab {...props} />);

    await userEvent.type(screen.getByPlaceholderText(/bill name/i), 'Incomplete');
    await userEvent.click(screen.getByRole('button', { name: /add reminder/i }));

    expect(props.setBillReminders).not.toHaveBeenCalled();
  });

  it('allows editing a bill reminder', async () => {
    const props = createDefaultProps();
    render(<BillReminderTab {...props} />);

    // Click the edit button for 'Internet Bill'
    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    await userEvent.click(editButtons[0]); // It's the first in the sorted list

    expect(screen.getByPlaceholderText(/bill name/i)).toHaveValue('Internet Bill');
    expect(screen.getByRole('button', { name: /update reminder/i })).toBeInTheDocument();

    const amountInput = screen.getByPlaceholderText(/amount/i);
    await userEvent.clear(amountInput);
    await userEvent.type(amountInput, '900');
    await userEvent.click(screen.getByRole('button', { name: /update reminder/i }));

    expect(props.setBillReminders).toHaveBeenCalled();
    const updaterFn = props.setBillReminders.mock.calls[0][0];
    const newState = updaterFn(sampleReminders) as BillReminder[];
    expect(newState.find((r: BillReminder) => r.id === 2)?.amount).toBe(900);
  });

  it('allows deleting a bill reminder', async () => {
    const props = createDefaultProps();
    render(<BillReminderTab {...props} />);

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await userEvent.click(deleteButtons[0]); // Delete 'Internet Bill'

    expect(props.showConfirmation).toHaveBeenCalled();
    expect(props.setBillReminders).toHaveBeenCalled();
    const updaterFn = props.setBillReminders.mock.calls[0][0];
    const newState = updaterFn(sampleReminders) as BillReminder[];
    expect(newState).toHaveLength(1);
    expect(newState.find((r: BillReminder) => r.id === 2)).toBeUndefined();
  });

  it('disables the add button if the reminder limit is reached', () => {
    (isLimitReached as Mock).mockImplementation((limit: Limit) => limit === Limit.BillReminders);
    const props = createDefaultProps();
    render(<BillReminderTab {...props} />);

    expect(screen.getByRole('button', { name: /add reminder/i })).toBeDisabled();
    expect(screen.getByText(/limit reached for your current plan/i)).toBeInTheDocument();
  });
});