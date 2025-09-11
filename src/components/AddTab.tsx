import React, { useState } from 'react';
import { Transaction, TransactionFormData, CustomBudget, MonthlyBudgets } from '../types';
import { hasAccessTo, Feature } from '../subscriptionManager';

import { useLocalization } from '../LocalizationContext';
interface AddTabProps {
  editingTransaction: Transaction | null;
  formData: TransactionFormData;
  setFormData: React.Dispatch<React.SetStateAction<TransactionFormData>>;
  categories: string[];
  customBudgets: CustomBudget[];
  budgets: MonthlyBudgets;
  setCategories: React.Dispatch<React.SetStateAction<string[]>>;
  setBudgets: React.Dispatch<React.SetStateAction<MonthlyBudgets>>;
  setCustomBudgets: React.Dispatch<React.SetStateAction<CustomBudget[]>>;
  onTransactionUpdate: (updateFn: (prev: Transaction[]) => Transaction[], changedTransaction: Transaction) => void;
  onTransactionAdd: (newTransaction: Transaction) => void;
  onCancelEdit: () => void;
  getCustomBudgetCategories: (id: number | null) => string[];
  categorySuggestion: string | null;
  onDescriptionChange: (description: string) => void;
  onSetCategoryFromSuggestion: (category: string) => void;
}

