import { useState, useCallback } from 'react';
import { Transaction, TransferEvent, TransactionFormData, CustomBudget } from '../types';

// The useTransactions hook is created to encapsulate all transaction logic.
interface UseTransactionsProps {
  recalculateCustomBudgetSpending: (
    currentTransactions: Transaction[],
    currentCustomBudgets: CustomBudget[],
  ) => void;
  customBudgets: CustomBudget[];
}

export const useTransactions = ({
  recalculateCustomBudgetSpending,
  customBudgets,
}: UseTransactionsProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transferLog, setTransferLog] = useState<TransferEvent[]>([]);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const addTransaction = useCallback((formData: TransactionFormData) => {
    if (!formData.amount) return false;
    if (formData.budgetType === 'monthly' && !formData.category) return false;
    if (formData.budgetType === 'custom' && (!formData.customBudgetId || !formData.customCategory)) return false;

    const transaction: Transaction = {
      id: Date.now(),
      ...formData,
      category: formData.budgetType === 'custom' ? '' : formData.category,
      amount: parseFloat(formData.amount) * (formData.type === 'expense' ? -1 : 1),
      tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : [],
      timestamp: new Date().toISOString()
    };

    const newTransactions = [...transactions, transaction];
    setTransactions(newTransactions);
    recalculateCustomBudgetSpending(newTransactions, customBudgets);
    return true; // Return success status
  }, [transactions, customBudgets, recalculateCustomBudgetSpending]);

  const updateTransaction = useCallback((formData: TransactionFormData) => {
    if (!formData.amount || !editingTransaction) return false;
    if (formData.budgetType === 'monthly' && !formData.category) return false;
    if (formData.budgetType === 'custom' && (!formData.customBudgetId || !formData.customCategory)) return false;

    const newAmount = parseFloat(formData.amount) * (formData.type === 'expense' ? -1 : 1);

    const updatedTransactions = transactions.map(t =>
      t.id === editingTransaction.id
        ? {
            ...t,
            ...formData,
            category: formData.budgetType === 'custom' ? '' : formData.category,
            amount: newAmount,
            tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : [],
          }
        : t
    );

    setTransactions(updatedTransactions);
    setEditingTransaction(null);
    recalculateCustomBudgetSpending(updatedTransactions, customBudgets);
    return true; // Return success status
  }, [transactions, editingTransaction, customBudgets, recalculateCustomBudgetSpending]);

  const deleteTransaction = useCallback((id: number) => {
    const transactionToDelete = transactions.find(t => t.id === id);
    if (!transactionToDelete) return;

    const newTransactions = transactions.filter((t) => t.id !== id);
    setTransactions(newTransactions);
    recalculateCustomBudgetSpending(newTransactions, customBudgets);
  }, [transactions, customBudgets, recalculateCustomBudgetSpending]);

  const startEditTransaction = useCallback((transaction: Transaction) => {
    setEditingTransaction(transaction);
  }, []);

  const cancelEditTransaction = useCallback(() => {
    setEditingTransaction(null);
  }, []);

  return {
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
  };
};