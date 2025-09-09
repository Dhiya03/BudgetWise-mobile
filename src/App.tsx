import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Repeat, X, Star } from 'lucide-react';

import { App as CapacitorApp } from '@capacitor/app';
import AES from 'crypto-js/aes';
import SHA256 from 'crypto-js/sha256';
import Utf8 from 'crypto-js/enc-utf8';
import { Capacitor } from '@capacitor/core';
import {
  Transaction,
  MonthlyBudgets,
  CustomBudget,
  BudgetTemplate,
  BudgetRelationship,
  BillReminder,
  TransactionFormData,
  SpendingAlert,
  CustomBudgetFormData,
  RelationshipFormData,
  TransferEvent,
} from './types';
import AnalyticsTab from './components/AnalyticsTab';
import DataManagement from './components/DataManagement';
import SecuritySettings from './components/SecuritySettings';
import AlertManagement from './components/AlertManagement';
import HistoryTab from './components/HistoryTab';
import BillReminderTab from './components/BillReminderTab';
import BudgetTab from './components/BudgetTab';
import AddTab from './components/AddTab';
import Header from './components/Header';
import BottomNavigation from './components/BottomNavigation';
import { LocalNotifications } from '@capacitor/local-notifications';
import FileService from './utils/FileService';
import { escapeCsvField } from './utils/csvUtils';
import AdsManager, { SubscriptionTier } from './billing/AdsManager';
import { hasAccessTo, Feature } from './subscriptionManager';
import BillingManager from './billing/BillingManager';
import SubscriptionScreen from './billing/SubscriptionScreen';


const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (() => void | Promise<void>) | null;
  title: string;
  message: string;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <h2 className="text-xl font-bold text-gray-800 mb-4">{title}</h2>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
          >
            No
          </button>
          <button
            onClick={() => {
              onClose();
              if (onConfirm) onConfirm();
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
};

const Toast = ({ message, isVisible }: { message: string; isVisible: boolean }) => {
  if (!isVisible) return null;

  return (
    <div
      className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-full shadow-lg transition-opacity duration-300"
      style={{
        opacity: isVisible ? 1 : 0,
        zIndex: 100, // Ensure it's above other elements
      }}
    >
      {message}
    </div>
  );
};

const App = () => {
  const [activeTab, setActiveTab] = useState('add');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<MonthlyBudgets>({});
  const [customBudgets, setCustomBudgets] = useState<CustomBudget[]>([]);
  const [categories, setCategories] = useState(['Food', 'Transport', 'Entertainment', 'Shopping', 'Bills', 'Health']);
  const [transferLog, setTransferLog] = useState<TransferEvent[]>([]);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingCustomBudget, setEditingCustomBudget] = useState<CustomBudget | null>(null);
  const [filterTag, setFilterTag] = useState('');
  const [recurringProcessingMode, setRecurringProcessingMode] = useState<'automatic' | 'manual'>('automatic');
  const [dailySpendingGoal, setDailySpendingGoal] = useState(500);
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState('30');
  const [savingsGoal, setSavingsGoal] = useState(15000);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [filterCategory, setFilterCategory] = useState(''); // This is used by Analytics, so it stays
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>('premium'); // TEMP: Default to premium for testing

  // --- New State for Advanced Features ---

  // Confirmation Modal State
  const [confirmationState, setConfirmationState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: (() => (void | Promise<void>)) | null;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
  });

   // --- Toast Notification State ---
  const [toastMessage, setToastMessage] = useState('');
  const [isToastVisible, setIsToastVisible] = useState(false);

  // --- Navigation State ---
  const [navigationRequest, setNavigationRequest] = useState<{
    tab: string;
    filterCategory?: string;
    focus?: string;
  } | null>(null);

  // Security & Persistence
  const [appPassword, setAppPassword] = useState<string | null>(null);
  const [encryptionKey, setEncryptionKey] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(true);
  const [passwordInput, setPasswordInput] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

  // Smart Categorization
  const [categorySuggestion, setCategorySuggestion] = useState<string | null>(null);

  // --- Keyword mapping for smart categorization ---
  const CATEGORY_KEYWORDS: { [key: string]: string[] } = {
    'Food': ['restaurant', 'food', 'swiggy', 'zomato', 'groceries', 'supermarket'],
    'Transport': ['uber', 'ola', 'taxi', 'bus', 'metro', 'fuel', 'petrol'],
    'Entertainment': ['movie', 'concert', 'netflix', 'spotify', 'tickets'],
    'Shopping': ['amazon', 'flipkart', 'myntra', 'mall', 'clothes', 'electronics'],
    'Bills': ['electricity', 'water', 'internet', 'phone', 'rent', 'maintenance'],
    'Health': ['doctor', 'pharmacy', 'hospital', 'medicine', 'clinic'],
  };

  // Bill Reminders - State is kept here for persistence
  const [billReminders, setBillReminders] = useState<BillReminder[]>([]);
  const [spendingAlerts, setSpendingAlerts] = useState<SpendingAlert[]>([]);


  // --- Form States ---
  const [formData, setFormData] = useState<TransactionFormData>({
    category: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    type: 'expense',
    budgetType: 'monthly',
    customBudgetId: null,
    customCategory: '',
    tags: '',
    isRecurring: false,
    recurringFrequency: null,
  });

  // Monthly budget form state
  const [budgetForm, setBudgetForm] = useState({
    category: '',
    amount: ''
  });

  // Custom budget form state with explicit type
  const [customBudgetForm, setCustomBudgetForm] = useState<CustomBudgetFormData>({
    name: '',
    amount: '',
    description: '',
    deadline: '',
    priority: 'medium',
    categories: [],
    categoryBudgets: {},
  });
  const [newCustomCategory, setNewCustomCategory] = useState('');
  const customBudgetFormRef = useRef<HTMLDivElement>(null);

  // --- New State for Budget Hub Features ---

  // State for budget templates
  const [budgetTemplates, setBudgetTemplates] = useState<BudgetTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  // State for budget automation/relationships
  const [budgetRelationships, setBudgetRelationships] = useState<BudgetRelationship[]>([]);
  const [relationshipForm, setRelationshipForm] = useState<RelationshipFormData>({
    sourceCategory: '',
    destinationBudgetId: '',
    condition: 'end_of_month_surplus',
  });

  // State for fund transfer modal
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferForm, setTransferForm] = useState({
    fromBudgetId: '',
    toBudgetId: '',
    transferAmount: '',
    fromCategory: '',
    toCategoryAllocations: {} as { [key: string]: string },
  });

  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportFormat, setExportFormat] = useState('json');
  const [exportType, setExportType] = useState('all'); // 'all', 'monthly', 'custom'


  // --- Modal Control Functions ---
  const showConfirmation = (title: string, message: string, onConfirm: () => void | Promise<void>) => {
    setConfirmationState({
      isOpen: true,
      title,
      message,
      onConfirm,
    });
  };

  const closeConfirmation = () => {
    setConfirmationState({
      isOpen: false,
      title: '',
      message: '',
      onConfirm: null,
    });
  };
  const getCustomBudgetName = useCallback((customBudgetId: number | null) => {
    if (customBudgetId === null) return 'N/A';
    const budget = customBudgets.find(b => b.id === customBudgetId);
    return budget ? budget.name : 'Unknown Budget';
  }, [customBudgets]);



  const runAlertCleanupChecks = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentMonthKey = `${today.getFullYear()}-${today.getMonth()}`;
    const lastCleanupMonth = localStorage.getItem('lastAlertCleanupMonth_v2');
    const isNewMonth = currentMonthKey !== lastCleanupMonth;

    const alertsToKeep = spendingAlerts.filter(alert => {
        const isCustomAlert = alert.category.includes(' - ');

        // Rule 1: Delete monthly alerts at the start of a new month.
        if (!isCustomAlert && isNewMonth) {
            return false; // It's a new month, so this monthly alert from a previous month is deleted.
        }

        // Rule 2: Delete alerts for custom budgets where the deadline has passed.
        if (isCustomAlert) {
            const budgetName = alert.category.split(' - ')[0];
            const budget = customBudgets.find(b => b.name === budgetName);

            if (budget && budget.deadline) {
                const deadlineDate = new Date(budget.deadline + 'T00:00:00');
                if (deadlineDate < today) {
                    return false; // Deadline has passed, delete this custom alert.
                }
            }
        }

        return true; // Keep the alert if no deletion rule matches.
    });

    // Check for recurring transactions linked to expired budgets
    const expiredBudgetIds = new Set<number>();
    customBudgets.forEach(budget => {
        if (budget.deadline) {
            const deadlineDate = new Date(budget.deadline + 'T00:00:00');
            if (deadlineDate < today) {
                expiredBudgetIds.add(budget.id);
            }
        }
    });

    let recurringTxModified = false;
    const updatedTransactionsForRecurring = transactions.map(t => {
        if (t.isRecurring && t.customBudgetId && expiredBudgetIds.has(t.customBudgetId)) {
            recurringTxModified = true;
            // Disable recurrence for transactions linked to expired budgets
            return { ...t, isRecurring: false };
        }
        return t;
    });

    if (alertsToKeep.length < spendingAlerts.length) {
        console.log(`BudgetWise: Cleaned up ${spendingAlerts.length - alertsToKeep.length} expired/old alerts.`);
        setSpendingAlerts(alertsToKeep);
    }

      if (recurringTxModified) {
        console.log(`BudgetWise: Disabled recurring transactions for expired budgets.`);
        setTransactions(updatedTransactionsForRecurring);
    }

    if (isNewMonth) {
        localStorage.setItem('lastAlertCleanupMonth_v2', currentMonthKey);
    }
 }, [spendingAlerts, customBudgets, transactions]); // `transactions` is needed for the cleanup

  // --- Data Persistence and Security Hooks ---

  const loadAndInitializeData = () => {
    const savedData = localStorage.getItem('budgetWiseData_v2');
    if (savedData) {
        try {
            // This assumes data is not encrypted if no password was set on startup.
            const appState = JSON.parse(savedData);
            if (appState.transactions) {
                setTransactions(appState.transactions);
                setBudgets(appState.budgets || {});
                setCustomBudgets(appState.customBudgets || []);
                setCategories(appState.categories || ['Food', 'Transport', 'Entertainment', 'Shopping', 'Bills', 'Health']);
                setBudgetTemplates(appState.budgetTemplates || []);
                setBudgetRelationships(appState.budgetRelationships || []);
                setBillReminders(appState.billReminders || []);
                setSpendingAlerts(appState.spendingAlerts || []);
                setRecurringProcessingMode(appState.recurringProcessingMode || 'automatic');
                setDailySpendingGoal(appState.dailySpendingGoal || 500);
                setAnalyticsTimeframe(appState.analyticsTimeframe || '30');
                setSavingsGoal(appState.savingsGoal || 15000);
                return; // Exit after successful load
            }
        } catch (e) {
            console.error("Failed to parse stored data, initializing fresh.", e);
        }
    }
    // If no data or parsing failed, initialize sample data
    initializeSampleData();
  };

  const refreshSubscriptionStatus = useCallback(() => {
    BillingManager.checkUserTier().then((tier) => {
      setSubscriptionTier(tier);
    });
  }, []);

  // Load data from localStorage on initial render
  useEffect(() => {
    const savedPassword = localStorage.getItem('appPasswordHash_v2');
    if (savedPassword) {
      setAppPassword(savedPassword);
      setIsLocked(true);
      // Data will be loaded upon successful unlock
    } else {
      setIsLocked(false); // No password set, unlock the app
      loadAndInitializeData(); // Load existing data or initialize samples
    }
  }, []);

  useEffect(() => {
    AdsManager.init();
    BillingManager.init(refreshSubscriptionStatus);
    refreshSubscriptionStatus(); // Initial check on app start
  }, [refreshSubscriptionStatus]);

      useEffect(() => {
        AdsManager.setTier(subscriptionTier);
      }, [subscriptionTier]);

            // Show banners only on Home tab (skip if premium)
      useEffect(() => {
        if (subscriptionTier !== 'premium' && activeTab === 'add') {
          AdsManager.showBanner();
        } else {
          AdsManager.hideBanner();
        }
      }, [activeTab, subscriptionTier]);

  // Encrypt and save data to localStorage whenever it changes
  const saveDataToStorage = () => {
    try {
      // Only save if the app is not locked to prevent saving empty initial state
      if (isLocked) return;
      
      const appState = { transactions, budgets, customBudgets, categories, budgetTemplates, budgetRelationships, billReminders, spendingAlerts, transferLog, recurringProcessingMode, savingsGoal, dailySpendingGoal, analyticsTimeframe };
      const jsonString = JSON.stringify(appState);
      const encryptedData = encryptionKey ? AES.encrypt(jsonString, encryptionKey).toString() : jsonString;
      localStorage.setItem('budgetWiseData_v2', encryptedData);
    } catch (error) {
      console.error("Failed to save data to storage", error);
    }
  };

  // Debounced save function
  useEffect(() => {
    if (!isLocked) {
      const handler = setTimeout(() => {
        saveDataToStorage();
      }, 1000); // Save 1 second after the last change
      return () => clearTimeout(handler); // Add this cleanup
    }
  }, [transactions, budgets, customBudgets, categories, budgetTemplates, budgetRelationships, billReminders, spendingAlerts, transferLog, recurringProcessingMode, savingsGoal, dailySpendingGoal, analyticsTimeframe, isLocked, encryptionKey]);

  // Automatically process recurring transactions if in automatic mode and app is unlocked
  useEffect(() => {
    if (!isLocked) {
      runAlertCleanupChecks(); // Run cleanup checks on unlock
      if (recurringProcessingMode === 'automatic') {
        processRecurringTransactions(true);
      }
    }
  }, [isLocked, recurringProcessingMode, runAlertCleanupChecks]);

  // --- Notification Permission Hook ---
  useEffect(() => {
    const requestNotificationPermission = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          let permStatus = await LocalNotifications.checkPermissions();
          if (permStatus.display !== 'granted') {
            permStatus = await LocalNotifications.requestPermissions();
          }
          if (permStatus.display !== 'granted') {
            console.warn('User denied notification permissions.');
          }
        } catch (e) {
          console.error("Could not request notification permissions", e);
        }
      }
    };
    requestNotificationPermission();
  }, []);
  
  // Effect to manage the lockout timer display
  useEffect(() => {
    if (lockoutUntil) {
      const interval = setInterval(() => {
        if (Date.now() > lockoutUntil) {
          setLockoutUntil(null);
          setFailedAttempts(0);
          setUnlockError('');
          clearInterval(interval);
        } else {
          // Force a re-render to update the timer display
          setUnlockError(`Too many failed attempts. Try again in ${Math.ceil((lockoutUntil - Date.now()) / 1000)}s`);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [lockoutUntil]);

  const handleUnlock = () => {
    if (lockoutUntil && Date.now() < lockoutUntil) return;

    const inputHash = SHA256(passwordInput).toString();

    if (inputHash === appPassword) {
      const savedData = localStorage.getItem('budgetWiseData_v2');
      if (savedData) {
        try {
          const bytes = AES.decrypt(savedData, passwordInput);
          const decryptedJson = bytes.toString(Utf8);
          const appState = JSON.parse(decryptedJson);

          // Set all the states from the loaded data
          setTransactions(appState.transactions || []);
          setBudgets(appState.budgets || {});
          setCustomBudgets(appState.customBudgets || []);
          setCategories(appState.categories || ['Food', 'Transport', 'Entertainment', 'Shopping', 'Bills', 'Health']);
          setBudgetTemplates(appState.budgetTemplates || []);
          setBudgetRelationships(appState.budgetRelationships || []);
          setBillReminders(appState.billReminders || []);
          setSpendingAlerts(appState.spendingAlerts || []);
          setRecurringProcessingMode(appState.recurringProcessingMode || 'automatic');
          setTransferLog(appState.transferLog || []);
          setDailySpendingGoal(appState.dailySpendingGoal || 500);
          setAnalyticsTimeframe(appState.analyticsTimeframe || '30');
          setSavingsGoal(appState.savingsGoal || 15000);
          
          // Successfully unlocked and loaded
          setIsLocked(false);
          setEncryptionKey(passwordInput); // Store the raw key in memory for this session
          setFailedAttempts(0);
          setUnlockError('');
          setPasswordInput('');

        } catch (error) {
          console.error("Failed to decrypt or parse data:", error);
          setUnlockError("Data is corrupt. Could not unlock.");
        }
      } else {
        // Password exists but no data, this is an edge case.
        // Unlock the app and let it initialize with sample data.
        setIsLocked(false);
        setEncryptionKey(passwordInput);
        setUnlockError('');
        setPasswordInput('');
        initializeSampleData();
      }
    } else {
      const newFailedAttempts = failedAttempts + 1;
      setFailedAttempts(newFailedAttempts);
      if (newFailedAttempts >= 5) {
        const newLockoutUntil = Date.now() + 30000; // Lock for 30 seconds
        setLockoutUntil(newLockoutUntil);
      } else {
        setUnlockError(`Incorrect PIN. ${5 - newFailedAttempts} attempts remaining.`);
      }
      setPasswordInput('');
    }
  };

  const handleEditCustomBudget = (budget: CustomBudget) => {
    setEditingCustomBudget(budget);
    setCustomBudgetForm({
      name: budget.name,
      amount: budget.totalAmount.toString(),
      description: budget.description,
      deadline: budget.deadline || '',
      priority: budget.priority,
      categories: budget.categories || [],
      categoryBudgets: Object.fromEntries(Object.entries(budget.categoryBudgets || {}).map(([k, v]) => [k, v.toString()]))
    });
    setActiveTab('budget');
    customBudgetFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Effect to cancel editing modes when switching tabs
  useEffect(() => {
    // If we navigate away from the budget tab while editing, cancel the edit.
    if (activeTab !== 'budget' && editingCustomBudget) {
      handleCancelEdit();
    }
    // If we navigate away from the add/edit tab while editing, cancel the edit.
    if (activeTab !== 'add' && editingTransaction) {
      handleCancelTransactionEdit();
    }
  }, [activeTab]);

  // --- Back Button Handling ---
  const handleBackPress = useCallback(() => {
    // Priority 1: Close any open modal
    if (showExportModal || showTransferModal || confirmationState.isOpen) {
      setShowExportModal(false);
      setShowTransferModal(false);
      closeConfirmation();
      return true; // Indicates we handled it
    }

    // Priority 2: Cancel any editing mode
    if (editingTransaction || editingCustomBudget) {
      if (editingTransaction) handleCancelTransactionEdit();
      if (editingCustomBudget) handleCancelEdit();
      return true; // Indicates we handled it
    }
    // Priority 2.5: Go back from subscriptions to settings
    if (activeTab === 'subscriptions') {
      setActiveTab('settings');
      return true;
    }

    // Priority 3: Navigate from other tabs to the main 'add' tab
    if (activeTab !== 'add') {
      setActiveTab('add');
      return true; // Indicates we handled it
    }

    AdsManager.showInterstitial().then(() => {
      CapacitorApp.exitApp();
    });

    return true; 
  }, [activeTab, showExportModal, showTransferModal, confirmationState.isOpen, editingTransaction, editingCustomBudget]);

  useEffect(() => {
    const listenerPromise = CapacitorApp.addListener('backButton', handleBackPress);
    return () => {
      listenerPromise.then(listener => listener.remove());
    };
  }, [handleBackPress]);

  // --- Navigation Effect ---
  useEffect(() => {
    if (navigationRequest) {
      setActiveTab(navigationRequest.tab);
      if (navigationRequest.filterCategory) {
        setFilterCategory(navigationRequest.filterCategory);
      }
      setNavigationRequest(null); // Reset after navigation
    }
  }, [navigationRequest]);

  const handleCancelTransactionEdit = () => {
    setEditingTransaction(null);
    setFormData({
      category: '',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      type: 'expense',
      budgetType: 'monthly',
      customBudgetId: null,
      customCategory: '',
      tags: '',
      isRecurring: false,
      recurringFrequency: null,
    });
  };

  const handleCancelEdit = () => {
    setEditingCustomBudget(null);
    setCustomBudgetForm({
      name: '', amount: '', description: '', deadline: '', 
      priority: 'medium', categories: [], categoryBudgets: {}
    });
  };
  
  const initializeSampleData = () => {
    // Sample transactions with both budget types
    const sampleTransactions: Transaction[] = [
      {
        id: 1,
        category: 'Food',
        amount: -150,
        description: 'Groceries',
        date: (() => { const d = new Date(); d.setDate(d.getDate() - 2); return d.toISOString().split('T')[0]; })(), // 2 days ago
        type: 'expense',
        budgetType: 'monthly',
        customBudgetId: null,
        customCategory: '',
        tags: ['groceries', '2024'],
        isRecurring: false,
        recurringFrequency: null,
        timestamp: new Date().toISOString()
      },
      {
        id: 2,
        category: '',
        amount: -500,
        description: 'Flight booking',
        date: (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0]; })(), // Yesterday
        type: 'expense',
        budgetType: 'custom',
        customBudgetId: 1,
        customCategory: 'Transportation',
        tags: ['travel', 'vacation'],
        isRecurring: false,
        recurringFrequency: null,
        timestamp: new Date().toISOString()
      },
      {
        id: 3,
        category: '',
        amount: -400,
        description: 'Dinner with friends',
        date: new Date().toISOString().split('T')[0], // Today
        type: 'expense',
        budgetType: 'custom',
        customBudgetId: 1,
        customCategory: 'Accommodation',
        tags: ['travel', 'vacation'],
        isRecurring: false,
        recurringFrequency: null,
        timestamp: new Date().toISOString()
      }
    ];

    // Sample custom budgets
    const sampleCustomBudgets: CustomBudget[] = [
      {
        id: 1,
        name: 'Vacation Fund',
        description: 'Summer vacation to Goa',
        totalAmount: 50000,
        spentAmount: 1700,
        remainingAmount: 48300,
        deadline: '2025-12-31',
        priority: 'high',
        status: 'active',
        categories: ['Accommodation', 'Transportation', 'Food & Dining', 'Activities'],
        categoryBudgets: {
          'Accommodation': 20000,
          'Transportation': 15000,
          'Food & Dining': 10000,
          'Activities': 5000
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 2,
        name: 'Wedding Preparation',
        description: 'Complete wedding arrangements',
        totalAmount: 100000,
        spentAmount: 0,
        remainingAmount: 100000,
        deadline: '2026-03-15',
        priority: 'medium',
        status: 'active',
        categories: ['Venue', 'Catering', 'Photography', 'Decoration', 'Clothing'],
        categoryBudgets: {
          'Venue': 40000,
          'Catering': 30000,
          'Photography': 15000,
          'Decoration': 10000,
          'Clothing': 5000
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    // Sample monthly budgets
    const sampleBudgets: MonthlyBudgets = {
      'Food': 5000,
      'Transport': 3000,
      'Entertainment': 2000,
      'Shopping': 4000
    };

    // Only set if arrays are empty
    if (transactions.length === 0) {
      setTransactions(sampleTransactions);
    }
    if (customBudgets.length === 0) {
      setCustomBudgets(sampleCustomBudgets);
    }
    if (Object.keys(budgets).length === 0) {
      setBudgets(sampleBudgets);
    }
  };

   const handleNavigationRequest = (request: any) => {
    if (request && request.type === 'navigate') {
      setNavigationRequest(request.payload);
    }
  };

 const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setIsToastVisible(true);
    setTimeout(() => {
      setIsToastVisible(false);
    }, 3000); // Hide after 3 seconds
  }, []);
  
  const handleSetSpendingAlert = (alertData: Omit<SpendingAlert, 'id' | 'isSilenced'>) => {
    // Prevent duplicate alerts for the same category
    const existingAlert = spendingAlerts.find(alert => alert.category === alertData.category);
    if (existingAlert) {
      showToast(`An alert for "${alertData.category}" already exists.`);
      return;
    }

    const newAlert: SpendingAlert = {
      id: Date.now(),
      ...alertData,
      isSilenced: false, // Alerts are active by default
    };
    setSpendingAlerts(prevAlerts => [...prevAlerts, newAlert]);
  };

  const toggleSpendingAlertSilence = (alertId: number) => {
    setSpendingAlerts(prevAlerts =>
      prevAlerts.map(alert =>
        alert.id === alertId
          ? { ...alert, isSilenced: !alert.isSilenced }
          : alert
      )
    );
  };

  const handleDeleteSpendingAlert = (alertId: number) => {
    showConfirmation('Delete Alert', 'Are you sure you want to delete this spending alert?', () => {
      setSpendingAlerts(prevAlerts => prevAlerts.filter(a => a.id !== alertId));
    });
  };

 const checkSpendingAlerts = useCallback((allTransactions: Transaction[], currentAlerts: SpendingAlert[], changedTransactions: Transaction[]) => {
  
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

 const changedCategoryNames = new Set<string>();
    changedTransactions.forEach(t => {
        const categoryName = t.budgetType === 'custom' ? `${getCustomBudgetName(t.customBudgetId)} - ${t.customCategory}` : t.category;
        if (categoryName) {
            changedCategoryNames.add(categoryName);
        }
    });

    if (changedCategoryNames.size === 0) return;

    const relevantAlerts = currentAlerts.filter(alert => changedCategoryNames.has(alert.category));

   relevantAlerts.forEach((alert) => {
      // Skip check if the alert is silenced
      if (alert.isSilenced) {
        return;
      }

      const categorySpending = allTransactions
        .filter(t => {
        const transactionDate = new Date(t.date + 'T00:00:00');
         const categoryName = t.budgetType === 'custom' ? `${getCustomBudgetName(t.customBudgetId)} - ${t.customCategory}` : t.category;

          return t.amount < 0 &&
                 categoryName === alert.category &&
                 transactionDate.getMonth() === currentMonth &&
                 transactionDate.getFullYear() === currentYear;
        })
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      if (categorySpending > alert.threshold) {
        try {
           LocalNotifications.schedule({
            notifications: [{
              title: 'BudgetWise Alert',
              body: `You've spent ₹${categorySpending.toFixed(0)} in "${alert.category}", which is over your set threshold of ₹${alert.threshold}.`,
              id: Math.floor(Math.random() * 2147483647), // Use a unique ID for each notification instance to ensure it always fires
               schedule: { at: new Date(Date.now() + 1000), allowWhileIdle: true } // Schedule for 1 second from now to ensure it fires,
            }]
          });
        } catch (e) {
          console.error("Failed to schedule spending alert notification", e);
          // Optionally, show a toast or alert to the user on web
          if (!Capacitor.isNativePlatform()) {
            showToast(`ALERT: Spending in ${alert.category} is over ₹${alert.threshold}!`);
          }
        }
      }
    });
   }, [getCustomBudgetName, showToast]);

  const deleteTransaction = (id: number) => {
    const transactionToDelete = transactions.find(t => t.id === id);
    if (!transactionToDelete) return;

    // Check if it's a custom budget transaction
    if (transactionToDelete.budgetType === 'custom' && transactionToDelete.customBudgetId) {
      const budget = customBudgets.find(b => b.id === transactionToDelete.customBudgetId);
      // Prevent deletion if budget is paused or locked
      if (budget && (budget.status === 'paused' || budget.status === 'locked')) {
        alert(`Cannot delete transactions from a '${budget.status}' budget. Please set the budget to 'active' first.`);
        return; // Stop the deletion
      }
    }

    showConfirmation(
      'Confirm Deletion',
      'Are you sure you want to delete this transaction?',
      () => {
        const newTransactions = transactions.filter((t) => t.id !== id);
        setTransactions(newTransactions);
        recalculateCustomBudgetSpending(newTransactions, customBudgets);
      }
    );
  };

  const editTransaction = (transaction: Transaction) => {
    // Check if it's a custom budget transaction
    if (transaction.budgetType === 'custom' && transaction.customBudgetId) {
      const budget = customBudgets.find(b => b.id === transaction.customBudgetId);
      // Prevent editing if budget is paused or locked
      if (budget && (budget.status === 'paused' || budget.status === 'locked')) {
        alert(`Cannot edit transactions from a '${budget.status}' budget. Please set the budget to 'active' first.`);
        return; // Stop the edit
      }
    }

    setEditingTransaction(transaction);
    setFormData({
      category: transaction.category || '',
      amount: Math.abs(transaction.amount).toString(),
      description: transaction.description || '',
      date: transaction.date,
      type: transaction.amount < 0 ? 'expense' : 'income',
      budgetType: transaction.budgetType || 'monthly',
      customBudgetId: transaction.customBudgetId || null,
      customCategory: transaction.customCategory || '',
      tags: transaction.tags ? transaction.tags.join(', ') : '',
      isRecurring: transaction.isRecurring || false,
      recurringFrequency: transaction.recurringFrequency || null,
    });
    setActiveTab('add');
  };

  const setBudget = () => {
    if (!budgetForm.category || !budgetForm.amount) return;

    const newBudgets = {
      ...budgets,
      [budgetForm.category]: parseFloat(budgetForm.amount)
    };

    setBudgets(newBudgets);
    setBudgetForm({ category: '', amount: '' });
  };

  const createCustomBudget = () => {
    if (!customBudgetForm.name || !customBudgetForm.amount) return;

    // Calculate total category budgets
    const totalCategoryBudgets = Object.values(customBudgetForm.categoryBudgets || {}).reduce((sum, amount) => sum + (parseFloat(amount) || 0), 0);
    const overallBudget = parseFloat(customBudgetForm.amount);

    // Warning if category budgets exceed overall budget
    if (totalCategoryBudgets > overallBudget) {
      alert(`Warning: Total category budgets (₹${totalCategoryBudgets}) exceed overall budget (₹${overallBudget}). Please adjust the amounts.`);
      return;
    }

    // Parse category budget strings to numbers to match the CustomBudget interface
    const parsedCategoryBudgets: { [key: string]: number } = {};
    if (customBudgetForm.categoryBudgets) {
      for (const category in customBudgetForm.categoryBudgets) {
        const budgetValue = customBudgetForm.categoryBudgets[category];
        parsedCategoryBudgets[category] = parseFloat(budgetValue) || 0;
      }
    }

    const newCustomBudget: CustomBudget = {
      id: Date.now(),
      name: customBudgetForm.name,
      description: customBudgetForm.description,
      totalAmount: overallBudget,
      spentAmount: 0,
      remainingAmount: overallBudget,
      deadline: customBudgetForm.deadline || null,
      priority: customBudgetForm.priority,
      status: 'active',
      categories: customBudgetForm.categories,
      categoryBudgets: parsedCategoryBudgets,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const newCustomBudgets = [...customBudgets, newCustomBudget];
    setCustomBudgets(newCustomBudgets);

    setCustomBudgetForm({ 
      name: '', 
      amount: '', 
      description: '', 
      deadline: '', 
      priority: 'medium',
      categories: [],
      categoryBudgets: {}
    });
  };

  const updateCustomBudget = () => {
    if (!editingCustomBudget) return;

    const parsedCategoryBudgets: { [key: string]: number } = {};
    if (customBudgetForm.categoryBudgets) {
      for (const category in customBudgetForm.categoryBudgets) {
        parsedCategoryBudgets[category] = parseFloat(customBudgetForm.categoryBudgets[category]) || 0;
      }
    }
    const overallBudget = parseFloat(customBudgetForm.amount);

    const updatedBudgetsWithFormChanges = customBudgets.map(b => 
      b.id === editingCustomBudget.id
        ? { ...b,
            name: customBudgetForm.name,
            totalAmount: overallBudget,
            description: customBudgetForm.description,
            deadline: customBudgetForm.deadline || null,
            priority: customBudgetForm.priority,
            categories: customBudgetForm.categories,
            categoryBudgets: parsedCategoryBudgets,
            updatedAt: new Date().toISOString()
          }
        : b
    );

    setEditingCustomBudget(null);
    setCustomBudgetForm({
      name: '', amount: '', description: '', deadline: '', 
      priority: 'medium', categories: [], categoryBudgets: {}
    });
    // Recalculate spending with the new budget details to update all amounts
    recalculateCustomBudgetSpending(transactions, updatedBudgetsWithFormChanges);
  };

  const handleSaveCustomBudget = () => {
    if (editingCustomBudget) {
      updateCustomBudget();
    } else {
      createCustomBudget();
    }
  };



 const handleTransactionAdd = (newTransaction: Transaction) => {
    const newTransactions = [...transactions, newTransaction];
    setTransactions(newTransactions);
    recalculateCustomBudgetSpending(newTransactions, customBudgets);
    checkSpendingAlerts(newTransactions, spendingAlerts, [newTransaction]);
    // Reset form
    setFormData({
      category: '', amount: '', description: '', date: new Date().toISOString().split('T')[0],
      type: 'expense', budgetType: 'monthly', customBudgetId: null, customCategory: '',
      tags: '', isRecurring: false, recurringFrequency: null,
    });
  };

  const handleTransactionUpdate = (
    updateFn: (prev: Transaction[]) => Transaction[],
    changedTransaction: Transaction
  ) => {
    const updatedTransactions = updateFn(transactions);
    setTransactions(updatedTransactions);
    recalculateCustomBudgetSpending(updatedTransactions, customBudgets);
    checkSpendingAlerts(updatedTransactions, spendingAlerts, [changedTransaction]);
    handleCancelTransactionEdit();
  };
  
  const addCustomCategoryToForm = () => {
    if (newCustomCategory && !customBudgetForm.categories.includes(newCustomCategory)) {
      const newCategories = [...customBudgetForm.categories, newCustomCategory];
      const newCategoryBudgets = { ...customBudgetForm.categoryBudgets };
      newCategoryBudgets[newCustomCategory] = '';

      setCustomBudgetForm({
        ...customBudgetForm,
        categories: newCategories,
        categoryBudgets: newCategoryBudgets
      });
      setNewCustomCategory('');
    }
  };

  const removeCategoryFromForm = (categoryToRemove: string) => {
    const newCategories = customBudgetForm.categories.filter(cat => cat !== categoryToRemove);
    const newCategoryBudgets = { ...customBudgetForm.categoryBudgets };
    delete newCategoryBudgets[categoryToRemove];

    setCustomBudgetForm({
      ...customBudgetForm,
      categories: newCategories,
      categoryBudgets: newCategoryBudgets
    });
  };

  const updateCategoryBudget = (category: string, amount: string) => {
    setCustomBudgetForm({
      ...customBudgetForm,
      categoryBudgets: {
        ...customBudgetForm.categoryBudgets,
        [category]: amount
      }
    });
  };

  const getCustomBudgetCategoryBudget = (customBudgetId: number, category: string) => {
    const budget = customBudgets.find(b => b.id === customBudgetId);
    // The value in `categoryBudgets` is already a number due to parsing on creation
    return (budget && budget.categoryBudgets?.[category]) || 0;
  };

  const recalculateCustomBudgetSpending = (
    currentTransactions: Transaction[] = transactions,
    currentCustomBudgets: CustomBudget[] = customBudgets,
  ) => {
    const newCustomBudgets = currentCustomBudgets.map((budget) => {
      // Calculate actual spent amount from transactions
      const budgetTransactions = currentTransactions.filter(
        (t) => t.customBudgetId === budget.id,
      );

      const spent = budgetTransactions
        .filter((t) => t.amount < 0) // Expenses are negative
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      const income = budgetTransactions
        .filter((t) => t.amount > 0) // Income is positive
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      const remaining = budget.totalAmount - spent + income;

      const newStatus: CustomBudget['status'] =
        budget.status === 'paused' || budget.status === 'archived' || budget.status === 'locked'
        ? budget.status // Preserve these states
        : spent >= budget.totalAmount ? 'completed' : 'active';

      return {
        ...budget,
        spentAmount: spent,
        remainingAmount: remaining,
        // Use the new logic to preserve paused/archived states
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };
    });
    setCustomBudgets(newCustomBudgets);
  };

  const pauseCustomBudget = (budgetId: number) => {
    setCustomBudgets(customBudgets.map(budget => 
      budget.id === budgetId 
        ? { ...budget, status: 'paused', updatedAt: new Date().toISOString() }
        : budget
    ));
  };

  const resumeCustomBudget = (budgetId: number) => {
    setCustomBudgets(customBudgets.map(budget => 
      budget.id === budgetId 
        ? { ...budget, status: 'active', updatedAt: new Date().toISOString() }
        : budget
    ));
  };

  const handleLockBudget = (budgetId: number) => {
    setCustomBudgets(customBudgets.map(budget =>
      budget.id === budgetId
        ? { ...budget, status: budget.status === 'locked' ? 'active' : 'locked', updatedAt: new Date().toISOString() }
        : budget
    ));
  };


  const deleteCustomBudget = (budgetId: number) => {
    showConfirmation(
      'Confirm Deletion',
      'Are you sure you want to delete this budget? This will also delete all associated transactions and rollover rules. This action cannot be undone.',
      () => {
        // Filter out the budget to be deleted
        const newCustomBudgets = customBudgets.filter(b => b.id !== budgetId);
        
        // Filter out all transactions associated with this budget
        const newTransactions = transactions.filter(t => t.customBudgetId !== budgetId);

        // Filter out any rollover rules associated with this budget
        const newRelationships = budgetRelationships.filter(rel => rel.destinationBudgetId !== budgetId);

        setCustomBudgets(newCustomBudgets);
        setTransactions(newTransactions);
        setBudgetRelationships(newRelationships);
        
        alert('Custom budget, its transactions, and associated rules have been deleted.');
      }
    );
  };

  const saveAsTemplate = () => {
    if (!customBudgetForm.name || !customBudgetForm.amount) {
      alert("Please fill in at least the budget name and amount to save a template.");
      return;
    }

    const newTemplate: BudgetTemplate = {
      id: Date.now(),
      name: `${customBudgetForm.name} Template`,
      description: customBudgetForm.description,
      amount: parseFloat(customBudgetForm.amount),
      priority: customBudgetForm.priority,
      categories: customBudgetForm.categories,
      categoryBudgets: Object.entries(customBudgetForm.categoryBudgets).reduce((acc, [key, value]) => {
        acc[key] = parseFloat(value) || 0;
        return acc;
      }, {} as { [key: string]: number }),
    };

    setBudgetTemplates([...budgetTemplates, newTemplate]);
    alert(`Template "${newTemplate.name}" saved successfully!`);
  };

  const applyTemplate = (templateId: number) => {
    if (!templateId) return;
    const template = budgetTemplates.find(t => t.id === templateId);
    if (!template) {
      alert("Template not found.");
      return;
    }

    setCustomBudgetForm({
      name: template.name.replace(' Template', ''),
      amount: template.amount.toString(),
      description: template.description,
      deadline: '', // Deadline is not part of the template
      priority: template.priority,
      categories: template.categories,
      categoryBudgets: Object.fromEntries(Object.entries(template.categoryBudgets).map(([k, v]) => [k, v.toString()]))
    });

    alert(`Template "${template.name}" applied. You can now create the budget.`);
  };

  const deleteTemplate = (templateId: number) => {
    showConfirmation(
      'Confirm Deletion',
      'Are you sure you want to delete this template?',
      () => {
        setBudgetTemplates(budgetTemplates.filter(t => t.id !== templateId));
        alert("Template deleted.");
      }
    );
  };

  const addRelationship = () => {
    if (!relationshipForm.sourceCategory || !relationshipForm.destinationBudgetId) {
      alert("Please select both a source category and a destination budget.");
      return;
    }

    const newRelationship: BudgetRelationship = {
      id: Date.now(),
      sourceCategory: relationshipForm.sourceCategory,
      destinationBudgetId: parseInt(relationshipForm.destinationBudgetId),
      condition: 'end_of_month_surplus',
      createdAt: new Date().toISOString(),
    };

    setBudgetRelationships([...budgetRelationships, newRelationship]);
    setRelationshipForm({ sourceCategory: '', destinationBudgetId: '', condition: 'end_of_month_surplus' });
    alert("Rollover rule created successfully.");
  };

  const deleteRelationship = (id: number) => {
    showConfirmation(
      'Confirm Deletion',
      'Are you sure you want to delete this rollover rule?',
      () => {
        setBudgetRelationships(budgetRelationships.filter(rel => rel.id !== id));
        alert("Rule deleted.");
      }
    );
  };

  const processEndOfMonthRollovers = () => {
    showConfirmation(
      'Confirm Rollovers',
      'This will process all end-of-month rollovers based on current monthly budget surpluses. This action cannot be undone. Proceed?',
      () => {
        let totalRolledOver = 0;
        const newTransactions: Transaction[] = [];
        const now = new Date().toISOString();
        const date = now.split('T')[0];

        budgetRelationships.forEach(rel => {
          const remaining = getRemainingBudget(rel.sourceCategory, currentYear, currentMonth);
          if (remaining > 0) {
            const destinationBudget = customBudgets.find(b => b.id === rel.destinationBudgetId);
            if (destinationBudget) {
              totalRolledOver += remaining;

              // Create an income transaction for the custom budget
              const incomeTransaction: Transaction = {
                id: Date.now() + newTransactions.length,
                category: '',
                amount: remaining,
                description: `Rollover from ${rel.sourceCategory}`,
                date: date,
                type: 'income',
                budgetType: 'transfer',
                customBudgetId: destinationBudget.id,
                customCategory: 'Rollover Funds', // A specific category for rollovers
                tags: ['rollover', 'automation'],
                isRecurring: false,
                recurringFrequency: null,
                timestamp: now,
              };
              newTransactions.push(incomeTransaction);
            }
          }
        });

        if (newTransactions.length > 0) {
          const allNewTransactions = [...transactions, ...newTransactions];
          setTransactions(allNewTransactions);
          recalculateCustomBudgetSpending(allNewTransactions, customBudgets);
          alert(`Successfully processed rollovers. Total amount transferred: ₹${totalRolledOver.toFixed(2)}`);
        } else {
          alert("No monthly surpluses to roll over at this time.");
        }
      }
    );
  };

  // Date range validation utilities
  const validateDateRange = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return { isValid: false, error: 'Both start and end dates are required' };
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) return { isValid: false, error: 'Start date must be before end date' };
    
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 90) return { isValid: false, error: 'Date range cannot exceed 90 days' };
    
    return { isValid: true, dayCount: diffDays };
  };

  const getTransactionsInDateRange = (startDate: string, endDate: string, type: 'all' | 'monthly' | 'custom' = 'all') => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    return transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      
      // Check if transaction is within date range
      if (transactionDate < start || transactionDate > end) return false;
      
      // Filter by type
      if (type === 'monthly') return transaction.budgetType !== 'custom';
      if (type === 'custom') return transaction.budgetType === 'custom';
      
      return true; // 'all' type
    });
  };

  const exportDataAdvanced = async () => {
    const validation = validateDateRange(exportStartDate, exportEndDate);
    if (!validation.isValid) {
      alert(validation.error);
      return;
    }

    const filteredTransactions = getTransactionsInDateRange(exportStartDate, exportEndDate, exportType as 'all' | 'monthly' | 'custom');
    
    if (filteredTransactions.length === 0) {
      alert('No transactions found in the selected date range and type.');
      return;
    }

    // Calculate summary statistics
    const totalIncome = filteredTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = filteredTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const monthlyTransactions = filteredTransactions.filter(t => t.budgetType !== 'custom');
    const customTransactions = filteredTransactions.filter(t => t.budgetType === 'custom');

    // Category breakdown for monthly transactions
    const categoryBreakdown: { [key: string]: number } = {};
    monthlyTransactions.forEach(t => {
      if (t.category) {
        categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + Math.abs(t.amount);
      }
    });

    // Custom budget breakdown
    const customBudgetBreakdown: { [key: string]: number } = {};
    customTransactions.forEach(t => {
      if (t.customBudgetId) {
        const budgetName = getCustomBudgetName(t.customBudgetId);
        const key = `${budgetName} - ${t.customCategory}`;
        customBudgetBreakdown[key] = (customBudgetBreakdown[key] || 0) + Math.abs(t.amount);
      }
    });

    const exportData = {
      exportInfo: {
        startDate: exportStartDate,
        endDate: exportEndDate,
        dayCount: validation.dayCount,
        type: exportType,
        format: exportFormat,
        exportDate: new Date().toISOString(),
        totalTransactions: filteredTransactions.length
      },
      summary: {
        totalIncome,
        totalExpenses,
        netAmount: totalIncome - totalExpenses,
        monthlyTransactionCount: monthlyTransactions.length,
        customTransactionCount: customTransactions.length
      },
      breakdown: {
        monthlyCategories: categoryBreakdown,
        customBudgets: customBudgetBreakdown
      },
      transactions: filteredTransactions,
      budgets: {
        monthly: budgets,
        custom: customBudgets.map(budget => ({
          id: budget.id,
          name: budget.name,
          totalAmount: budget.totalAmount,
          categories: budget.categories,
          categoryBudgets: budget.categoryBudgets
        }))
      }
    };

    let content, filename, type;

    if (exportFormat === 'json') {
      content = JSON.stringify(exportData, null, 2);
      filename = `budget_export_${exportStartDate}_to_${exportEndDate}_${exportType}.json`;
      type = 'application/json';
    } else {
      
      
      // Build multi-section CSV
      const rows: string[] = [];

      // Section 1: Export Info
      rows.push("Export Info");
      Object.entries(exportData.exportInfo).forEach(([key, value]) => {
        rows.push(`${escapeCsvField(key)},${escapeCsvField(value)}`);
      });
      rows.push("");

      // Section 2: Summary
      rows.push("Summary");
      Object.entries(exportData.summary).forEach(([key, value]) => {
        rows.push(`${escapeCsvField(key)},${escapeCsvField(value)}`);
      });
      rows.push("");

      // Section 3: Breakdown - Monthly Categories
      if (Object.keys(exportData.breakdown.monthlyCategories).length > 0) {
        rows.push("Monthly Categories");
        rows.push("Category,Amount");
        Object.entries(exportData.breakdown.monthlyCategories).forEach(([cat, amount]) => {
          rows.push(`${escapeCsvField(cat)},${escapeCsvField(amount)}`);
        });
        rows.push("");
      }

      // Section 4: Breakdown - Custom Budgets
      if (Object.keys(exportData.breakdown.customBudgets).length > 0) {
        rows.push("Custom Budgets");
        rows.push("Budget-Category,Amount");
        Object.entries(exportData.breakdown.customBudgets).forEach(([key, amount]) => {
          rows.push(`${escapeCsvField(key)},${escapeCsvField(amount)}`);
        });
        rows.push("");
      }

      // Section 5: Transactions
      if (exportData.transactions.length > 0) {
        rows.push("Transactions");
        rows.push("Date,BudgetType,Category,CustomBudget,CustomCategory,Description,Amount,Type,Tags,TransactionID");
        exportData.transactions.forEach(t => {
          const budgetName = t.budgetType === 'custom' ? getCustomBudgetName(t.customBudgetId) : '';
          const category = t.budgetType === 'custom' ? '' : t.category;
          const customCategory = t.budgetType === 'custom' ? t.customCategory : '';
          const tags = t.tags?.join('; ') || '';
          const rowData = [
            t.date,
            t.budgetType || 'monthly',
            category,
            budgetName,
            customCategory,
            t.description || '',
            t.amount,
            t.amount < 0 ? 'Expense' : 'Income',
            tags,
            t.id,
          ];
          rows.push(rowData.map(escapeCsvField).join(','));
        });
        rows.push("");
      }

      // Section 6: Budgets (just summary)
      if (exportData.budgets.custom.length > 0) {
        rows.push("Custom Budgets Setup");
        rows.push("ID,Name,TotalAmount,Categories,CategoryBudgets");
        exportData.budgets.custom.forEach(b => {
          rows.push([
            b.id,
            b.name,
            b.totalAmount,
            JSON.stringify(b.categories),
            JSON.stringify(b.categoryBudgets)
          ].map(escapeCsvField).join(","));
        });
      }

      content = '\uFEFF' + rows.join("\n"); // BOM for Excel/Sheets
      
      filename = `budget_export_${exportStartDate}_to_${exportEndDate}_${exportType}.csv`;
      type = 'text/csv;charset=utf-8;';
    }

    if (Capacitor.isNativePlatform()) {
      try {
        const { readablePath } = await FileService.writeFile(filename, content, 'csv');
        alert(`Export saved to: ${readablePath}`);
      } catch (e) {
        alert(`Error saving export: ${(e as Error).message}`);
      }
    } else {
      // Web fallback
      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    // Reset form and close modal
    setShowExportModal(false);
    setExportStartDate('');
    setExportEndDate('');
    setExportFormat('json');
    setExportType('all');
  };

  const handleDescriptionChange = (description: string) => {
    setFormData(prevFormData => {
      const updatedFormData = { ...prevFormData, description };

 // Suggestion logic now uses the most up-to-date state
      if (updatedFormData.budgetType !== 'monthly' || updatedFormData.category) {
        setCategorySuggestion(null);
      } else if (description.length < 3) {
        setCategorySuggestion(null);
      } else {
        const lowerDesc = description.toLowerCase();
        let suggestionFound = false;
        for (const category in CATEGORY_KEYWORDS) {
          for (const keyword of CATEGORY_KEYWORDS[category]) {
            if (lowerDesc.includes(keyword)) {
              setCategorySuggestion(category);
              suggestionFound = true;
              break;
            }
          }
          if (suggestionFound) break;
        }
        if (!suggestionFound) {
          setCategorySuggestion(null);
        }
      }

    return updatedFormData;
    });  
  };

  const handleTransferFunds = () => {
    const { fromBudgetId, toBudgetId, transferAmount, fromCategory, toCategoryAllocations } = transferForm;
    const amount = parseFloat(transferAmount);

    // 1. Validation
    if (!fromBudgetId || !toBudgetId || !fromCategory || !transferAmount || isNaN(amount) || amount <= 0) {
      alert('Please fill all fields and enter a valid positive amount.');
      return;
    }

    const fromBudgetIdNum = parseInt(fromBudgetId);
    const toBudgetIdNum = parseInt(toBudgetId);

    const sourceBudget = customBudgets.find(b => b.id === fromBudgetIdNum);
    const destinationBudget = customBudgets.find(b => b.id === toBudgetIdNum);

    if (!sourceBudget || !destinationBudget) {
      alert('Source or destination budget not found.');
      return;
    }

    // Check source funds
    const sourceCategoryBudget = sourceBudget.categoryBudgets[fromCategory] || 0;
    const sourceCategorySpent = customCategorySpending[sourceBudget.id]?.[fromCategory] || 0;
    const availableInCategory = sourceCategoryBudget - sourceCategorySpent;

    if (amount > availableInCategory) {
      alert(`Not enough funds in category "${fromCategory}". Available: ₹${availableInCategory.toFixed(2)}`);
      return;
    }

    // Check destination allocation
    const totalAllocated = Object.values(toCategoryAllocations).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
    if (Math.abs(totalAllocated - amount) > 0.01) { // Use a tolerance for float comparison
      alert(`The allocated amount (₹${totalAllocated.toFixed(2)}) must equal the transfer amount (₹${amount.toFixed(2)}).`);
      return;
    }

    const now = new Date().toISOString();
    const date = now.split('T')[0];

    const baseId = Date.now();

    // 2. Create corresponding transactions for the audit trail, as per the UI Guide.
    // This is the correct way to handle transfers, as budget spending is calculated from transactions.
    const expenseTransaction: Transaction = {
      id: baseId,
      category: '', // Required property for type Transaction
      type: 'expense',
      amount: -amount,
      description: `Transfer to "${destinationBudget.name}" from category "${fromCategory}"`,
      date: date,
      budgetType: 'custom',
      customBudgetId: fromBudgetIdNum,
      customCategory: fromCategory,
      tags: ['transfer'],
      isRecurring: false,
      recurringFrequency: null,
      timestamp: now,
    };

    const incomeTransactions: Transaction[] = Object.entries(toCategoryAllocations).map(([category, allocationAmountStr], index): Transaction | null => {
      const allocationAmount = parseFloat(allocationAmountStr);
      if (isNaN(allocationAmount) || allocationAmount <= 0) {
        return null;
      }
      const transaction: Transaction = {
        id: baseId + 1 + index,
        category: '', // Required property for type Transaction
        type: 'income',
        amount: allocationAmount,
        description: `Transfer from "${sourceBudget.name}" to category "${category}"`,
        date: date,
        budgetType: 'custom',
        customBudgetId: toBudgetIdNum,
        customCategory: category,
        tags: ['transfer'],
        isRecurring: false,
        recurringFrequency: null,
        timestamp: now,
      };
      return transaction;
    }).filter((t): t is Transaction => t !== null);

    const newTransactions: Transaction[] = [expenseTransaction, ...incomeTransactions];

    // 3. Create an audit log for the transfer (this is now supplemental to the transactions)
    const newTransferEvent: TransferEvent = {
      id: baseId + 1 + incomeTransactions.length,
      date: now,
      amount: amount,
      fromBudgetId: fromBudgetIdNum,
      fromCategory: fromCategory,
      toBudgetId: toBudgetIdNum,
      toCategoryAllocations: Object.entries(toCategoryAllocations).reduce((acc, [key, value]) => {
        acc[key] = parseFloat(value) || 0;
        return acc;
      }, {} as { [key: string]: number }),
    };

    setTransferLog([...transferLog, newTransferEvent]);

    // Add new transactions and recalculate all budget spending
    const allNewTransactions = [...transactions, ...newTransactions];
    setTransactions(allNewTransactions);
    recalculateCustomBudgetSpending(allNewTransactions, customBudgets);

    // 4. Reset and close
    setShowTransferModal(false);
    setTransferForm({ fromBudgetId: '', toBudgetId: '', transferAmount: '', fromCategory: '', toCategoryAllocations: {} });
    alert('Fund transfer successful!');
  };
  const getSpentAmount = (category: string, year: number, month: number) => {
    return transactions
      .filter(t => {
        const transactionDate = new Date(t.date);
        return t.category === category && t.amount < 0 && (t.budgetType === 'monthly' || !t.budgetType) &&
               transactionDate.getFullYear() === year && transactionDate.getMonth() === month;
      })
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  };

   const getCustomBudgetCategories = (customBudgetId: number | null) => {
    const budget = customBudgets.find(b => b.id === customBudgetId);
    return budget ? budget.categories : [];
  };

  const processRecurringTransactions = (isSilent = false) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newTransactions: Transaction[] = [];
    let processedCount = 0;

    const updatedOriginals = transactions.map(t => {
      if (t.isRecurring && t.recurringFrequency) {
        let lastProcessed = t.lastProcessedDate ? new Date(t.lastProcessedDate) : new Date(t.date);
        let nextDate = new Date(lastProcessed);

        while (true) {
          if (t.recurringFrequency === 'daily') nextDate.setDate(nextDate.getDate() + 1);
          else if (t.recurringFrequency === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
          else if (t.recurringFrequency === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
          else break;

          if (nextDate <= today) {
            newTransactions.push({
              ...t,
              id: Date.now() + newTransactions.length,
              date: nextDate.toISOString().split('T')[0],
              isRecurring: false,
              recurringFrequency: null,
              lastProcessedDate: undefined,
              tags: [...(t.tags || []), 'recurring'],
              description: `${t.description} (Recurring)`
            });
            lastProcessed = new Date(nextDate);
            processedCount++;
          } else {
            break;
          }
        }
        // Update the original recurring transaction's last processed date, preserving the original start date
        return { ...t, lastProcessedDate: lastProcessed.toISOString().split('T')[0] };
      }
      return t;
    });

    if (newTransactions.length > 0) {
      const allNewTransactions = [...updatedOriginals, ...newTransactions];
      setTransactions(allNewTransactions);
      checkSpendingAlerts(allNewTransactions, spendingAlerts, newTransactions); // Check alerts for the newly created transactions
      if (!isSilent) alert(`${processedCount} recurring transaction(s) have been created.`);
    } else if (!isSilent) {
      alert("No new recurring transactions are due.");
    }
  };

  const quickCSVExport = async () => {
    try {
      const filename = `BudgetWise_Quick_Export_${new Date().toISOString().split('T')[0]}.csv`;
      const headers = [
        'Date',
        'BudgetType',
        'Category',
        'CustomBudget',
        'CustomCategory',
        'Description',
        'Amount',
        'Type',
        'Tags',
        'TransactionID'
      ].join(',');

      const rows = transactions.map(t =>
        [
          t.date,
          t.budgetType || 'monthly',
          t.budgetType === 'custom' ? '' : t.category,
          t.budgetType === 'custom' ? getCustomBudgetName(t.customBudgetId) : '',
          t.budgetType === 'custom' ? t.customCategory : '',
          t.description || '',
          t.amount,
          t.amount < 0 ? 'Expense' : 'Income',
          t.tags?.join('; ') || '',
          t.id,
        ].map(escapeCsvField).join(','));
      
        const content = '\uFEFF' + [headers, ...rows].join('\n');

      if (Capacitor.isNativePlatform()) {
        const { readablePath } = await FileService.writeFile(filename, content, 'csv');
        alert(`CSV saved to: ${readablePath}`);
      } else {
        const type = 'text/csv;charset=utf-8;';
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (error) {
      console.error('Quick CSV Export failed:', error);
      alert(`Quick CSV Export failed: ${(error as Error).message}`);
    }
  };
  
  const getRemainingBudget = (category: string, year: number, month: number) => {
    const budget = budgets[category] || 0;
    const spent = getSpentAmount(category, year, month);
    return budget - spent;
  };

  const getMonthlyStats = (year: number, month: number) => {
    const monthlyTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return (t.budgetType === 'monthly' || !t.budgetType) &&
             transactionDate.getFullYear() === year &&
             transactionDate.getMonth() === month;
    });
    const customTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return t.budgetType === 'custom' &&
             transactionDate.getFullYear() === year &&
             transactionDate.getMonth() === month;
    });
    
    const totalIncome = monthlyTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = monthlyTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const totalBudget = Object.values(budgets).reduce((sum, budget) => sum + budget, 0);
    
    const customBudgetSpent = customTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    return { 
      totalIncome, 
      totalExpenses, 
      totalBudget, 
      balance: totalIncome - totalExpenses,
      customBudgetSpent
    };
  };

  // --- Memoized calculations ---
  const allTags = useMemo(() => {
    const staticTags = ['Monthly', 'Custom', 'Transfer', 'Recurring'];
    const dynamicTags = new Set<string>();
    transactions.forEach(t => {
      t.tags?.forEach(tag => dynamicTags.add(tag));
    });
    // If there are transfers, ensure the 'Transfer' tag is available for filtering
    if (transferLog.length > 0 && !staticTags.includes('Transfer')) {
      staticTags.push('Transfer');
    }
    return [...staticTags, ...Array.from(dynamicTags).sort((a, b) => a.localeCompare(b))];
  }, [transactions]);

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

  // Placeholder for the settings tab rendering.
  const renderSettingsTab = () => {
    return (
      <div className="p-4 space-y-6">
        <SecuritySettings
          appPassword={appPassword}
          setAppPassword={setAppPassword}
          onPasswordSet={(pin) => setEncryptionKey(pin)}
          onPasswordRemoved={() => setEncryptionKey(null)}
          showConfirmation={showConfirmation}
          transactions={transactions}
          budgets={budgets}
          customBudgets={customBudgets}
          categories={categories}
          budgetTemplates={budgetTemplates}
          budgetRelationships={budgetRelationships}
          billReminders={billReminders}
          transferLog={transferLog}
          spendingAlerts={spendingAlerts}
          recurringProcessingMode={recurringProcessingMode}
          savingsGoal={savingsGoal}
          dailySpendingGoal={dailySpendingGoal}
          analyticsTimeframe={analyticsTimeframe}
        />

        <DataManagement
          transactions={transactions}
          budgets={budgets}
          customBudgets={customBudgets}
          categories={categories}
          budgetTemplates={budgetTemplates}
          budgetRelationships={budgetRelationships}
          billReminders={billReminders}
          transferLog={transferLog}
          recurringProcessingMode={recurringProcessingMode}
          currentYear={currentYear}
          currentMonth={currentMonth}
          spendingAlerts={spendingAlerts}
          setTransactions={setTransactions} setBudgets={setBudgets} setCustomBudgets={setCustomBudgets}
          setCategories={setCategories} setBudgetTemplates={setBudgetTemplates} setBudgetRelationships={setBudgetRelationships}
          setBillReminders={setBillReminders} setTransferLog={setTransferLog} setRecurringProcessingMode={setRecurringProcessingMode}
          setSpendingAlerts={setSpendingAlerts} setSavingsGoal={setSavingsGoal} setDailySpendingGoal={setDailySpendingGoal}
          setAnalyticsTimeframe={setAnalyticsTimeframe}
          showConfirmation={showConfirmation}
          getCustomBudgetName={getCustomBudgetName}
          dailySpendingGoal={dailySpendingGoal}
          analyticsTimeframe={analyticsTimeframe}
          savingsGoal={savingsGoal}
          getSpentAmount={getSpentAmount}
          getRemainingBudget={getRemainingBudget}
        />

        {hasAccessTo(Feature.SpendingAlerts) && (
          <AlertManagement
            spendingAlerts={spendingAlerts}
            onDeleteAlert={handleDeleteSpendingAlert}
            onToggleSilence={toggleSpendingAlertSilence}
          />
        )}

        {/* Recurring Transactions */}
        {hasAccessTo(Feature.RecurringTransactions) && (
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Recurring Transactions</h2>
            <p className="text-sm text-gray-600 mb-3">Choose how recurring transactions are processed.</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setRecurringProcessingMode('automatic')}
                className={`p-3 rounded-xl font-medium transition-colors ${
                  recurringProcessingMode === 'automatic' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                Automatic
              </button>
              <button
                onClick={() => setRecurringProcessingMode('manual')}
                className={`p-3 rounded-xl font-medium transition-colors ${
                  recurringProcessingMode === 'manual' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                Manual
              </button>
            </div>
            {recurringProcessingMode === 'manual' && (
              <button onClick={() => processRecurringTransactions(false)} className="w-full mt-4 p-3 bg-teal-100 text-teal-800 rounded-xl font-semibold hover:bg-teal-200 flex items-center justify-center">
                <Repeat size={18} className="mr-2" />
                Process Recurring Transactions
              </button>
            )}
          </div>
        )}

        {/* Subscriptions Section */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Manage Subscription</h2>
          <p className="text-sm text-gray-600 mb-3">
            You are currently on the <span className="font-semibold">{subscriptionTier.charAt(0).toUpperCase() + subscriptionTier.slice(1)}</span> plan.
          </p>
          <button
            onClick={() => setActiveTab('subscriptions')}
            className="w-full p-3 bg-yellow-100 text-yellow-800 rounded-xl font-semibold hover:bg-yellow-200 flex items-center justify-center"
          >
            <Star size={18} className="mr-2" />
            View Subscription Plans
          </button>
        </div>

      </div>
    );
  };

  const monthlyIncome = useMemo(() => {
    return transactions
      .filter(t => {
        const transactionDate = new Date(t.date);
        return t.type === 'income' &&
               transactionDate.getFullYear() === currentYear &&
               transactionDate.getMonth() === currentMonth;
      })
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions, currentYear, currentMonth]);

  const totalMonthlyBudget = useMemo(() => {
    return Object.values(budgets).reduce((sum, b) => sum + b, 0);
  }, [budgets]);

  const stats = getMonthlyStats(currentYear, currentMonth);

  return (
    isLocked ? (
      <div className="max-w-md mx-auto bg-gradient-to-br from-purple-50 to-blue-50 min-h-screen flex items-center justify-center p-4">
        <div className="w-full bg-white rounded-2xl p-8 shadow-lg text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">BudgetWise</h1>
          <p className="text-gray-600 mb-6">App is locked. Please enter your password.</p>
          <div className="space-y-4">
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleUnlock();
                }
              }}
              placeholder="Enter PIN"
              className="w-full p-3 border border-gray-300 rounded-xl text-center focus:ring-2 focus:ring-purple-500"
            />
            {unlockError && (
              <p className="text-red-500 text-sm min-h-[20px]">{unlockError}</p>
            )}
            <button
              onClick={handleUnlock}
              disabled={!!lockoutUntil}
              className="w-full p-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700"
            >
              Unlock
            </button>
            
            {/* --- Temporary Tier Selector for Testing --- */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2">For Testing Only: Force Subscription Tier</p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    localStorage.setItem('budgetwise_tier', 'free');
                    window.location.reload();
                  }}
                  className="p-2 bg-gray-200 text-gray-700 rounded-lg text-xs hover:bg-gray-300"
                >
                  Free
                </button>
                <button
                  onClick={() => {
                    localStorage.setItem('budgetwise_tier', 'plus');
                    window.location.reload();
                  }}
                  className="p-2 bg-yellow-200 text-yellow-800 rounded-lg text-xs hover:bg-yellow-300"
                >
                  Plus
                </button>
                <button
                  onClick={() => {
                    localStorage.setItem('budgetwise_tier', 'premium');
                    window.location.reload();
                  }}
                  className="p-2 bg-purple-200 text-purple-800 rounded-lg text-xs hover:bg-purple-300"
                >
                  Premium
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    ) : (
    <div className="max-w-md mx-auto bg-gradient-to-br from-purple-50 to-blue-50 min-h-screen">
      <Header
        stats={stats}
        currentYear={currentYear}
        currentMonth={currentMonth}
        onSetShowExportModal={setShowExportModal}
        onQuickCSVExport={quickCSVExport}
        onSetActiveTab={setActiveTab}
        onSetCurrentMonth={setCurrentMonth}
        onSetCurrentYear={setCurrentYear}
      />

      {/* Main Content */}
      <div className="flex-1 pb-20">
        {/* Render active tab content */}
        {/* Add Transaction Tab */}
        {activeTab === 'add' && (
          <AddTab
            editingTransaction={editingTransaction}
            formData={formData}
            setFormData={setFormData}
            categories={categories}
            customBudgets={customBudgets}
            budgets={budgets}
            setCategories={setCategories}
            setBudgets={setBudgets}
            setCustomBudgets={setCustomBudgets}
            onTransactionAdd={handleTransactionAdd}
            onTransactionUpdate={handleTransactionUpdate}
            onCancelEdit={handleCancelTransactionEdit}
            getCustomBudgetCategories={getCustomBudgetCategories}
            categorySuggestion={categorySuggestion}
            onDescriptionChange={handleDescriptionChange}
            onSetCategoryFromSuggestion={(category) => {
              setFormData({ ...formData, category });
              setCategorySuggestion(null);
            }}
          />
        )}

        {/* Transaction History Tab */}
        {activeTab === 'history' && (
          <HistoryTab
            transactions={transactions}
            transferLog={transferLog}
            currentYear={currentYear}
            currentMonth={currentMonth}
            filterCategory={filterCategory}
            setFilterCategory={setFilterCategory}
            filterTag={filterTag}
            setFilterTag={setFilterTag}
            categories={categories}
            customBudgets={customBudgets}
            allTags={allTags}
            editTransaction={editTransaction}
            deleteTransaction={deleteTransaction}
            getCustomBudgetName={getCustomBudgetName}
          />
        )}

        {/* Budget Management Tab */}
        {activeTab === 'budget' && (
          <BudgetTab
            monthlyIncome={monthlyIncome}
            totalMonthlyBudget={totalMonthlyBudget}
            budgetForm={budgetForm}
            setBudgetForm={setBudgetForm}
            categories={categories}
            budgets={budgets}
            setBudget={setBudget}
            customBudgetFormRef={customBudgetFormRef}
            editingCustomBudget={editingCustomBudget}
            customBudgetForm={customBudgetForm}
            setCustomBudgetForm={setCustomBudgetForm}
            handleSaveCustomBudget={handleSaveCustomBudget}
            handleCancelEdit={handleCancelEdit}
            saveAsTemplate={saveAsTemplate}
            budgetTemplates={budgetTemplates}
            selectedTemplate={selectedTemplate}
            setSelectedTemplate={setSelectedTemplate}
            applyTemplate={applyTemplate}
            deleteTemplate={deleteTemplate}
            relationshipForm={relationshipForm}
            setRelationshipForm={setRelationshipForm}
            getRemainingBudget={getRemainingBudget}
            currentYear={currentYear}
            currentMonth={currentMonth}
            customBudgets={customBudgets}
            addRelationship={addRelationship}
            budgetRelationships={budgetRelationships}
            getCustomBudgetName={getCustomBudgetName}
            deleteRelationship={deleteRelationship}
            processEndOfMonthRollovers={processEndOfMonthRollovers}
            setShowTransferModal={setShowTransferModal}
            handleLockBudget={handleLockBudget}
            pauseCustomBudget={pauseCustomBudget}
            handleEditCustomBudget={handleEditCustomBudget}
            deleteCustomBudget={deleteCustomBudget}
            resumeCustomBudget={resumeCustomBudget}
            getCustomBudgetCategoryBudget={getCustomBudgetCategoryBudget}
            customCategorySpending={customCategorySpending}
            transactions={transactions}
            newCustomCategory={newCustomCategory}
            setNewCustomCategory={setNewCustomCategory}
            addCustomCategoryToForm={addCustomCategoryToForm}
            removeCategoryFromForm={removeCategoryFromForm}
            updateCategoryBudget={updateCategoryBudget}
            getSpentAmount={getSpentAmount}
          />
        )}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Export Data</h2>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Export Type</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setExportType('all')}
                    className={`p-3 rounded-xl text-sm font-medium transition-colors ${
                      exportType === 'all'
                        ? 'bg-purple-100 text-purple-700 border-2 border-purple-300'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    All Data
                  </button>
                  <button
                    onClick={() => setExportType('monthly')}
                    className={`p-3 rounded-xl text-sm font-medium transition-colors ${
                      exportType === 'monthly'
                        ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    Monthly Only
                  </button>
                  <button
                    onClick={() => setExportType('custom')}
                    className={`p-3 rounded-xl text-sm font-medium transition-colors ${
                      exportType === 'custom'
                        ? 'bg-green-100 text-green-700 border-2 border-green-300'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    Custom Only
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range (Max 90 days)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">From</label>
                    <input
                      type="date"
                      value={exportStartDate}
                      onChange={(e) => {
                        setExportStartDate(e.target.value);
                        // Auto-validate 90-day constraint
                        if (exportEndDate && e.target.value) {
                          const startDate = new Date(e.target.value);
                          const endDate = new Date(exportEndDate);
                          const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                          if (daysDiff > 90) {
                            // Auto-adjust end date to maintain 90-day limit
                            const maxEndDate = new Date(startDate);
                            maxEndDate.setDate(maxEndDate.getDate() + 90);
                            setExportEndDate(maxEndDate.toISOString().split('T')[0]);
                          }
                        }
                      }}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">To</label>
                    <input
                      type="date"
                      value={exportEndDate}
                      onChange={(e) => {
                        setExportEndDate(e.target.value);
                        // Auto-validate 90-day constraint
                        if (exportStartDate && e.target.value) {
                          const startDate = new Date(exportStartDate);
                          const endDate = new Date(e.target.value);
                          const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                          if (daysDiff > 90) {
                            // Auto-adjust start date to maintain 90-day limit
                            const minStartDate = new Date(endDate);
                            minStartDate.setDate(minStartDate.getDate() - 90);
                            setExportStartDate(minStartDate.toISOString().split('T')[0]);
                          }
                        }
                      }}
                      min={exportStartDate}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 text-sm"
                    />
                  </div>
                </div>
                
                {/* Quick date range buttons */}
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <button
                    onClick={() => {
                      const today = new Date();
                      const thirtyDaysAgo = new Date();
                      thirtyDaysAgo.setDate(today.getDate() - 30);
                      setExportStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
                      setExportEndDate(today.toISOString().split('T')[0]);
                    }}
                    className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs"
                  >
                    Last 30 Days
                  </button>
                  <button
                    onClick={() => {
                      const today = new Date();
                      const sixtyDaysAgo = new Date();
                      sixtyDaysAgo.setDate(today.getDate() - 60);
                      setExportStartDate(sixtyDaysAgo.toISOString().split('T')[0]);
                      setExportEndDate(today.toISOString().split('T')[0]);
                    }}
                    className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs"
                  >
                    Last 60 Days
                  </button>
                  <button
                    onClick={() => {
                      const today = new Date();
                      const ninetyDaysAgo = new Date();
                      ninetyDaysAgo.setDate(today.getDate() - 90);
                      setExportStartDate(ninetyDaysAgo.toISOString().split('T')[0]);
                      setExportEndDate(today.toISOString().split('T')[0]);
                    }}
                    className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs"
                  >
                    Last 90 Days
                  </button>
                </div>

                {/* Date range validation feedback */}
                {exportStartDate && exportEndDate && (
                  <div className="text-sm">
                    {(() => {
                      const startDate = new Date(exportStartDate);
                      const endDate = new Date(exportEndDate);
                      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                      const filteredCount = transactions.filter(t => {
                        const transactionDate = new Date(t.date);
                        return transactionDate >= startDate && transactionDate <= endDate;
                      }).length;
                      
                      if (daysDiff > 90) {
                        return <p className="text-red-600">⚠️ Range exceeds 90 days ({daysDiff} days)</p>;
                      }
                      return (
                        <div className="text-green-600">
                          <p>✓ Valid range: {daysDiff} days</p>
                          <p className="text-gray-600">{filteredCount} transactions will be exported</p>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setExportFormat('json')}
                    className={`p-3 rounded-xl text-sm font-medium transition-colors ${
                      exportFormat === 'json'
                        ? 'bg-purple-100 text-purple-700 border-2 border-purple-300'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    JSON (Full Data)
                  </button>
                  <button
                    onClick={() => setExportFormat('csv')}
                    className={`p-3 rounded-xl text-sm font-medium transition-colors ${
                      exportFormat === 'csv'
                        ? 'bg-green-100 text-green-700 border-2 border-green-300'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    CSV (Spreadsheet)
                  </button>
                </div>
              </div>

              <div className="pt-4 space-y-2">
                <button
                  onClick={exportDataAdvanced}
                  disabled={!exportStartDate || !exportEndDate || !validateDateRange(exportStartDate, exportEndDate).isValid}
                  className="w-full p-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Export Data {exportStartDate && exportEndDate && `(${exportType})`}
                </button>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="w-full p-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
              <div className="text-xs text-gray-500 text-center mt-4 space-y-1">
                <p>• JSON includes complete data with budgets and categories</p>
                <p>• CSV is optimized for spreadsheet applications</p>
                <p>• Date range limited to 90 days maximum</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fund Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowTransferModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Transfer Funds</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">From Budget</label>
                <select
                  value={transferForm.fromBudgetId}
                  onChange={(e) => setTransferForm({
                    ...transferForm,
                    fromBudgetId: e.target.value,
                    toBudgetId: '',
                    fromCategory: '',
                    toCategoryAllocations: {}
                  })}
                  className="w-full p-3 border border-gray-300 rounded-xl">
                  <option value="">Select source</option>
        {customBudgets.filter(b => b.status === 'active').map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {transferForm.fromBudgetId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">From Category</label>
                  <select
                    value={transferForm.fromCategory}
                    onChange={(e) => setTransferForm({ ...transferForm, fromCategory: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-xl"
                  >
                    <option value="">Select source category</option>
                    {customBudgets.find(b => b.id === parseInt(transferForm.fromBudgetId))?.categories.map(cat => {
                      const budget = customBudgets.find(b => b.id === parseInt(transferForm.fromBudgetId))!;
                      const categoryBudget = budget.categoryBudgets[cat] || 0;
                      const categorySpent = customCategorySpending[budget.id]?.[cat] || 0;
                      const available = categoryBudget - categorySpent;
                      return (
                        <option key={cat} value={cat} disabled={available <= 0}>
                          {cat} (Available: ₹{available.toFixed(2)})
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount to Transfer</label>
                <input
                  type="number"
                  value={transferForm.transferAmount}
                  onChange={(e) => setTransferForm({ ...transferForm, transferAmount: e.target.value, toCategoryAllocations: {} })}
                  placeholder="0.00"
                  className="w-full p-3 border border-gray-300 rounded-xl"
                  disabled={!transferForm.fromCategory}
                />
              </div>

              {transferForm.fromBudgetId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">To Budget</label>
                  <select
                    value={transferForm.toBudgetId}
                    onChange={(e) => setTransferForm({ ...transferForm, toBudgetId: e.target.value, toCategoryAllocations: {} })}
                    className="w-full p-3 border border-gray-300 rounded-xl"
                  >
                    <option value="">Select destination</option>
                    {customBudgets.filter(b => b.status === 'active' && b.id !== parseInt(transferForm.fromBudgetId || '0')).map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {transferForm.toBudgetId && parseFloat(transferForm.transferAmount) > 0 && (
                <div className="p-4 bg-gray-50 rounded-lg space-y-3 border border-gray-200">
                  <h3 className="font-semibold text-gray-700">Allocate to Destination Categories</h3>
                  {customBudgets.find(b => b.id === parseInt(transferForm.toBudgetId))?.categories.map(cat => (
                    <div key={cat} className="flex items-center space-x-2">
                      <label className="w-1/2 text-sm text-gray-600">{cat}</label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={transferForm.toCategoryAllocations[cat] || ''}
                        onChange={(e) => {
                          const newAllocations = { ...transferForm.toCategoryAllocations };
                          newAllocations[cat] = e.target.value;
                          setTransferForm({ ...transferForm, toCategoryAllocations: newAllocations });
                        }}
                        className="w-1/2 p-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  ))}
                  <div className="pt-2 border-t mt-2">
                    <div className="flex justify-between text-sm font-medium">
                      <span>Total Allocated:</span>
                      <span>₹{Object.values(transferForm.toCategoryAllocations).reduce((sum, val) => sum + (parseFloat(val) || 0), 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Transfer Amount:</span>
                      <span className="text-gray-600">₹{(parseFloat(transferForm.transferAmount) || 0).toFixed(2)}</span>
                    </div>
                    {Math.abs(Object.values(transferForm.toCategoryAllocations).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) - (parseFloat(transferForm.transferAmount) || 0)) > 0.01 && (
                      <p className="text-red-600 text-xs text-right mt-1">Amounts must match!</p>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-4 space-y-2">
                <button
                  onClick={handleTransferFunds}
                  className="w-full p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold"
                >
                  Transfer
                </button>
                <button onClick={() => setShowTransferModal(false)} className="w-full p-3 bg-gray-200 text-gray-700 rounded-xl">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
                <AnalyticsTab
                  transactions={transactions}
                  budgets={budgets}
                  getCustomBudgetName={getCustomBudgetName}
                  savingsGoal={savingsGoal}
                  setSavingsGoal={setSavingsGoal}
                  dailySpendingGoal={dailySpendingGoal}
                  setDailySpendingGoal={setDailySpendingGoal}
                  analyticsTimeframe={analyticsTimeframe}
                  setAnalyticsTimeframe={setAnalyticsTimeframe}
                  onSetAlert={handleSetSpendingAlert}
                  spendingAlerts={spendingAlerts}
                  handleNavigationRequest={handleNavigationRequest}
                />
              )}
        {activeTab === 'reminders' && hasAccessTo(Feature.BillReminders) ? (
          <BillReminderTab billReminders={billReminders} setBillReminders={setBillReminders} showConfirmation={showConfirmation} />
        ) : activeTab === 'reminders' && (
          <div className="p-6 text-center bg-white rounded-2xl m-4 shadow-lg">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Never Miss a Payment</h2>
            <p className="text-gray-600 mb-4">
              Upgrade to Plus or Premium to set bill reminders and get notified before your due dates.
            </p>
            <button
              onClick={() => setActiveTab('subscriptions')}
              className="p-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700"
            >
              View Plans
            </button>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && renderSettingsTab()}

        {/* Subscription Screen */}
        {activeTab === 'subscriptions' && (
          <SubscriptionScreen
            onBack={() => setActiveTab('settings')}
            subscriptionTier={subscriptionTier}
            showToast={showToast}
          />
        )}
      </div>

      <ConfirmationModal
        isOpen={confirmationState.isOpen}
        onClose={closeConfirmation}
        onConfirm={confirmationState.onConfirm}
        title={confirmationState.title}
        message={confirmationState.message}
      />

      <Toast
        message={toastMessage}
        isVisible={isToastVisible}
      />

      <BottomNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </div>
    )
  );
};

export default App;