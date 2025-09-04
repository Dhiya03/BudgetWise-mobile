import React, { useState } from 'react';
import { Unlock , Lock} from 'lucide-react';
import {
  Transaction,
  MonthlyBudgets,
  CustomBudget,
  BudgetTemplate,
  BudgetRelationship,
  BillReminder,
  TransferEvent,
} from '../types';

interface SecuritySettingsProps {
  appPassword: string | null;
  setAppPassword: (password: string | null) => void;
  showConfirmation: (title: string, message: string, onConfirm: () => void) => void;
  // All state needed for backup string
  transactions: Transaction[];
  budgets: MonthlyBudgets;
  customBudgets: CustomBudget[];
  categories: string[];
  budgetTemplates: BudgetTemplate[];
  budgetRelationships: BudgetRelationship[];
  billReminders: BillReminder[];
  transferLog: TransferEvent[];
  recurringProcessingMode: 'automatic' | 'manual';
  savingsGoal: number;
  dailySpendingGoal: number;
  analyticsTimeframe: string;
}

const SecuritySettings: React.FC<SecuritySettingsProps> = (props) => {
  const {
    appPassword, setAppPassword, showConfirmation,
    transactions, budgets, customBudgets, categories, budgetTemplates,
    budgetRelationships, billReminders, transferLog, recurringProcessingMode,
    savingsGoal, dailySpendingGoal, analyticsTimeframe
  } = props;

  const [newPasswordInput, setNewPasswordInput] = useState('');

  const handleSetPassword = () => {
    if (!/^\d{4}$/.test(newPasswordInput)) {
      alert("Please enter a valid 4-digit PIN.");
      return;
    }
    // Atomically set password and encrypt data
    const appState = { transactions, budgets, customBudgets, categories, budgetTemplates, budgetRelationships, billReminders, transferLog, recurringProcessingMode, savingsGoal, dailySpendingGoal, analyticsTimeframe };
    const jsonString = JSON.stringify(appState);
    const encryptedData = btoa(jsonString);

    localStorage.setItem('appPassword_v2', newPasswordInput);
    localStorage.setItem('budgetWiseData_v2', encryptedData);

    setAppPassword(newPasswordInput);
    setNewPasswordInput('');
    alert('Password set successfully. The app will be locked on your next visit.');
  };

  const handleRemovePassword = () => {
    showConfirmation(
      'Confirm Password Removal',
      'Are you sure you want to remove the password?',
      () => {
        const appState = { transactions, budgets, customBudgets, categories, budgetTemplates, budgetRelationships, billReminders, transferLog, recurringProcessingMode, savingsGoal, dailySpendingGoal, analyticsTimeframe };
        const jsonString = JSON.stringify(appState);

        localStorage.removeItem('appPassword_v2');
        localStorage.setItem('budgetWiseData_v2', jsonString);

        setAppPassword(null);
        alert("Password removed.");
      }
    );
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Security</h2>
      {appPassword ? (
        <div>
          <p className="text-gray-600 mb-2">App password is set.</p>
          <button onClick={handleRemovePassword} className="w-full p-3 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 flex items-center justify-center">
            <Unlock size={18} className="mr-2" /> Remove Password
          </button>
        </div>
      ) : (
        <div>
          <p className="text-gray-600 mb-2">Set a password to lock your app.</p>
          <div className="flex space-x-2">
            <input type="password" inputMode="numeric" pattern="[0-9]*" maxLength={4} value={newPasswordInput} onChange={(e) => setNewPasswordInput(e.target.value)} placeholder="Enter 4-digit PIN" className="flex-1 p-3 border border-gray-300 rounded-xl" />
            <button onClick={handleSetPassword} className="px-4 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 flex items-center justify-center">
              <Lock size={18} className="mr-2" /> Set
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecuritySettings;