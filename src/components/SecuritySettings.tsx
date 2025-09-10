import React, { useState } from 'react';
import { Unlock, Lock } from 'lucide-react';
import SHA256 from 'crypto-js/sha256';
import AES from 'crypto-js/aes';
import { useLocalization } from './LocalizationContext';
import {
  Transaction,
  MonthlyBudgets,
  CustomBudget,
  BudgetTemplate,
  BudgetRelationship,
  BillReminder,
  SpendingAlert,
  TransferEvent,
} from '../types';

interface SecuritySettingsProps {
  appPassword: string | null;
  setAppPassword: (password: string | null) => void;
  onPasswordSet: (pin: string) => void;
  onPasswordRemoved: () => void;
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
  spendingAlerts: SpendingAlert[];
  t: (key: string, fallback?: string) => string;
}

const SecuritySettings: React.FC<SecuritySettingsProps> = (props) => {
  const {
    appPassword, setAppPassword, onPasswordSet, onPasswordRemoved, showConfirmation,
    transactions, budgets, customBudgets, categories, budgetTemplates,
    budgetRelationships, billReminders, transferLog, spendingAlerts, recurringProcessingMode,
    savingsGoal, dailySpendingGoal, analyticsTimeframe
  } = props;

  const [newPasswordInput, setNewPasswordInput] = useState('');
  const { t } = useLocalization(); // Use useLocalization hook

  const handleSetPassword = () => {
    if (!/^\d{4}$/.test(newPasswordInput)) {
      alert(t('settings.pinValidation', 'Please enter a valid 4-digit PIN.'));
      return;
    }
    // 1. Hash the PIN for storage (never store the raw PIN)
    const pinHash = SHA256(newPasswordInput).toString();

    // 2. Encrypt the entire app state using the raw PIN as the key
    const appState = {
      transactions, budgets, customBudgets, categories, budgetTemplates, budgetRelationships,
      billReminders, transferLog, recurringProcessingMode, savingsGoal, dailySpendingGoal, analyticsTimeframe, spendingAlerts
    };
    const jsonString = JSON.stringify(appState);
    const encryptedData = AES.encrypt(jsonString, newPasswordInput).toString();

    // 3. Store the hash and the encrypted data
    localStorage.setItem('appPasswordHash_v2', pinHash);
    localStorage.setItem('budgetWiseData_v2', encryptedData);

    setAppPassword(pinHash); // Update app state with the hash
    onPasswordSet(newPasswordInput); // Provide the raw key to the app for future saves
    setNewPasswordInput('');
    alert(t('toast.passwordSet')); // Use t() here
  };

  const handleRemovePassword = () => {
    showConfirmation(
      t('settings.removePassword', 'Remove Password'),
      t('confirmation.deletePassword.message'),
      () => {
        // Re-serialize the current in-memory state to plain text
        const appState = {
          transactions, budgets, customBudgets, categories, budgetTemplates, budgetRelationships,
          billReminders, transferLog, recurringProcessingMode, savingsGoal, dailySpendingGoal, analyticsTimeframe, spendingAlerts
        };
        const jsonString = JSON.stringify(appState);

        localStorage.removeItem('appPasswordHash_v2');
        localStorage.setItem('budgetWiseData_v2', jsonString);

        onPasswordRemoved(); // Clear the encryption key from app state
        setAppPassword(null);
        alert(t('toast.passwordRemoved')); // Use t() here
      }
    );
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg">
      <h2 className="text-xl font-bold text-gray-800 mb-4">{t('settings.securityTitle', 'Security')}</h2>
      {appPassword ? (
        <div>
          <p className="text-gray-600 mb-2">{t('settings.passwordIsSet', 'App password is set.')}</p>
          <button onClick={handleRemovePassword} className="w-full p-3 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 flex items-center justify-center">
            <Unlock size={18} className="mr-2" /> {t('settings.removePassword', 'Remove Password')}
          </button>
        </div>
      ) : (
        <div>
          <p className="text-gray-600 mb-2">{t('settings.setPasswordPrompt', 'Set a password to lock your app.')}</p>
          <div className="flex space-x-2">
            <input type="password" inputMode="numeric" pattern="[0-9]*" maxLength={4} value={newPasswordInput} onChange={(e) => setNewPasswordInput(e.target.value)} placeholder={t('settings.pinPlaceholder', 'Enter 4-digit PIN')} className="flex-1 min-w-0 p-3 border border-gray-300 rounded-xl" />
            <button onClick={handleSetPassword} className="px-4 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 flex items-center justify-center">
              <Lock size={18} className="mr-2" /> {t('settings.setPassword', 'Set')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecuritySettings;