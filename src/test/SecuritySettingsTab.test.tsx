import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SecuritySettings from '../components/SecuritySettings';
import type { ComponentProps } from 'react';

type SecuritySettingsProps = ComponentProps<typeof SecuritySettings>;

const createDefaultProps = (): SecuritySettingsProps => ({
  appPassword: null,
  setAppPassword: vi.fn(),
  onPasswordSet: vi.fn(),
  onPasswordRemoved: vi.fn(),
  showConfirmation: vi.fn((_title, _message, onConfirm) => onConfirm()),
  transactions: [],
  budgets: {},
  customBudgets: [],
  categories: [],
  budgetTemplates: [],
  budgetRelationships: [],
  billReminders: [],
  transferLog: [],
  recurringProcessingMode: 'automatic' as const,
  savingsGoal: 15000,
  dailySpendingGoal: 500,
  analyticsTimeframe: '30',
  spendingAlerts: [],
});

describe('SecuritySettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock alert as it's used in the component
    window.alert = vi.fn();
  });

  it('shows "Set Password" when no password is enabled', () => {
    const props = createDefaultProps();
    render(<SecuritySettings {...props} />);
    expect(screen.getByRole('button', { name: /set/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter 4-digit pin/i)).toBeInTheDocument();
  });

  it('shows "Remove Password" when a password is enabled', () => {
    const props = createDefaultProps();
    props.appPassword = 'some-hashed-password';
    render(<SecuritySettings {...props} />);
    expect(screen.getByRole('button', { name: /remove password/i })).toBeInTheDocument();
  });

  it('calls onPasswordSet when a valid PIN is entered and set', async () => {
    const props = createDefaultProps();
    render(<SecuritySettings {...props} />);
    
    await userEvent.type(screen.getByPlaceholderText(/enter 4-digit pin/i), '1234');
    await userEvent.click(screen.getByRole('button', { name: /set/i }));

    expect(props.onPasswordSet).toHaveBeenCalledWith('1234');
    expect(props.setAppPassword).toHaveBeenCalled();
  });

  it('calls onPasswordRemoved when remove is clicked and confirmed', async () => {
    const props = createDefaultProps();
    props.appPassword = 'some-hashed-password';
    render(<SecuritySettings {...props} />);

    await userEvent.click(screen.getByRole('button', { name: /remove password/i }));

    // The mock for showConfirmation auto-confirms
    expect(props.showConfirmation).toHaveBeenCalled();
    expect(props.onPasswordRemoved).toHaveBeenCalled();
    expect(props.setAppPassword).toHaveBeenCalledWith(null);
  });
});
