import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { useTransactions } from '../hooks/useTransactions';
import { Transaction, TransferEvent, TransactionFormData, CustomBudget } from '../types';

// Define the shape of your context data
interface IDataContext {
  // Transaction State & Functions
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  transferLog: TransferEvent[];
  setTransferLog: React.Dispatch<React.SetStateAction<TransferEvent[]>>;
  editingTransaction: Transaction | null;
  addTransaction: (formData: TransactionFormData) => boolean;
  updateTransaction: (formData: TransactionFormData) => boolean;
  deleteTransaction: (id: number) => void;
  startEditTransaction: (transaction: Transaction) => void;
  cancelEditTransaction: () => void;

  // Budget State & Functions (partially moved for dependency)
  customBudgets: CustomBudget[];
  setCustomBudgets: React.Dispatch<React.SetStateAction<CustomBudget[]>>;
  editingCustomBudget: CustomBudget | null;
  handleEditCustomBudget: (budget: CustomBudget | null) => void;
  recalculateCustomBudgetSpending: (
    currentTransactions: Transaction[],
    currentCustomBudgets: CustomBudget[],
  ) => void;
  getCustomBudgetName: (customBudgetId: number | null) => string;
  getCustomBudgetCategories: (customBudgetId: number | null) => string[];
  getCustomBudgetCategoryBudget: (customBudgetId: number, category: string) => number;
  customCategorySpending: { [budgetId: number]: { [category: string]: number } };
}

const DataContext = createContext<IDataContext | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Step 4: State that useTransactions depends on is lifted into the provider.
  const [customBudgets, setCustomBudgets] = useState<CustomBudget[]>([]);
  const [editingCustomBudget, setEditingCustomBudget] = useState<CustomBudget | null>(null);

  // Step 4: Logic that useTransactions depends on is lifted into the provider.
  const recalculateCustomBudgetSpending = useCallback((
    currentTransactions: Transaction[],
    currentCustomBudgets: CustomBudget[],
  ) => {
    const newCustomBudgets = currentCustomBudgets.map((budget) => {
      const budgetTransactions = currentTransactions.filter((t) => t.customBudgetId === budget.id);
      const spent = budgetTransactions.filter((t) => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const income = budgetTransactions.filter((t) => t.amount > 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const remaining = budget.totalAmount - spent + income;
      const newStatus: 'active' | 'completed' | 'archived' | 'paused' = budget.status === 'paused' || budget.status === 'archived'
        ? budget.status
        : spent >= budget.totalAmount ? 'completed' : 'active';

      return { ...budget, spentAmount: spent, remainingAmount: remaining, status: newStatus, updatedAt: new Date().toISOString() };
    });
    setCustomBudgets(newCustomBudgets);
  }, []);

  // Step 4: The transaction hook is instantiated here, becoming the source of truth.
  const {
    transactions,
    setTransactions,
    transferLog,
    setTransferLog,
    editingTransaction,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    startEditTransaction,
    cancelEditTransaction,
  } = useTransactions({
    recalculateCustomBudgetSpending,
    customBudgets,
  });

  // Step 4: Other related logic is also moved to the provider.
  const getCustomBudgetName = useCallback((customBudgetId: number | null) => {
    if (customBudgetId === null) return 'N/A';
    const budget = customBudgets.find(b => b.id === customBudgetId);
    return budget ? budget.name : 'Unknown Budget';
  }, [customBudgets]);

  const getCustomBudgetCategories = useCallback((customBudgetId: number | null) => {
    const budget = customBudgets.find(b => b.id === customBudgetId);
    return budget ? budget.categories : [];
  }, [customBudgets]);

  const getCustomBudgetCategoryBudget = useCallback((customBudgetId: number, category: string) => {
    const budget = customBudgets.find(b => b.id === customBudgetId);
    return (budget && budget.categoryBudgets?.[category]) || 0;
  }, [customBudgets]);

  const customCategorySpending = useMemo(() => {
    const spendingMap: { [budgetId: number]: { [category: string]: number } } = {};
    transactions.forEach(t => {
      if (t.budgetType === 'custom' && t.customBudgetId && t.customCategory && t.amount < 0) {
        if (!spendingMap[t.customBudgetId]) {
          spendingMap[t.customBudgetId] = {};
        }
        spendingMap[t.customBudgetId][t.customCategory] =
          (spendingMap[t.customBudgetId][t.customCategory] || 0) + Math.abs(t.amount);
      }
    });
    return spendingMap;
  }, [transactions]);

  const handleEditCustomBudget = (budget: CustomBudget | null) => {
    setEditingCustomBudget(budget);
  };

  const value = {
    transactions, setTransactions, transferLog, setTransferLog, editingTransaction,
    addTransaction, updateTransaction, deleteTransaction, startEditTransaction, cancelEditTransaction,
    customBudgets, setCustomBudgets, editingCustomBudget, handleEditCustomBudget,
    recalculateCustomBudgetSpending, getCustomBudgetName, getCustomBudgetCategories,
    getCustomBudgetCategoryBudget, customCategorySpending,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};