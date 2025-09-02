import { useState, useCallback } from 'react';
import { MonthlyBudgets, CustomBudget, Transaction } from '../types';

export const useBudgets = (
  initialMonthlyBudgets: MonthlyBudgets,
  initialCustomBudgets: CustomBudget[],
) => {
  const [budgets, setBudgets] = useState<MonthlyBudgets>(initialMonthlyBudgets);
  const [customBudgets, setCustomBudgets] = useState<CustomBudget[]>(initialCustomBudgets);

  const recalculateCustomBudgetSpending = useCallback((
    currentTransactions: Transaction[],
    budgetsToRecalculate: CustomBudget[]
  ) => {
    const newCustomBudgets = budgetsToRecalculate.map((budget) => {
      const budgetTransactions = currentTransactions.filter(
        (t) => t.customBudgetId === budget.id,
      );

      const spent = budgetTransactions
        .filter((t) => t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      const income = budgetTransactions
        .filter((t) => t.amount > 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      const remaining = budget.totalAmount - spent + income;

      const newStatus: 'active' | 'completed' | 'archived' | 'paused' = budget.status === 'paused' || budget.status === 'archived'
        ? budget.status
        : spent >= budget.totalAmount ? 'completed' : 'active';

      return {
        ...budget,
        spentAmount: spent,
        remainingAmount: remaining,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };
    });
    setCustomBudgets(newCustomBudgets);
  }, []);

  const setMonthlyBudget = (category: string, amount: number) => {
    const newBudgets = {
      ...budgets,
      [category]: amount
    };
    setBudgets(newBudgets);
  };

  const addCustomBudget = (newBudget: CustomBudget) => {
    setCustomBudgets(prev => [...prev, newBudget]);
  };

  const updateCustomBudgetWithRecalculation = (
    updatedBudget: CustomBudget,
    transactions: Transaction[]
  ) => {
    const updatedList = customBudgets.map(b =>
      b.id === updatedBudget.id ? updatedBudget : b
    );
    recalculateCustomBudgetSpending(transactions, updatedList);
  };

  const pauseCustomBudget = (budgetId: number) => {
    setCustomBudgets(prev => prev.map(budget =>
      budget.id === budgetId
        ? { ...budget, status: 'paused', updatedAt: new Date().toISOString() }
        : budget
    ));
  };

  const resumeCustomBudget = (budgetId: number) => {
    setCustomBudgets(prev => prev.map(budget =>
      budget.id === budgetId
        ? { ...budget, status: 'active', updatedAt: new Date().toISOString() }
        : budget
    ));
  };

  const removeCustomBudgetAndTransactions = (budgetId: number) => {
    const newCustomBudgets = customBudgets.filter(b => b.id !== budgetId);
    setCustomBudgets(newCustomBudgets);
    // Note: Transaction filtering will happen in the main App component
    // as this hook shouldn't control the transactions state directly.
  };

  return {
    budgets,
    setBudgets,
    customBudgets,
    setCustomBudgets,
    recalculateCustomBudgetSpending,
    setMonthlyBudget,
    addCustomBudget,
    updateCustomBudgetWithRecalculation,
    pauseCustomBudget,
    resumeCustomBudget,
    removeCustomBudgetAndTransactions,
  };
};

