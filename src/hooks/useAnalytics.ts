import { useMemo } from 'react';
import { Transaction, MonthlyBudgets } from '../types';
import {
  getCategoryInsights,
  getFinancialHealthScore,
  getCashFlowAnalysis,
  getSpendingPersonality,
  getDailySpendingStreak,
  getFinancialRunway,
} from '../utils/analytics';

interface UseAnalyticsProps {
  transactions: Transaction[];
  budgets: MonthlyBudgets;
  getCustomBudgetName: (id: number | null) => string;
  savingsGoal: number;
  dailySpendingGoal: number;
  analyticsTimeframe: string;
}

export const useAnalytics = ({
  transactions,
  budgets,
  getCustomBudgetName,
  savingsGoal,
  dailySpendingGoal,
  analyticsTimeframe,
}: UseAnalyticsProps) => {
  const healthScore = useMemo(() => getFinancialHealthScore(transactions, analyticsTimeframe, getCustomBudgetName), [transactions, analyticsTimeframe, getCustomBudgetName]);
  const cashFlow = useMemo(() => getCashFlowAnalysis(transactions, analyticsTimeframe, budgets, savingsGoal), [transactions, analyticsTimeframe, budgets, savingsGoal]);
  const categoryInsights = useMemo(() => getCategoryInsights(transactions, analyticsTimeframe, getCustomBudgetName), [transactions, analyticsTimeframe, getCustomBudgetName]);
  const personality = useMemo(() => getSpendingPersonality(transactions), [transactions]);
  const streak = useMemo(() => getDailySpendingStreak(transactions, dailySpendingGoal, analyticsTimeframe), [transactions, dailySpendingGoal, analyticsTimeframe]);
  const runway = useMemo(() => getFinancialRunway(transactions), [transactions]);

  return {
    healthScore,
    cashFlow,
    categoryInsights,
    personality,
    streak,
    runway,
  };
};