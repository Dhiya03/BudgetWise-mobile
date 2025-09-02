import { useState } from 'react';
import { Transaction } from '../types';

export const useTransactions = (
  initialTransactions: Transaction[],
  onUpdate: (newTransactions: Transaction[]) => void
) => {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);

  const addTransaction = (transaction: Transaction) => {
    const newTransactions = [...transactions, transaction];
    setTransactions(newTransactions);
    onUpdate(newTransactions);
  };

  const updateTransaction = (updatedTransaction: Transaction) => {
    const newTransactions = transactions.map(t =>
      t.id === updatedTransaction.id ? updatedTransaction : t
    );
    setTransactions(newTransactions);
    onUpdate(newTransactions);
  };

  const deleteTransactionById = (id: number) => {
    const newTransactions = transactions.filter((t) => t.id !== id);
    setTransactions(newTransactions);
    onUpdate(newTransactions);
  };

  return {
    transactions,
    setTransactions,
    addTransaction,
    updateTransaction,
    deleteTransactionById,
  };
};
