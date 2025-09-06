import React, { useState, useMemo } from 'react';
import { XCircle, Edit3, Trash2, ArrowRight } from 'lucide-react';
import { Transaction, CustomBudget, TransferEvent } from '../types';

type HistoryItem = (Transaction & { itemType: 'transaction', sortDate: Date }) | (TransferEvent & { itemType: 'transfer', sortDate: Date });

interface HistoryTabProps {
  transactions: Transaction[];
  transferLog: TransferEvent[];
  currentYear: number;
  currentMonth: number;
  filterCategory: string;
  setFilterCategory: (value: string) => void;
  filterTag: string;
  setFilterTag: (value: string) => void;
  categories: string[];
  customBudgets: CustomBudget[];
  allTags: string[];
  editTransaction: (transaction: Transaction) => void;
  deleteTransaction: (id: number) => void;
  getCustomBudgetName: (id: number | null) => string;
}

const HistoryTab: React.FC<HistoryTabProps> = ({
  transactions,
  transferLog,
  currentYear,
  currentMonth,
  filterCategory,
  setFilterCategory,
  filterTag,
  setFilterTag,
  categories,
  customBudgets,
  allTags,
  editTransaction,
  deleteTransaction,
  getCustomBudgetName,
}) => {
  const [sortBy, setSortBy] = useState('date');
  const [searchTerm, setSearchTerm] = useState('');

  const sortedAndFilteredHistory = useMemo(() => {
    const transactionItems = transactions.map(t => ({ ...t, itemType: 'transaction' as const, sortDate: new Date(t.timestamp) }));
    const transferItems = transferLog.map(t => ({ ...t, itemType: 'transfer' as const, sortDate: new Date(t.date) }));

    let combinedItems: HistoryItem[] = [...transactionItems, ...transferItems]
      .filter(item => {
        const itemDate = item.sortDate;
        return itemDate.getFullYear() === currentYear && itemDate.getMonth() === currentMonth;
      });

    // Apply search term filter
    if (searchTerm) {
      combinedItems = combinedItems.filter(item => {
        if (item.itemType === 'transaction') {
          const t = item;
          const searchableText = t.budgetType === 'custom' && t.customBudgetId
            ? `${getCustomBudgetName(t.customBudgetId) || ''} ${t.customCategory || ''}`.toLowerCase()
            : t.category.toLowerCase();
          
          return searchableText.includes(searchTerm.toLowerCase()) ||
                 (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        if (item.itemType === 'transfer') {
          const fromName = getCustomBudgetName(item.fromBudgetId) || '';
          const toName = getCustomBudgetName(item.toBudgetId) || '';
          const searchableText = `transfer ${fromName} ${toName}`.toLowerCase();
          return searchableText.includes(searchTerm.toLowerCase());
        }
        return false;
      });
    }

    // Apply category filter (only to transactions)
    if (filterCategory) {
      if (filterCategory.startsWith('custom-')) {
        const parts = filterCategory.replace('custom-', '').split('-');
        const customBudgetId = parseInt(parts[0], 10);
        const category = parts.length > 1 ? parts.slice(1).join('-') : null; // Handle categories with hyphens
        combinedItems = combinedItems.filter(item =>
          item.itemType === 'transaction' &&
          item.customBudgetId === customBudgetId &&
          (category ? item.customCategory === category : true));
      } else {
        combinedItems = combinedItems.filter(item => item.itemType === 'transaction' && item.category === filterCategory && item.budgetType !== 'custom');
      }
    }

    // Apply tag filter
    if (filterTag) {
      combinedItems = combinedItems.filter(item => {
        if (item.itemType === 'transaction') {
          if (filterTag === 'Monthly') return item.budgetType === 'monthly' || !item.budgetType;
          if (filterTag === 'Custom') return item.budgetType === 'custom';
          if (filterTag === 'Recurring') return item.tags?.includes('recurring');
          if (filterTag === 'Transfer') return false;
          return item.tags?.includes(filterTag);
        }
        if (item.itemType === 'transfer') return filterTag === 'Transfer';
        return false;
      });
    }

    // Apply sorting
    combinedItems.sort((a, b) => {
      switch (sortBy) {
        case 'amount':
          const aAmount = a.itemType === 'transaction' ? Math.abs(a.amount) : a.itemType === 'transfer' ? a.amount : 0;
          const bAmount = b.itemType === 'transaction' ? Math.abs(b.amount) : b.itemType === 'transfer' ? b.amount : 0;
          if (bAmount !== aAmount) return bAmount - aAmount;
          break;
        case 'category':
          const aName = a.itemType === 'transaction' ? (a.budgetType === 'custom' ? `${getCustomBudgetName(a.customBudgetId) || 'N/A'} - ${a.customCategory || 'Uncategorized'}` : a.category) : 'Fund Transfer';
          const bName = b.itemType === 'transaction' ? (b.budgetType === 'custom' ? `${getCustomBudgetName(b.customBudgetId) || 'N/A'} - ${b.customCategory || 'Uncategorized'}` : b.category) : 'Fund Transfer';
          if (aName.localeCompare(bName) !== 0) return aName.localeCompare(bName);
          break;
        case 'date':
        default:
          break;
      }
      return b.sortDate.getTime() - a.sortDate.getTime();
    });

    return combinedItems;
  }, [transactions, transferLog, searchTerm, filterCategory, filterTag, sortBy, currentMonth, currentYear, getCustomBudgetName]);

  return (
    <div className="p-4 space-y-4">
      <div className="bg-white rounded-2xl p-4 shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Transactions</h2>
          <div className="flex space-x-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="p-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="date">Sort by Date</option>
              <option value="amount">Sort by Amount</option>
              <option value="category">Sort by Category</option>
            </select>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search transactions..."
            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
          />
          <div className="relative">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 appearance-none pr-8"
            >
              <option value="">All Transactions</option>
              <optgroup label="Monthly Categories">
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </optgroup>
              <optgroup label="Custom Budget Categories">
                {customBudgets.filter(budget => budget.status === 'active').map(budget =>
                  budget.categories?.map(category => (
                    <option key={`custom-${budget.id}-${category}`} value={`custom-${budget.id}-${category}`}>
                      {budget.name} - {category}
                    </option>
                  ))
                ).flat()}
              </optgroup>
            </select>
            {filterCategory && (
              <button onClick={() => setFilterCategory('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600" aria-label="Clear category filter">
                <XCircle size={18} />
              </button>
            )}
          </div>

          <div className="relative">
            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 appearance-none pr-8"
            >
              <option value="">Filter by Tag</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
            {filterTag && (
              <button onClick={() => setFilterTag('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600" aria-label="Clear tag filter">
                <XCircle size={18} />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto" style={{ paddingRight: '8px' }}>
          {sortedAndFilteredHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No transactions found</p>
            </div>
          ) : (
            sortedAndFilteredHistory.map(item => {
              if (item.itemType === 'transaction') {
                const transaction = item as Transaction;
                const budget = transaction.customBudgetId ? customBudgets.find(b => b.id === transaction.customBudgetId) : null;
                const isLockedOrPaused = !!(budget && (budget.status === 'locked' || budget.status === 'paused'));

                return (
                  <div key={`txn-${transaction.id}`} className="bg-gray-50 rounded-xl p-4 flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="font-semibold text-gray-800 truncate" title={transaction.budgetType === 'custom' && transaction.customBudgetId ? `${getCustomBudgetName(transaction.customBudgetId)} - ${transaction.customCategory || 'Uncategorized'}` : transaction.category || 'Uncategorized'}>
                          {transaction.budgetType === 'custom' && transaction.customBudgetId
                            ? `${getCustomBudgetName(transaction.customBudgetId)} - ${transaction.customCategory || 'Uncategorized'}`
                            : transaction.category || 'Uncategorized'}
                        </p>
                        <span className={`flex-shrink-0 px-2 py-1 rounded-full text-xs font-medium ${transaction.budgetType === 'custom' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                          {transaction.budgetType === 'custom' ? 'Custom' : 'Monthly'}
                        </span>
                        {transaction.tags?.includes('recurring') && (
                          <span className="flex-shrink-0 px-2 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                            Recurring
                          </span>
                        )}
                      </div>
                      {transaction.description && <p className="text-sm text-gray-600 truncate">{transaction.description}</p>}
                      <div className="flex justify-between items-center mt-2">
                        <p className="text-xs text-gray-500">{transaction.date}</p>
                        <p className={`font-bold text-sm ${transaction.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {transaction.amount < 0 ? '-' : '+'}₹{Math.abs(transaction.amount).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="flex-shrink-0 flex space-x-1">
                      <button
                        onClick={() => editTransaction(transaction)}
                        disabled={isLockedOrPaused}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        title={isLockedOrPaused ? `Cannot edit from a ${budget?.status} budget` : "Edit Transaction"}
                      ><Edit3 size={16} /></button>
                      <button
                        onClick={() => deleteTransaction(transaction.id)}
                        disabled={isLockedOrPaused}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        title={isLockedOrPaused ? `Cannot delete from a ${budget?.status} budget` : "Delete Transaction"}
                      ><Trash2 size={16} /></button>
                    </div>
                  </div>
                );
              } else { // item.itemType === 'transfer'
                const transfer = item as TransferEvent;
                return (
                  <div key={`transfer-${transfer.id}`} className="bg-indigo-50 rounded-xl p-4 flex items-start gap-4">
                    <div className="flex-shrink-0 bg-indigo-100 text-indigo-600 rounded-full p-2 mt-1"><ArrowRight size={18} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="font-semibold text-indigo-800">Fund Transfer</p>
                        <span className="flex-shrink-0 px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          Transfer
                        </span>
                      </div>
                      <div className="text-sm text-gray-700 mt-1 space-y-1">
                        <p className="truncate" title={`From: ${getCustomBudgetName(transfer.fromBudgetId)} (${transfer.fromCategory})`}><span className="font-medium">From:</span> {getCustomBudgetName(transfer.fromBudgetId)} ({transfer.fromCategory})</p>
                        <p className="truncate" title={`To: ${getCustomBudgetName(transfer.toBudgetId)}`}><span className="font-medium">To:</span> {getCustomBudgetName(transfer.toBudgetId)}</p>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <p className="text-xs text-gray-500">{new Date(transfer.date).toLocaleString()}</p>
                        <p className="font-bold text-sm text-indigo-600">₹{transfer.amount.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                );
              }
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryTab;