import React, { useState } from 'react';
import { Transaction, TransactionFormData, CustomBudget } from '../../types';

interface AddTransactionTabProps {
  formData: TransactionFormData;
  setFormData: React.Dispatch<React.SetStateAction<TransactionFormData>>;
  editingTransaction: Transaction | null;
  categories: string[];
  setCategories: React.Dispatch<React.SetStateAction<string[]>>;
  customBudgets: CustomBudget[];
  getCustomBudgetCategories: (customBudgetId: number | null) => string[];
  addTransaction: () => void;
  updateTransaction: () => void;
  handleCancelTransactionEdit: () => void;
  handleDescriptionChange: (description: string) => void;
  onAddCustomCategory: (budgetId: number, newCategory: string) => void;
  categorySuggestion: string | null;
  setCategorySuggestion: React.Dispatch<React.SetStateAction<string | null>>;
}

const AddTransactionTab: React.FC<AddTransactionTabProps> = ({
  formData,
  setFormData,
  editingTransaction,
  categories,
  setCategories,
  customBudgets,
  getCustomBudgetCategories,
  addTransaction,
  updateTransaction,
  handleCancelTransactionEdit,
  handleDescriptionChange,
  onAddCustomCategory,
  categorySuggestion,
  setCategorySuggestion,
}) => {
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [showCustomCategoryInput, setShowCustomCategoryInput] = useState(false);
  const [newCustomCategory, setNewCustomCategory] = useState('');
  const [selectedCustomBudgetForCategory, setSelectedCustomBudgetForCategory] = useState<number | null>(null);

  const addCategory = () => {
    if (newCategory && !categories.includes(newCategory)) {
      setCategories([...categories, newCategory]);
      setFormData({ ...formData, category: newCategory });
      setNewCategory('');
      setShowCategoryInput(false);
    }
  };

  const addCustomCategory = () => {
    if (newCustomCategory && selectedCustomBudgetForCategory) {
      onAddCustomCategory(selectedCustomBudgetForCategory, newCustomCategory);
      setNewCustomCategory('');
      setShowCustomCategoryInput(false);
      setSelectedCustomBudgetForCategory(null);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          {editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
        </h2>
        
        <div className="space-y-4">
          <div className="flex space-x-2">
            <button
              onClick={() => setFormData({ ...formData, type: 'expense' })}
              className={`flex-1 p-3 rounded-xl font-medium transition-colors ${
                formData.type === 'expense'
                  ? 'bg-red-100 text-red-700 border-2 border-red-300'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              Expense
            </button>
            <button
              onClick={() => setFormData({ ...formData, type: 'income' })}
              className={`flex-1 p-3 rounded-xl font-medium transition-colors ${
                formData.type === 'income'
                  ? 'bg-green-100 text-green-700 border-2 border-green-300'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              Income
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Budget Type</label>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setFormData({ ...formData, budgetType: 'monthly', customBudgetId: null, customCategory: '' });
                  setCategorySuggestion(null);
                }}
                className={`flex-1 p-3 rounded-xl font-medium transition-colors ${
                  formData.budgetType === 'monthly'
                    ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                Monthly Budget
              </button>
              <button
                onClick={() => {
                  setFormData({ ...formData, budgetType: 'custom', category: '' });
                  setCategorySuggestion(null);
                }}
                className={`flex-1 p-3 rounded-xl font-medium transition-colors ${
                  formData.budgetType === 'custom'
                    ? 'bg-purple-100 text-purple-700 border-2 border-purple-300'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                Custom Budget
              </button>
            </div>
          </div>

          {formData.budgetType === 'monthly' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <div className="space-y-2">
                <select
                  value={formData.category}
                  onChange={(e) => {
                    if (e.target.value === 'add_new') {
                      setShowCategoryInput(true);
                    } else {
                      setFormData({ ...formData, category: e.target.value });
                    }
                  }}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  <option value="add_new">+ Add New Category</option>
                </select>

                {showCategoryInput && (
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="Enter new category"
                      className="flex-1 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                    />
                    <button onClick={addCategory} className="px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700">Add</button>
                    <button onClick={() => setShowCategoryInput(false)} className="px-4 py-3 bg-gray-400 text-white rounded-xl hover:bg-gray-500">Cancel</button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Custom Budget</label>
                <select
                  value={formData.customBudgetId || ''}
                  onChange={(e) => setFormData({ ...formData, customBudgetId: e.target.value ? parseInt(e.target.value) : null, customCategory: '' })}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Select Custom Budget</option>
                  {customBudgets.filter(budget => budget.status === 'active').map(budget => (
                    <option key={budget.id} value={budget.id}>{budget.name} (₹{budget.remainingAmount.toFixed(0)} remaining)</option>
                  ))}
                </select>
                {customBudgets.filter(budget => budget.status === 'active').length === 0 && (
                  <p className="text-sm text-gray-500 mt-2">No active custom budgets. Create one in the Budget tab first.</p>
                )}
              </div>

              {formData.customBudgetId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category within Budget</label>
                  <div className="space-y-2">
                    <select
                      value={formData.customCategory}
                      onChange={(e) => {
                        if (e.target.value === 'add_new_custom') {
                          setShowCustomCategoryInput(true);
                          setSelectedCustomBudgetForCategory(formData.customBudgetId);
                        } else {
                          setFormData({ ...formData, customCategory: e.target.value });
                        }
                      }}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Select Category</option>
                      {getCustomBudgetCategories(formData.customBudgetId).map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                      <option value="add_new_custom">+ Add New Category</option>
                    </select>

                    {showCustomCategoryInput && selectedCustomBudgetForCategory === formData.customBudgetId && (
                      <div className="flex space-x-2">
                        <input type="text" value={newCustomCategory} onChange={(e) => setNewCustomCategory(e.target.value)} placeholder="Enter new category" className="flex-1 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500" />
                        <button onClick={addCustomCategory} className="px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700">Add</button>
                        <button onClick={() => { setShowCustomCategoryInput(false); setSelectedCustomBudgetForCategory(null); setNewCustomCategory(''); }} className="px-4 py-3 bg-gray-400 text-white rounded-xl hover:bg-gray-500">Cancel</button>
                      </div>
                    )}

                    {formData.customBudgetId && getCustomBudgetCategories(formData.customBudgetId).length === 0 && (
                      <p className="text-sm text-gray-500">No categories defined for this budget. Add one above.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
            <input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="0.00" className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
            <input type="text" value={formData.description} onChange={(e) => handleDescriptionChange(e.target.value)} placeholder="Add a note..." className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
            {categorySuggestion && formData.budgetType === 'monthly' && (
              <div className="absolute right-2 top-9 flex items-center">
                <span className="text-xs text-gray-500 mr-2">Suggested:</span>
                <button onClick={() => { setFormData({ ...formData, category: categorySuggestion }); setCategorySuggestion(null); }} className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-md hover:bg-purple-200">{categorySuggestion}</button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tags (comma-separated)</label>
            <input type="text" value={formData.tags} onChange={(e) => setFormData({ ...formData, tags: e.target.value })} placeholder="e.g., travel, business, 2024" className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
            <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="font-medium text-gray-700">Recurring Transaction</label>
              <button onClick={() => setFormData({ ...formData, isRecurring: !formData.isRecurring })} className={`relative w-12 h-6 rounded-full transition-colors ${formData.isRecurring ? 'bg-purple-600' : 'bg-gray-300'}`}>
                <div className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform ${formData.isRecurring ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
            {formData.isRecurring && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
                <select value={formData.recurringFrequency || ''} onChange={(e) => setFormData({ ...formData, recurringFrequency: e.target.value as any })} className="w-full p-3 border border-gray-300 rounded-xl">
                  <option value="">Select Frequency</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            )}
          </div>

          <button onClick={editingTransaction ? updateTransaction : addTransaction} className="w-full p-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-all">
            {editingTransaction ? 'Update Transaction' : 'Add Transaction'}
          </button>

          {editingTransaction && (
            <button onClick={handleCancelTransactionEdit} className="w-full p-3 bg-gray-400 text-white rounded-xl hover:bg-gray-500">
              Cancel Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddTransactionTab;