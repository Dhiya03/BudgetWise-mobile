import React from 'react';
import {
  Transaction,
  MonthlyBudgets,
  CustomBudget,
  BudgetTemplate,
  BudgetRelationship,
  CustomBudgetFormData,
  RelationshipFormData,
} from '../types';
import {
  Pause, Play, Save, Link2, ArrowRight, Trash2, Edit3,
  ArrowUpDown, Lock, Unlock
} from 'lucide-react';

interface BudgetTabProps {
  monthlyIncome: number;
  totalMonthlyBudget: number;
  budgetForm: { category: string; amount: string };
  setBudgetForm: React.Dispatch<React.SetStateAction<{ category: string; amount: string }>>;
  categories: string[];
  budgets: MonthlyBudgets;
  setBudget: () => void;
  customBudgetFormRef: React.RefObject<HTMLDivElement>;
  editingCustomBudget: CustomBudget | null;
  customBudgetForm: CustomBudgetFormData;
  setCustomBudgetForm: React.Dispatch<React.SetStateAction<CustomBudgetFormData>>;
  handleSaveCustomBudget: () => void;
  handleCancelEdit: () => void;
  saveAsTemplate: () => void;
  budgetTemplates: BudgetTemplate[];
  selectedTemplate: string;
  setSelectedTemplate: React.Dispatch<React.SetStateAction<string>>;
  applyTemplate: (templateId: number) => void;
  deleteTemplate: (templateId: number) => void;
  relationshipForm: RelationshipFormData;
  setRelationshipForm: React.Dispatch<React.SetStateAction<RelationshipFormData>>;
  getRemainingBudget: (category: string, year: number, month: number) => number;
  currentYear: number;
  currentMonth: number;
  customBudgets: CustomBudget[];
  addRelationship: () => void;
  budgetRelationships: BudgetRelationship[];
  getCustomBudgetName: (id: number | null) => string;
  deleteRelationship: (id: number) => void;
  processEndOfMonthRollovers: () => void;
  setShowTransferModal: React.Dispatch<React.SetStateAction<boolean>>;
  handleLockBudget: (budgetId: number) => void;
  pauseCustomBudget: (budgetId: number) => void;
  handleEditCustomBudget: (budget: CustomBudget) => void;
  deleteCustomBudget: (budgetId: number) => void;
  resumeCustomBudget: (budgetId: number) => void;
  getCustomBudgetCategoryBudget: (customBudgetId: number, category: string) => number;
  customCategorySpending: { [budgetId: number]: { [category: string]: number } };
  transactions: Transaction[];
  newCustomCategory: string;
  setNewCustomCategory: React.Dispatch<React.SetStateAction<string>>;
  addCustomCategoryToForm: () => void;
  getSpentAmount: (category: string, year: number, month: number) => number;
  removeCategoryFromForm: (category: string) => void;
  updateCategoryBudget: (category: string, amount: string) => void;
}

const BudgetTab: React.FC<BudgetTabProps> = (props) => {
  const {
    monthlyIncome, totalMonthlyBudget, budgetForm, setBudgetForm, categories,
    budgets, setBudget, customBudgetFormRef, editingCustomBudget, customBudgetForm,
    setCustomBudgetForm, handleSaveCustomBudget, handleCancelEdit, saveAsTemplate,
    budgetTemplates, selectedTemplate, setSelectedTemplate, applyTemplate,
    deleteTemplate, relationshipForm, setRelationshipForm, getRemainingBudget,
    currentYear, currentMonth, customBudgets, addRelationship, budgetRelationships,
    getCustomBudgetName, deleteRelationship, processEndOfMonthRollovers,
    setShowTransferModal, handleLockBudget, pauseCustomBudget, handleEditCustomBudget,
    deleteCustomBudget, resumeCustomBudget, getCustomBudgetCategoryBudget,
    customCategorySpending, transactions, newCustomCategory, setNewCustomCategory, getSpentAmount,
    addCustomCategoryToForm, removeCategoryFromForm, updateCategoryBudget,
  } = props;

  return (
    <div className="p-4 space-y-6">
      {/* NEW: Monthly Income vs Budgeted Summary */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Monthly Financial Plan</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-medium text-green-700">Total Monthly Income</span>
            <span className="font-bold text-lg text-green-700">₹{monthlyIncome.toFixed(0)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-medium text-red-700">Total Budgeted Expenses</span>
            <span className="font-bold text-lg text-red-700">₹{totalMonthlyBudget.toFixed(0)}</span>
          </div>
          <hr className="my-2"/>
          <div className="flex justify-between items-center">
            <span className="font-semibold text-blue-800">Potential Savings</span>
            <span className={`font-bold text-xl ${monthlyIncome - totalMonthlyBudget >= 0 ? 'text-blue-800' : 'text-red-600'}`}>
              ₹{(monthlyIncome - totalMonthlyBudget).toFixed(0)}
            </span>
          </div>
          {totalMonthlyBudget > monthlyIncome && (
            <p className="text-xs text-center text-red-600 bg-red-50 p-2 rounded-lg">⚠️ Your budgeted expenses are higher than your income.</p>
          )}
        </div>
      </div>

      {/* Monthly Budget Section */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Monthly Budget</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={budgetForm.category}
              onChange={(e) => {
                const selectedCategory = e.target.value;
                setBudgetForm({
                  category: selectedCategory,
                  amount: budgets[selectedCategory]?.toString() || ''
                });
              }}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Select Category</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Budget Amount</label>
            <input
              type="number"
              value={budgetForm.amount}
              onChange={(e) => setBudgetForm({ ...budgetForm, amount: e.target.value })}
              placeholder="0.00"
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <button
            onClick={setBudget}
            className="w-full p-4 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-teal-700"
          >
            Set Monthly Budget
          </button>
        </div>
      </div>

      {/* Custom Budget Section */}
      <div ref={customBudgetFormRef} className="bg-white rounded-2xl p-6 shadow-lg">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Custom Purpose Budget</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Budget Name</label>
            <input
              type="text"
              value={customBudgetForm.name}
              onChange={(e) => setCustomBudgetForm({ ...customBudgetForm, name: e.target.value })}
              placeholder="e.g., Vacation, Wedding, Home Renovation"
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Budget Amount</label>
            <input
              type="number"
              value={customBudgetForm.amount}
              onChange={(e) => setCustomBudgetForm({ ...customBudgetForm, amount: e.target.value })}
              placeholder="0.00"
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={customBudgetForm.description}
              onChange={(e) => setCustomBudgetForm({ ...customBudgetForm, description: e.target.value })}
              placeholder="Brief description of this budget purpose"
              rows={2}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Deadline (Optional)</label>
            <input
              type="date"
              value={customBudgetForm.deadline}
              onChange={(e) => setCustomBudgetForm({ ...customBudgetForm, deadline: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
            <select
              value={customBudgetForm.priority}
              onChange={(e) => setCustomBudgetForm({ ...customBudgetForm, priority: e.target.value as 'low' | 'medium' | 'high' })}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Budget Categories</label>
            <div className="space-y-4">
              {/* Display current categories with budget inputs */}
              {customBudgetForm.categories.length > 0 && (
                <div className="space-y-3 p-4 bg-gray-50 rounded-xl">
                  <h4 className="text-sm font-medium text-gray-700">Category Budgets:</h4>
                  {customBudgetForm.categories.map((category) => (
                    <div key={category} className="flex items-center space-x-2">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-600 mb-1">{category}</label>
                        <input
                          type="number"
                          value={customBudgetForm.categoryBudgets[category] || ''}
                          onChange={(e) => updateCategoryBudget(category, e.target.value)}
                          placeholder="Budget amount"
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                        />
                      </div>
                      <button
                        onClick={() => removeCategoryFromForm(category)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg mt-4"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  
                  {/* Show total and validation */}
                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Category Budgets:</span>
                      <span className="font-medium">
                        ₹{Object.values(customBudgetForm.categoryBudgets || {}).reduce((sum, amount) => sum + (parseFloat(amount) || 0), 0).toFixed(0)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Overall Budget:</span>
                      <span className="font-medium">
                        ₹{(parseFloat(customBudgetForm.amount) || 0).toFixed(0)}
                      </span>
                    </div>
                    {customBudgetForm.amount && Object.values(customBudgetForm.categoryBudgets || {}).reduce((sum, amount) => sum + (parseFloat(amount) || 0), 0) > parseFloat(customBudgetForm.amount) && (
                      <p className="text-red-600 text-xs mt-1">
                        ⚠️ Category budgets exceed overall budget!
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Add new category */}
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newCustomCategory}
                  onChange={(e) => setNewCustomCategory(e.target.value)}
                  placeholder="Add a category (e.g., Venue, Catering)"
                  className="flex-1 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomCategoryToForm();
                    }
                  }}
                />
                <button
                  onClick={addCustomCategoryToForm}
                  className="px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700"
                >
                  Add
                </button>
              </div>
              
              {customBudgetForm.categories.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-4">
                  No categories added yet. Add categories above to set individual budgets.
                </p>
              )}
            </div>
          </div>

          <button
            onClick={handleSaveCustomBudget}
            className="w-full p-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700"
          >
            {editingCustomBudget ? 'Update Custom Budget' : 'Create Custom Budget'}
          </button>
          {editingCustomBudget && (
            <button
              onClick={handleCancelEdit}
              className="w-full mt-2 p-3 bg-gray-400 text-white rounded-xl hover:bg-gray-500"
            >
              Cancel Edit
            </button>
          )}
        </div>

        {/* Save as Template Button */}
        <div className="mt-4">
          <button
            onClick={saveAsTemplate}
            className="w-full p-3 bg-teal-100 text-teal-800 rounded-xl font-semibold hover:bg-teal-200 flex items-center justify-center"
          >
            <Save size={18} className="mr-2" />
            Save as Template
          </button>
        </div>
      </div>

      {/* Budget Templates Section */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Budget Templates</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Create from Template</label>
            <div className="flex space-x-2">
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="flex-1 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select a template</option>
                {budgetTemplates.map(template => (
                  <option key={template.id} value={template.id}>{template.name}</option>
                ))}
              </select>
              <button
                onClick={() => applyTemplate(parseInt(selectedTemplate))}
                disabled={!selectedTemplate}
                className="px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:bg-gray-400"
              >
                Apply
              </button>
            </div>
          </div>
          {budgetTemplates.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Manage Templates:</h4>
              {budgetTemplates.map(template => (
                <div key={template.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                  <span>{template.name}</span>
                  <button onClick={() => deleteTemplate(template.id)} className="p-1 text-red-500 hover:bg-red-100 rounded-full">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Budget Automation Section */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Budget Automation</h2>
        <div className="space-y-4">
          <h3 className="text-md font-semibold text-gray-700">Create Rollover Rule</h3>
          <select
            value={relationshipForm.sourceCategory}
            onChange={(e) => setRelationshipForm({ ...relationshipForm, sourceCategory: e.target.value })}
            className="w-full p-3 border border-gray-300 rounded-xl"
          >
            <option value="">Select Source Monthly Category</option>
            {categories.map(cat => <option key={cat} value={cat}>{cat} (Surplus: ₹{getRemainingBudget(cat, currentYear, currentMonth).toFixed(0)})</option>)}
          </select>
          <select
            value={relationshipForm.destinationBudgetId}
            onChange={(e) => setRelationshipForm({ ...relationshipForm, destinationBudgetId: e.target.value })}
            className="w-full p-3 border border-gray-300 rounded-xl"
          >
            <option value="">Select Destination Custom Budget</option>
            {customBudgets.filter(b => b.status === 'active').map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <button onClick={addRelationship} className="w-full p-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 flex items-center justify-center">
            <Link2 size={18} className="mr-2" />
            Create Rollover Rule
          </button>
          <hr />
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Active Rules:</h4>
            {budgetRelationships.length === 0 && <p className="text-sm text-gray-500">No rollover rules created yet.</p>}
            {budgetRelationships.map((rel: BudgetRelationship) => (
              <div key={rel.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                <span className="text-sm">Surplus from '{rel.sourceCategory}' → '{getCustomBudgetName(rel.destinationBudgetId)}'</span>
                <button onClick={() => deleteRelationship(rel.id)} className="p-1 text-red-500 hover:bg-red-100 rounded-full">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <button onClick={processEndOfMonthRollovers} className="w-full p-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 flex items-center justify-center">
            <ArrowRight size={18} className="mr-2" />
            Process End-of-Month Rollovers
          </button>
        </div>
      </div>

      {/* Transfer Funds Button */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Manage Funds</h2>
        <button
          onClick={() => setShowTransferModal(true)}
          className="w-full p-3 bg-indigo-100 text-indigo-800 rounded-xl font-semibold hover:bg-indigo-200 flex items-center justify-center"
        >
          <ArrowUpDown size={18} className="mr-2" />
          Transfer Funds Between Custom Budgets
        </button>
      </div>

      {/* Active Custom Budgets */}
      {customBudgets.filter(budget => ['active', 'locked'].includes(budget.status)).length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Active & Locked Budgets</h2>
          
          <div className="space-y-4">
            {customBudgets.filter(budget => ['active', 'locked'].includes(budget.status)).map(budget => {
              const percentage = budget.totalAmount > 0 ? (budget.spentAmount / budget.totalAmount) * 100 : 0;
              const isOverBudget = budget.spentAmount > budget.totalAmount;
              const isLocked = budget.status === 'locked';
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const isDeadlinePassed = budget.deadline ? new Date(budget.deadline + 'T00:00:00') < today : false;

              return (
                <div key={budget.id} className={`border rounded-xl p-4 transition-colors ${isDeadlinePassed ? 'bg-violet-50 border-violet-300' : isLocked ? 'bg-gray-100 opacity-80 border-gray-200' : 'border-gray-200'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-800 flex items-center">
                        {isLocked && <Lock size={16} className="mr-2 text-gray-500" />}
                        {budget.name}
                      </h3>
                      {budget.description && (
                        <p className="text-sm text-gray-600 mt-1">{budget.description}</p>
                      )}
                      {budget.deadline && (
                        <p className="text-xs text-gray-500 mt-1">
                          Deadline: {new Date(budget.deadline).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        budget.priority === 'high' ? 'bg-red-100 text-red-800' :
                        budget.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {budget.priority}
                      </span>
                      <button
                        onClick={() => handleLockBudget(budget.id)}
                        className="p-1 text-gray-400 hover:text-yellow-600 rounded"
                        title={isLocked ? "Unlock Budget" : "Lock Budget"}
                      >
                        {isLocked ? <Unlock size={16} /> : <Lock size={16} />}
                      </button>
                      <button onClick={() => pauseCustomBudget(budget.id)} disabled={isLocked} className="p-1 text-gray-400 hover:text-blue-600 rounded disabled:opacity-50 disabled:cursor-not-allowed" title="Pause Budget">
                        <Pause size={16} />
                      </button>
                      <button onClick={() => handleEditCustomBudget(budget)} disabled={isLocked} className="p-1 text-gray-400 hover:text-blue-600 rounded disabled:opacity-50 disabled:cursor-not-allowed" title="Edit Budget">
                        <Edit3 size={16} />
                      </button>
                      <button onClick={() => deleteCustomBudget(budget.id)} disabled={isLocked} className="p-1 text-gray-400 hover:text-red-600 rounded disabled:opacity-50 disabled:cursor-not-allowed" title="Delete Budget">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">
                      ₹{budget.spentAmount.toFixed(0)} / ₹{budget.totalAmount.toFixed(0)}
                    </span>
                    <span className={`text-sm ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                      ₹{budget.remainingAmount.toFixed(0)} remaining
                    </span>
                  </div>
                  
                  <div className="relative pt-1">
                    <div className="overflow-hidden h-4 text-xs flex rounded-full bg-gray-200">
                      <div style={{ width: `${Math.min(percentage, 100)}%` }} className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500 ${isOverBudget ? 'bg-red-500' : 'bg-gradient-to-r from-green-400 to-blue-500'}`}>
                        {percentage >= 10 && <span className="text-xs font-semibold inline-block py-1">{percentage.toFixed(0)}%</span>}
                      </div>
                    </div>
                    {/* Milestones */}
                    {[25, 50, 75].map(milestone => (
                      percentage >= milestone && (
                        <div key={milestone} className="absolute top-0 h-4 flex items-center" style={{ left: `${milestone}%` }}>
                          <div className="w-1 h-4 bg-white"></div>
                          <div className="text-yellow-500 -mt-5 -ml-1.5">⭐</div>
                        </div>
                      )
                    ))}
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {percentage >= 100 && '🎉 '}
                      {percentage.toFixed(0)}% funded
                      {percentage >= 100 && ' 🎉'}
                    </span>
                    <span className={`font-medium ${
                      isDeadlinePassed ? 'text-violet-500' : budget.spentAmount >= budget.totalAmount ? 'text-blue-600' : 'text-green-600'
                    }`}>
                      {isDeadlinePassed ? 'Deadline Passed' : budget.spentAmount >= budget.totalAmount ? 'Completed' : 'Active'}
                    </span>
                  </div>

                  {/* Category-wise breakdown */}
                  {budget.categories && budget.categories.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Category Breakdown:</h4>
                      <div className="space-y-3">
                        {budget.categories.map(category => {
                          const categoryBudget = getCustomBudgetCategoryBudget(budget.id, category);
                          const categorySpent = customCategorySpending[budget.id]?.[category] || 0;
                          const categoryRemaining = categoryBudget - categorySpent;
                          const categoryPercentage = categoryBudget > 0 ? (categorySpent / categoryBudget) * 100 : 0;
                          const categoryTransactions = transactions.filter(t => 
                            t.customBudgetId === budget.id && t.customCategory === category
                          ).length;
                          
                          return (
                            <div key={category} className="bg-white p-3 rounded-lg border border-gray-100">
                              <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium text-gray-700">{category}</span>
                                  <span className="text-xs text-gray-400">({categoryTransactions} transactions)</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-sm font-medium text-gray-800">
                                    ₹{categorySpent.toFixed(0)} / ₹{categoryBudget.toFixed(0)}
                                  </span>
                                </div>
                              </div>
                              
                              {categoryBudget > 0 && (
                                <>
                                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                                    <div
                                      className={`h-2 rounded-full transition-all ${
                                        categoryPercentage > 100 ? 'bg-red-500' : 
                                        categoryPercentage > 80 ? 'bg-yellow-500' : 'bg-green-500'
                                      }`}
                                      style={{ width: `${Math.min(categoryPercentage, 100)}%` }}
                                    />
                                  </div>
                                  
                                  <div className="flex justify-between text-xs">
                                    <span className={`${categoryRemaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      Remaining: ₹{categoryRemaining.toFixed(0)}
                                    </span>
                                    <span className="text-gray-600">
                                      {categoryPercentage.toFixed(0)}% used
                                    </span>
                                  </div>
                                </>
                              )}
                              
                              {categoryBudget === 0 && (
                                <p className="text-xs text-gray-500 italic">No budget set for this category</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Paused Custom Budgets */}
      {customBudgets.filter(budget => budget.status === 'paused').length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-lg opacity-70">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Paused Custom Budgets</h2>
          <div className="space-y-4">
            {customBudgets.filter(budget => budget.status === 'paused').map(budget => (
              <div key={budget.id} className="border border-gray-200 rounded-xl p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-800">{budget.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{budget.description}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => resumeCustomBudget(budget.id)} className="p-1 text-gray-400 hover:text-green-600 rounded" title="Resume Budget">
                      <Play size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monthly Budget Overview */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Monthly Budget Overview</h2>
        
        <div className="space-y-4">
          {categories.map(category => {
            const budget = budgets[category] || 0;
            const spent = getSpentAmount(category, currentYear, currentMonth);
            const remaining = budget - spent;
            const percentage = budget > 0 ? (spent / budget) * 100 : 0;

            return (
              <div key={category} className="border border-gray-200 rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-gray-800">{category}</span>
                  <span className="text-sm text-gray-600">
                    ₹{spent.toFixed(0)} / ₹{budget.toFixed(0)}
                  </span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      percentage > 100 ? 'bg-red-500' : percentage > 80 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className={remaining >= 0 ? 'text-green-600' : 'text-red-600'}>
                    Remaining: ₹{remaining.toFixed(0)}
                  </span>
                  <span className="text-gray-600">
                    {percentage.toFixed(0)}% used
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BudgetTab;