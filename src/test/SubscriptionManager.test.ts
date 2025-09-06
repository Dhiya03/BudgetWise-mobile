import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  getTier,
  setTier,
  hasAccessTo,
  isLimitReached,
  Feature,
  Limit,
  Tier,
} from '../subscriptionManager';

describe('subscriptionManager', () => {
  // Mock window.location.reload as it will crash the test runner
  const originalLocation = window.location;
  beforeEach(() => {
    // @ts-ignore
    delete window.location;
    window.location = { ...originalLocation, reload: vi.fn() } as any;
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    // @ts-ignore - Re-assigning read-only property for test cleanup
    delete window.location;
    window.location = originalLocation as any;
  });

  describe('getTier and setTier', () => {
    it('should return "free" as the default tier', () => {
      // Note: The module-level `currentTier` is initialized once.
      // To test the "default" state, we rely on a clean run or a module reset.
      // For this test suite, we assume the initial state is 'free'.
      expect(getTier()).toBe('free');
    });

    it('should set the tier in localStorage and update the internal state', () => {
      setTier('premium');
      expect(localStorage.getItem('budgetwise_tier')).toBe('premium');
      expect(getTier()).toBe('premium');
    });

    it('should call window.location.reload when setting a new tier', () => {
      setTier('plus');
      expect(window.location.reload).toHaveBeenCalledTimes(1);
    });
  });

  describe('hasAccessTo', () => {
    const accessTests: { tier: Tier; feature: Feature; expected: boolean }[] = [
      // Free tier
      { tier: 'free', feature: Feature.Transactions, expected: true },
      { tier: 'free', feature: Feature.CustomBudgets, expected: false },
      { tier: 'free', feature: Feature.FullAnalytics, expected: false },

      // Plus tier
      { tier: 'plus', feature: Feature.Transactions, expected: true },
      { tier: 'plus', feature: Feature.CustomBudgets, expected: true },
      { tier: 'plus', feature: Feature.FullAnalytics, expected: false },
      { tier: 'plus', feature: Feature.Tagging, expected: true },

      // Premium tier
      { tier: 'premium', feature: Feature.Transactions, expected: true },
      { tier: 'premium', feature: Feature.CustomBudgets, expected: true },
      { tier: 'premium', feature: Feature.FullAnalytics, expected: true },
      { tier: 'premium', feature: Feature.CloudSync, expected: true },
    ];

    it.each(accessTests)(
      'should return $expected for $tier tier checking feature $feature',
      ({ tier, feature, expected }) => {
        setTier(tier);
        expect(hasAccessTo(feature)).toBe(expected);
      }
    );
  });

  describe('isLimitReached', () => {
    // Free Tier
    it('should return true if free user reaches monthly budget limit', () => {
      setTier('free');
      expect(isLimitReached(Limit.MonthlyBudgets, 5)).toBe(true);
    });
    it('should return false if free user is under monthly budget limit', () => {
      setTier('free');
      expect(isLimitReached(Limit.MonthlyBudgets, 4)).toBe(false);
    });

    // Plus Tier
    it('should return true if plus user reaches custom budget limit', () => {
      setTier('plus');
      expect(isLimitReached(Limit.CustomBudgets, 3)).toBe(true);
    });
    it('should return false if plus user is under bill reminder limit', () => {
      setTier('plus');
      expect(isLimitReached(Limit.BillReminders, 4)).toBe(false);
    });
    it('should return false for plus user on monthly budgets (Infinity limit)', () => {
      setTier('plus');
      expect(isLimitReached(Limit.MonthlyBudgets, 999)).toBe(false);
    });

    // Premium Tier
    it('should always return false for premium users as limits are Infinity', () => {
      setTier('premium');
      expect(isLimitReached(Limit.MonthlyBudgets, 1000)).toBe(false);
      expect(isLimitReached(Limit.CustomBudgets, 1000)).toBe(false);
      expect(isLimitReached(Limit.BillReminders, 1000)).toBe(false);
    });
  });
});
