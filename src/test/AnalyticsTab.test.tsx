import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AnalyticsTab from '../components/AnalyticsTab';
import { hasAccessTo, Feature } from '../subscriptionManager';
import { useAnalytics } from '../hooks/useAnalytics';
import type { Mock } from 'vitest';
import { SupportedLanguage } from '../types';

// Mock the subscriptionManager and the useAnalytics hook
vi.mock('../subscriptionManager');
vi.mock('../hooks/useAnalytics');

const createDefaultProps = () => ({
  transactions: [],
  budgets: {},
  getCustomBudgetName: vi.fn(),
  savingsGoal: 10000,
  setSavingsGoal: vi.fn(),
  dailySpendingGoal: 500,
  setDailySpendingGoal: vi.fn(),
  analyticsTimeframe: 'This Month',
  setAnalyticsTimeframe: vi.fn(),
  handleNavigationRequest: vi.fn(),
  onSetAlert: vi.fn(),
  spendingAlerts: [],
  language: 'en' as SupportedLanguage,
});

const mockAnalyticsData = {
  healthScore: { score: 85, color: 'text-green-600', breakdown: {} },
  cashFlow: { totalIncome: 50000, totalExpenses: 30000, savings: 20000, projectedMonthlySavings: 20000, burnRateDays: Infinity, incomeNeeded: 0, savingsGoal: 10000 },
  categoryInsights: [{ category: 'Food', spending: 12000, trend: 15, smartText: 'High spending on weekends.', largestTransaction: { amount: -1500, description: 'Big dinner' } }],
  personality: {
    personalityKey: 'analytics.personality.weekendSpender',
    insightKey: 'analytics.personality.weekendSpender.insight',
    values: { percent: '65' }
  },
  streak: { streak: 5, isTodayUnder: true },
  runway: { runwayMonths: Infinity, monthlyNet: 20000 },
};

describe('AnalyticsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementations
    (hasAccessTo as Mock).mockReturnValue(true);
    (useAnalytics as Mock).mockReturnValue(mockAnalyticsData);
  });

  it('shows an upgrade message for free users', () => {
    (hasAccessTo as Mock).mockImplementation((feature: Feature) => feature !== Feature.LimitedAnalytics);
    const props = createDefaultProps();
    render(<AnalyticsTab {...props} />);

    expect(screen.getByText(/unlock your financial insights/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view plans/i })).toBeInTheDocument();
  });

  it('renders the full dashboard for premium users', () => {
    (hasAccessTo as Mock).mockImplementation((feature: Feature) => feature === Feature.LimitedAnalytics || feature === Feature.FullAnalytics);
    const props = createDefaultProps();
    render(<AnalyticsTab {...props} />);

    expect(screen.getByText(/analytics dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/financial health score/i)).toBeInTheDocument();
    expect(screen.getByText(/cash flow reality check/i)).toBeInTheDocument();
    expect(screen.getByText(/budget scenario planning/i)).toBeInTheDocument();
  });

  it('hides premium features for plus users', () => {
    (hasAccessTo as Mock).mockImplementation((feature: Feature) => {
      return feature === Feature.LimitedAnalytics;
    });
    const props = createDefaultProps();
    render(<AnalyticsTab {...props} />);

    expect(screen.getByText(/analytics dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/financial health score/i)).toBeInTheDocument();
    // Premium feature that should be hidden
    expect(screen.queryByText(/budget scenario planning/i)).not.toBeInTheDocument();
  });

  it('calls setAnalyticsTimeframe when a timeframe button is clicked', async () => {
    const props = createDefaultProps();
    render(<AnalyticsTab {...props} />);

    const ninetyDaysButton = screen.getByRole('button', { name: /last 90 days/i });
    await userEvent.click(ninetyDaysButton);

    expect(props.setAnalyticsTimeframe).toHaveBeenCalledWith('90');
  });

  it('opens the "Improve Score" modal when the button is clicked', async () => {
    const props = createDefaultProps();
    render(<AnalyticsTab {...props} />);

    const improveButton = screen.getByRole('button', { name: /improve score/i });
    await userEvent.click(improveButton);

    expect(screen.getByText(/how to improve your score/i)).toBeInTheDocument();
  });

  it('allows setting a new savings goal', async () => {
    const props = createDefaultProps();
    render(<AnalyticsTab {...props} />);

    const savingsInput = screen.getByLabelText(/potential savings/i);
    await userEvent.clear(savingsInput);
    await userEvent.type(savingsInput, '12000');

    expect(props.setSavingsGoal).toHaveBeenCalledWith(12000);
  });

  it('opens the set alert modal when clicking the set alert button', async () => {
    const props = createDefaultProps();
    render(<AnalyticsTab {...props} />);

    const setAlertButton = screen.getAllByRole('button', { name: /set alert/i })[0];
    await userEvent.click(setAlertButton);

    expect(screen.getByText(/set alert for "food"/i)).toBeInTheDocument();
  });
});