const AddTab: React.FC<AddTabProps> = (props) => {
  const {
    editingTransaction,
    formData,
    setFormData,
    categories,
    customBudgets,
    budgets,
    setCategories,
    setBudgets,
    setCustomBudgets,
    onTransactionAdd,
    onTransactionUpdate,
    onCancelEdit,
    getCustomBudgetCategories,
    categorySuggestion,
    onDescriptionChange,
    onSetCategoryFromSuggestion,
  } = props;

  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [newCategoryBudget, setNewCategoryBudget] = useState('');

  const [showCustomCategoryInput, setShowCustomCategoryInput] = useState(false);
  const [newCustomCategory, setNewCustomCategory] = useState('');
  const [newCustomCategoryBudget, setNewCustomCategoryBudget] = useState('');
  const [selectedCustomBudgetForCategory, setSelectedCustomBudgetForCategory] = useState<number | null>(null);

  const { t } = useLocalization();

  const handleAddNewMonthlyCategory = () => {
    if (newCategory && !categories.includes(newCategory) && newCategoryBudget) {
      const newCategories = [...categories, newCategory];
      setCategories(newCategories);
      const newBudgets = { ...budgets, [newCategory]: parseFloat(newCategoryBudget) };
      setBudgets(newBudgets);
      setFormData({ ...formData, category: newCategory }); // Select the new category
      setNewCategory('');
      setNewCategoryBudget('');
      setShowCategoryInput(false);
    } else {
      alert(t('addTab.validation.newCategory'));
    }
  };

  const handleAddNewCustomCategory = () => {
    if (newCustomCategory && selectedCustomBudgetForCategory && newCustomCategoryBudget) {
      const newCategoryBudgetAmount = parseFloat(newCustomCategoryBudget);
      const updatedCustomBudgets = customBudgets.map(budget =>
        budget.id === selectedCustomBudgetForCategory
          ? {
              ...budget,
              categories: [...budget.categories, newCustomCategory],
              categoryBudgets: { ...budget.categoryBudgets, [newCustomCategory]: newCategoryBudgetAmount },
              // Also update the parent budget's total amount
              totalAmount: budget.totalAmount + newCategoryBudgetAmount,
              remainingAmount: budget.remainingAmount + newCategoryBudgetAmount,
              updatedAt: new Date().toISOString(),
            }
          : budget
      );
      setCustomBudgets(updatedCustomBudgets);
      setFormData({ ...formData, customCategory: newCustomCategory }); // Select the new category
      setNewCustomCategory('');
      setNewCustomCategoryBudget('');
      setShowCustomCategoryInput(false);
      setSelectedCustomBudgetForCategory(null);
    } else {
      alert(t('addTab.validation.newCustomCategory'));
    }
  };

  const handleAddOrUpdateTransaction = () => {
    let currentFormData = { ...formData };
    const isUpdate = !!editingTransaction;

    // --- Finish the transaction ---
    if (!currentFormData.amount) return;

    if (currentFormData.budgetType === 'monthly' && !currentFormData.category) {
      alert(t('addTab.validation.selectCategory'));
      return;
    }
    if (currentFormData.budgetType === 'custom' && (!currentFormData.customBudgetId || !currentFormData.customCategory)) {
      alert(t('addTab.validation.selectCustomBudget'));
      return;
    }

    if (currentFormData.budgetType === 'custom' && currentFormData.customBudgetId) {
      const budget = customBudgets.find(b => b.id === currentFormData.customBudgetId);
      if (budget && (budget.status === 'locked' || budget.status === 'paused')) {
        alert(t('addTab.validation.budgetStatus').replace('{status}', budget.status));
        return;
      }
      if (budget && budget.deadline) {
        const transactionDate = new Date(currentFormData.date + 'T00:00:00');
        const deadlineDate = new Date(budget.deadline + 'T00:00:00');
        if (transactionDate > deadlineDate) {
          alert(t('addTab.validation.deadline').replace('{transactionDate}', currentFormData.date).replace('{deadlineDate}', budget.deadline));
          return;
        }
      }
    }

    if (isUpdate && editingTransaction) {
      const newAmount = parseFloat(currentFormData.amount) * (currentFormData.type === 'expense' ? -1 : 1);
      const updatedTransaction = {
        ...editingTransaction,
        ...currentFormData,
        category: currentFormData.budgetType === 'custom' ? '' : currentFormData.category,
        amount: newAmount,
        tags: currentFormData.tags ? currentFormData.tags.split(',').map(tag => tag.trim()) : [],
      };
      onTransactionUpdate(
        (prev: Transaction[]) => prev.map((t: Transaction) => (t.id === editingTransaction.id ? updatedTransaction : t)),
        updatedTransaction
      );
    } else {
      const newTransaction: Transaction = {
        id: Date.now(),
        ...currentFormData,
        category: currentFormData.budgetType === 'custom' ? '' : currentFormData.category,
        amount: parseFloat(currentFormData.amount) * (currentFormData.type === 'expense' ? -1 : 1),
        tags: currentFormData.tags ? currentFormData.tags.split(',').map(tag => tag.trim()) : [],
        timestamp: new Date().toISOString()
      };
      onTransactionAdd(newTransaction);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          {editingTransaction ? t('editTransaction.title', 'Edit Transaction') : t('addTransaction.title', 'Add Transaction')}
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
              {t('addTab.expense')}
            </button>
            <button
              onClick={() => setFormData({ ...formData, type: 'income', budgetType: 'monthly', category: 'Income' })}
              className={`flex-1 p-3 rounded-xl font-medium transition-colors ${ 
                formData.type === 'income'
                  ? 'bg-green-100 text-green-700 border-2 border-green-300'
                  : 'bg-gray-100 text-gray-600'
              }`}
            > 
              {t('addTab.income')}
            </button>
          </div>

          {formData.type === 'expense' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('addTab.budgetType')}</label>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setFormData({ ...formData, budgetType: 'monthly', customBudgetId: null, customCategory: '' });
                    onDescriptionChange(formData.description); // Re-trigger suggestion check
                  }}
                  className={`flex-1 p-3 rounded-xl font-medium transition-colors ${ 
                    formData.budgetType === 'monthly'
                      ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                > 
                  {t('addTab.monthlyBudget')}
                </button>
                <button
                  onClick={() => {
                    setFormData({ ...formData, budgetType: 'custom', category: '' });
                    onDescriptionChange(''); // Clear suggestion
                  }}
                  className={`flex-1 p-3 rounded-xl font-medium transition-colors ${ 
                    formData.budgetType === 'custom'
                      ? 'bg-purple-100 text-purple-700 border-2 border-purple-300'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                  disabled={!hasAccessTo(Feature.CustomBudgets)} 
                > 
                  {t('addTab.customBudget')}
                </button>
              </div>
            </div>
          )}

          {formData.type === 'expense' && formData.budgetType === 'monthly' && ( 
            <div> 
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('addTab.category')}</label>
              <div className="space-y-2">
                <select
                  value={formData.category}
                    onChange={e => {
                    if (e.target.value === 'add_new') {
                      setShowCategoryInput(true);
                        setFormData({ ...formData, category: '' });
                    } else {
                        setShowCategoryInput(false);
                        setNewCategory('');
                        setNewCategoryBudget('');
                      setFormData({ ...formData, category: e.target.value });
                    }
                  }}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                > 
                  <option value="">{t('addTab.selectCategory')}</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  <option value="add_new">{t('addTab.addNewCategory')}</option>
                </select>

                {showCategoryInput && (
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="space-y-2">
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                          placeholder={t('addTab.newCategoryPlaceholder')}
                          className="flex-1 min-w-0 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                        />
                        <input
                          type="number"
                          value={newCategoryBudget}
                          onChange={(e) => setNewCategoryBudget(e.target.value)}
                          placeholder={t('addTab.budgetPlaceholder')}
                          className="w-28 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <button onClick={handleAddNewMonthlyCategory} className="w-full p-2 text-sm bg-purple-600 text-white rounded-lg">{t('general.add')}</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {formData.type === 'expense' && formData.budgetType === 'custom' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('addTab.customBudget')}</label>
                <select
                  value={formData.customBudgetId || ''}
                  onChange={(e) => setFormData({ 
                    ...formData,
                    customBudgetId: e.target.value ? parseInt(e.target.value) : null,
                    customCategory: ''
                  })}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                > 
                  <option value="">{t('addTab.selectCustomBudget')}</option>
                  {customBudgets.filter(budget => budget.status === 'active').map(budget => (
                    <option key={budget.id} value={budget.id}> 
                      {t('addTab.customBudgetNameWithRemaining').replace('{name}', budget.name).replace('{amount}', budget.remainingAmount.toFixed(0))}
                    </option>
                  ))}
                </select>
                {customBudgets.filter(budget => budget.status === 'active').length === 0 && (
                  <p className="text-sm text-gray-500 mt-2"> 
                    {t('addTab.noActiveCustomBudgets')}
                  </p>
                )}
              </div>

              {formData.customBudgetId && ( 
                <div> 
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('addTab.categoryInBudget')}</label>
                  <div className="space-y-2">
                    <select
                      value={formData.customCategory}
                        onChange={e => {
                        if (e.target.value === 'add_new_custom') {
                          setShowCustomCategoryInput(true);
                          setSelectedCustomBudgetForCategory(formData.customBudgetId);
                            setFormData({ ...formData, customCategory: '' });
                        } else {
                            setShowCustomCategoryInput(false);
                            setSelectedCustomBudgetForCategory(null);
                            setNewCustomCategory('');
                            setNewCustomCategoryBudget('');
                          setFormData({ ...formData, customCategory: e.target.value });
                        }
                      }}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    > 
                      <option value="">{t('addTab.selectCategory')}</option>
                      {getCustomBudgetCategories(formData.customBudgetId).map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="add_new_custom">{t('addTab.addNewCategory')}</option>
                    </select>

                    {showCustomCategoryInput && selectedCustomBudgetForCategory === formData.customBudgetId && (
                      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="space-y-2">
                          <div className="flex space-x-2">
                            <input
                              type="text"
                              value={newCustomCategory}
                              onChange={(e) => setNewCustomCategory(e.target.value)}
                              placeholder={t('addTab.newCategoryPlaceholder')}
                              className="flex-1 min-w-0 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                            />
                            <input
                              type="number"
                              value={newCustomCategoryBudget}
                              onChange={(e) => setNewCustomCategoryBudget(e.target.value)}
                              placeholder={t('addTab.budgetPlaceholder')}
                              className="w-28 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                          <button onClick={handleAddNewCustomCategory} className="w-full p-2 text-sm bg-purple-600 text-white rounded-lg">{t('general.add')}</button>
                        </div>
                      </div>
                    )}

                    {formData.customBudgetId && getCustomBudgetCategories(formData.customBudgetId).length === 0 && (
                      <p className="text-sm text-gray-500"> 
                        {t('addTab.noCategoriesInBudget')}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div> 
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('addTab.amount')}</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div className="relative"> 
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('addTab.description')}</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => onDescriptionChange(e.target.value)} 
              placeholder={t('addTab.descriptionPlaceholder')}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            {categorySuggestion && formData.budgetType === 'monthly' && (
              <div className="absolute right-2 top-9 flex items-center">
                <span className="text-xs text-gray-500 mr-2">{t('addTab.suggested')}</span>
                <button
                  onClick={() => onSetCategoryFromSuggestion(categorySuggestion)}
                  className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-md hover:bg-purple-200"
                > 
                  {t(`addTab.category.${categorySuggestion.toLowerCase()}`, categorySuggestion)}
                </button>
              </div>
            )}
          </div>

          <div> 
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('addTab.tags')}</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })} 
              placeholder={t('addTab.tagsPlaceholder')}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div> 
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('addTab.date')}</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Recurring Transaction Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="font-medium text-gray-700">{t('addTab.recurringTransaction')}</label>
              <button
                onClick={() => setFormData({ ...formData, isRecurring: !formData.isRecurring })}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  formData.isRecurring ? 'bg-purple-600' : 'bg-gray-300'
                }`}
                disabled={!hasAccessTo(Feature.RecurringTransactions)}
              >
                <div className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform ${
                  formData.isRecurring ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
            {formData.isRecurring && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('addTab.frequency')}</label>
                <select
                  value={formData.recurringFrequency || ''}
                  onChange={(e) => setFormData({ ...formData, recurringFrequency: e.target.value as any })}
                  className="w-full p-3 border border-gray-300 rounded-xl"
                > 
                  <option value="">{t('addTab.selectFrequency')}</option>
                  <option value="daily">{t('addTab.daily')}</option>
                  <option value="weekly">{t('addTab.weekly')}</option>
                  <option value="monthly">{t('addTab.monthly')}</option>
                </select>
              </div>
            )}
          </div>

          <button 
            onClick={handleAddOrUpdateTransaction} 
            className="w-full p-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-all" 
          > 
            {editingTransaction ? t('addTab.updateButton') : t('addTab.addButton')}
          </button>

          {editingTransaction && (
            <button onClick={onCancelEdit} className="w-full p-3 bg-gray-400 text-white rounded-xl hover:bg-gray-500"> 
              {t('addTab.cancelEdit')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddTab;