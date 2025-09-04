import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Plus, Settings, Download, Trash2, Edit3, List, PieChart, ArrowUpDown, BarChart3, Pause, Play, Save, Link2, ArrowRight, Repeat, FileSpreadsheet, Bell, Unlock, X, XCircle, Lock } from 'lucide-react';

import {Capacitor} from '@capacitor/core';
import {Filesystem, Directory, Encoding} from '@capacitor/filesystem';
import {
  Transaction,
  MonthlyBudgets,
  CustomBudget,
  BudgetTemplate,
  BudgetRelationship,
  BillReminder,
  TransactionFormData,
  CustomBudgetFormData,
  RelationshipFormData,
  TransferEvent,
} from './types';
import AnalyticsTab from './components/AnalyticsTab';
import DataManagement from './components/DataManagement';
import { LocalNotifications } from '@capacitor/local-notifications';

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
            onClick={async () => {
              if (onConfirm) {
                await onConfirm();
              }
              onClose();
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

const App = () => {
  const [activeTab, setActiveTab] = useState('add');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<MonthlyBudgets>({});
  const [customBudgets, setCustomBudgets] = useState<CustomBudget[]>([]);
  const [categories, setCategories] = useState(['Food', 'Transport', 'Entertainment', 'Shopping', 'Bills', 'Health']);
  const [transferLog, setTransferLog] = useState<TransferEvent[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [sortBy, setSortBy] = useState('date');
  const [filterCategory, setFilterCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingCustomBudget, setEditingCustomBudget] = useState<CustomBudget | null>(null);
  const [filterTag, setFilterTag] = useState('');
  const [recurringProcessingMode, setRecurringProcessingMode] = useState<'automatic' | 'manual'>('automatic');
  const [dailySpendingGoal, setDailySpendingGoal] = useState(500);
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState('30');
  const [savingsGoal, setSavingsGoal] = useState(15000);

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


  // Security & Persistence
  const [appPassword, setAppPassword] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(true);
  const [passwordInput, setPasswordInput] = useState('');
  const [unlockError, setUnlockError] = useState('');

  // Bill Reminders
  const [billReminders, setBillReminders] = useState<BillReminder[]>([]);
  const [editingBillReminder, setEditingBillReminder] = useState<BillReminder | null>(null);
  const [billForm, setBillForm] = useState({ name: '', amount: '', dueDate: '' });

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
  const [showCustomCategoryInput, setShowCustomCategoryInput] = useState(false);
  const [newCustomCategory, setNewCustomCategory] = useState('');
  const [selectedCustomBudgetForCategory, setSelectedCustomBudgetForCategory] = useState<number | null>(null);

  const customBudgetFormRef = useRef<HTMLDivElement>(null);

  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  
  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportFormat, setExportFormat] = useState('json');
  const [exportType, setExportType] = useState('all'); // 'all', 'monthly', 'custom'

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
                setTransferLog(appState.transferLog || []);
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

  // Load data from localStorage on initial render
  useEffect(() => {
    const savedPassword = localStorage.getItem('appPassword_v2');
    if (savedPassword) {
      setAppPassword(savedPassword);
      setIsLocked(true);
      // Data will be loaded upon successful unlock
    } else {
      setIsLocked(false); // No password set, unlock the app
      loadAndInitializeData(); // Load existing data or initialize samples
    }
  }, []);

  // Encrypt and save data to localStorage whenever it changes
  const saveDataToStorage = () => {
    try {
      // Only save if the app is not locked to prevent saving empty initial state
      if (isLocked) return;
      
      const appState = { transactions, budgets, customBudgets, categories, budgetTemplates, budgetRelationships, billReminders, transferLog, recurringProcessingMode, savingsGoal, dailySpendingGoal, analyticsTimeframe };
      const jsonString = JSON.stringify(appState);
      const encryptedData = appPassword ? btoa(jsonString) : jsonString; // Simple Base64 "encryption"
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
  }, [transactions, budgets, customBudgets, categories, budgetTemplates, budgetRelationships, billReminders, transferLog, recurringProcessingMode, savingsGoal, dailySpendingGoal, analyticsTimeframe]);

  // Automatically process recurring transactions if in automatic mode and app is unlocked
  useEffect(() => {
    if (!isLocked && recurringProcessingMode === 'automatic') {
      processRecurringTransactions(true);
    }
  }, [isLocked, recurringProcessingMode]);

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
  
  const handleUnlock = () => {
    if (passwordInput === appPassword) {
      const savedData = localStorage.getItem('budgetWiseData_v2');
      if (savedData) {
        try {
          // Decrypt data using Base64 decoding (atob)
          const decryptedJson = atob(savedData);
          const appState = JSON.parse(decryptedJson);

          // Set all the states from the loaded data
          setTransactions(appState.transactions || []);
          setBudgets(appState.budgets || {});
          setCustomBudgets(appState.customBudgets || []);
          setCategories(appState.categories || ['Food', 'Transport', 'Entertainment', 'Shopping', 'Bills', 'Health']);
          setBudgetTemplates(appState.budgetTemplates || []);
          setBudgetRelationships(appState.budgetRelationships || []);
          setBillReminders(appState.billReminders || []);
          setRecurringProcessingMode(appState.recurringProcessingMode || 'automatic');
          setTransferLog(appState.transferLog || []);
          setDailySpendingGoal(appState.dailySpendingGoal || 500);
          setAnalyticsTimeframe(appState.analyticsTimeframe || '30');
          setSavingsGoal(appState.savingsGoal || 15000);
          
          // Successfully unlocked and loaded
          setIsLocked(false);
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
        setUnlockError('');
        setPasswordInput('');
        initializeSampleData();
      }
    } else {
      setUnlockError('Incorrect password. Please try again.');
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

  // --- Back Button Handling for Mobile ---
  useEffect(() => {
    const handleBackButton = (_event: PopStateEvent) => {
      // This event fires when the user navigates back (e.g., via mobile back button).
      // We intercept it to implement custom back-navigation logic.

      // Priority 1: Close any open modal
      if (showExportModal || showTransferModal || confirmationState.isOpen) {
        setShowExportModal(false);
        setShowTransferModal(false);
        closeConfirmation();
        // "Cancel" the back navigation by pushing the current state back onto the history stack.
        window.history.pushState(null, '', window.location.href);
        return;
      }

      // Priority 2: Cancel any editing mode
      if (editingTransaction || editingCustomBudget) {
        handleCancelTransactionEdit();
        handleCancelEdit();
        window.history.pushState(null, '', window.location.href);
        return;
      }

      // Priority 3: Navigate from other tabs to the main 'add' tab
      if (activeTab !== 'add') {
        setActiveTab('add');
        window.history.pushState(null, '', window.location.href);
        return;
      }

      // If on the 'add' tab with no modals or edits active, allow the app to close by going back.
    };

    window.addEventListener('popstate', handleBackButton);
    return () => window.removeEventListener('popstate', handleBackButton);
  }, [activeTab, showExportModal, showTransferModal, confirmationState.isOpen, editingTransaction, editingCustomBudget]);
  
  const initializeSampleData = () => {
    // Sample transactions with both budget types
    const sampleTransactions: Transaction[] = [
      {
        id: 1,
        category: 'Food',
        amount: -150,
        description: 'Groceries',
        date: new Date().toISOString().split('T')[0],
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
        date: new Date().toISOString().split('T')[0],
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
        amount: -1200,
        description: 'Hotel advance booking',
        date: new Date().toISOString().split('T')[0],
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

  const addTransaction = () => {
    if (!formData.amount) return;
    
    // Validate based on budget type
    if (formData.budgetType === 'monthly' && !formData.category) return;
    if (formData.budgetType === 'custom' && (!formData.customBudgetId || !formData.customCategory)) return;

    // Prevent adding a transaction to a locked or paused budget
    if (formData.budgetType === 'custom' && formData.customBudgetId) {
      const budget = customBudgets.find(b => b.id === formData.customBudgetId);
      if (budget && (budget.status === 'locked' || budget.status === 'paused')) {
        alert(`Cannot add new transactions to a '${budget.status}' budget. Please set it to 'active' first.`);
        return; // Stop the addition
      }
    }

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
  const updateTransaction = () => {
    if (!formData.amount || !editingTransaction) return;
    // Validate based on budget type
    if (formData.budgetType === 'monthly' && !formData.category) return;
    if (formData.budgetType === 'custom' && (!formData.customBudgetId || !formData.customCategory)) return;

    // New check: Prevent moving a transaction TO a locked or paused budget
    if (formData.budgetType === 'custom' && formData.customBudgetId) {
      const targetBudget = customBudgets.find(b => b.id === formData.customBudgetId);
      if (targetBudget && (targetBudget.status === 'locked' || targetBudget.status === 'paused')) {
        alert(`Cannot assign transaction to a '${targetBudget.status}' budget. Please set it to 'active' first.`);
        return;
      }
    }

    // Safeguard: Check the status of the original budget before updating
    if (editingTransaction.budgetType === 'custom' && editingTransaction.customBudgetId) {
      const budget = customBudgets.find(b => b.id === editingTransaction.customBudgetId);
      if (budget && (budget.status === 'paused' || budget.status === 'locked')) {
        alert(`Cannot update transactions from a '${budget.status}' budget.`);
        handleCancelTransactionEdit(); // Clear the form and exit edit mode
        return;
      }
    }

    const newAmount = parseFloat(formData.amount) * (formData.type === 'expense' ? -1 : 1);

    const updatedTransactions = transactions.map(t => 
      t.id === editingTransaction.id 
        ? { 
            ...t, 
            ...formData, 
            category: formData.budgetType === 'custom' ? '' : formData.category,
            amount: newAmount,
            tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : [], // This was missing
          }
        : t
    );

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
    setTransactions(updatedTransactions);
    setEditingTransaction(null);
    recalculateCustomBudgetSpending(updatedTransactions, customBudgets); 
  };

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

  const addCategory = () => {
    if (newCategory && !categories.includes(newCategory)) {
      const newCategories = [...categories, newCategory];
      setCategories(newCategories);
      setFormData({ ...formData, category: newCategory });
      setNewCategory('');
      setShowCategoryInput(false);
    }
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

  const handleCancelEdit = () => {
    setEditingCustomBudget(null);
    setCustomBudgetForm({
      name: '', amount: '', description: '', deadline: '',
      priority: 'medium', categories: [], categoryBudgets: {}
    });
  };

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

    const handleCancelBillEdit = () => {
    setEditingBillReminder(null);
    setBillForm({ name: '', amount: '', dueDate: '' });
  };

  const editBillReminder = (reminder: BillReminder) => {
    setEditingBillReminder(reminder);
    setBillForm({
      name: reminder.name,
      amount: reminder.amount.toString(),
      dueDate: reminder.dueDate,
    });
  };

  const addOrUpdateBillReminder = async () => {
    if (!billForm.name || !billForm.amount || !billForm.dueDate) return;

    if (editingBillReminder) {
      // --- Update Logic ---
      const updatedReminder = {
        ...editingBillReminder,
        name: billForm.name,
        amount: parseFloat(billForm.amount),
        dueDate: billForm.dueDate,
      };
      setBillReminders(billReminders.map(br => br.id === editingBillReminder.id ? updatedReminder : br));

      if (Capacitor.isNativePlatform()) {
        try {
          await LocalNotifications.cancel({ notifications: [{ id: editingBillReminder.id }] });
          const [year, month, day] = updatedReminder.dueDate.split('-').map(Number);
          const scheduleDate = new Date(year, month - 1, day, 9, 0, 0);
          if (scheduleDate > new Date()) {
            await LocalNotifications.schedule({
              notifications: [{
                title: `Bill Reminder: ${updatedReminder.name}`,
                body: `Your bill of ₹${updatedReminder.amount.toFixed(2)} is due today!`,
                id: updatedReminder.id,
                schedule: { on: { year, month, day, hour: 9, minute: 0 }, repeats: false },
                sound: undefined, attachments: undefined, actionTypeId: "", extra: null
              }]
            });
            alert('Reminder and notification updated successfully!');
          } else {
            alert('Reminder updated, but the due date is in the past. No new notification was scheduled.');
          }
        } catch (e) {
          console.error("Error updating notification", e);
          alert('Reminder updated, but failed to update the notification.');
        }
      } else {
        alert('Bill reminder updated successfully!');
      }
      handleCancelBillEdit();
    } else {
      // --- Add Logic ---
      const newReminder: BillReminder = { id: Date.now(), name: billForm.name, amount: parseFloat(billForm.amount), dueDate: billForm.dueDate };
      setBillReminders([...billReminders, newReminder]);

      if (Capacitor.isNativePlatform()) {
        try {
          const [year, month, day] = newReminder.dueDate.split('-').map(Number);
          const scheduleDate = new Date(year, month - 1, day, 9, 0, 0);

          if (scheduleDate > new Date()) {
            await LocalNotifications.schedule({ notifications: [{ title: `Bill Reminder: ${newReminder.name}`, body: `Your bill of ₹${newReminder.amount.toFixed(2)} is due today!`, id: newReminder.id, schedule: { on: { year, month, day, hour: 9, minute: 0 }, repeats: false }, sound: undefined, attachments: undefined, actionTypeId: "", extra: null }] });
            alert('Bill reminder and notification added successfully!');
          } else {
            alert('Bill reminder added, but the due date is in the past. No notification was scheduled.');
          }
        } catch (e) { console.error("Error scheduling notification", e); alert('Bill reminder added, but failed to schedule the notification.'); }
      } else {
        alert('Bill reminder added successfully! (Notifications only work on mobile devices)');
      }
      setBillForm({ name: '', amount: '', dueDate: '' });
    }
  };

  const deleteBillReminder = (id: number) => {
    showConfirmation(
      'Confirm Deletion',
      'Are you sure you want to delete this reminder?',
      async () => {
        setBillReminders(billReminders.filter(br => br.id !== id));
        // --- Cancel the corresponding notification ---
        if (Capacitor.isNativePlatform()) {
          try {
            await LocalNotifications.cancel({ notifications: [{ id }] });
          } catch (e) {
            console.error("Error cancelling notification", e);
          }
        }
      }
    );
  };
  

  const addCustomCategory = () => {
    if (newCustomCategory && selectedCustomBudgetForCategory) {
      // Find the budget and add the new category to it
      const updatedCustomBudgets = customBudgets.map(budget => 
        budget.id === selectedCustomBudgetForCategory
          ? { ...budget, 
              categories: [...budget.categories, newCustomCategory], 
              updatedAt: new Date().toISOString() 
            }
          : budget
      );
      setCustomBudgets(updatedCustomBudgets);

      // Also update the form to select the new category
      setFormData({ ...formData, customCategory: newCustomCategory });

      setNewCustomCategory('');
      setShowCustomCategoryInput(false);
      setSelectedCustomBudgetForCategory(null);
    }
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

  const exportDataAdvanced = () => {
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
      const headers = 'Date,BudgetType,Category,CustomBudget,CustomCategory,Description,Amount,Type,Tags,TransactionID\n';
      const rows = filteredTransactions
        .map(t => {
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
          return rowData.map(escapeCsvField).join(',');
        }).join('\n');
      
      content = '\uFEFF' + headers + rows;
      filename = `budget_export_${exportStartDate}_to_${exportEndDate}_${exportType}.csv`;
      type = 'text/csv;charset=utf-8;';
    }

    if (Capacitor.isNativePlatform()) {
      Filesystem.writeFile({
        path: filename,
        data: content,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      }).then(() => {
        alert(`Export saved to Documents: ${filename}`);
      }).catch((e: any) => {
        alert(`Error saving export: ${(e as Error).message}`);
      });
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
    setFormData({ ...formData, description });

    // Only suggest for monthly budgets if no category is selected
    if (formData.budgetType !== 'monthly' || formData.category) {
      setCategorySuggestion(null);
      return;
    }

    if (description.length < 3) {
      setCategorySuggestion(null);
      return;
    }

    const lowerDesc = description.toLowerCase();
    for (const category in CATEGORY_KEYWORDS) {
      for (const keyword of CATEGORY_KEYWORDS[category]) {
        if (lowerDesc.includes(keyword)) {
          setCategorySuggestion(category);
          return;
        }
      }
    }
    setCategorySuggestion(null);
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

  const getCustomBudgetName = useCallback((customBudgetId: number | null) => {
    if (customBudgetId === null) return 'N/A';
    const budget = customBudgets.find(b => b.id === customBudgetId);
    return budget ? budget.name : 'Unknown Budget';
  }, [customBudgets]);

  const sortedAndFilteredHistory = useMemo(() => {
    const transactionItems = transactions.map(t => ({ ...t, itemType: 'transaction' as const, sortDate: new Date(t.timestamp) }));
    const transferItems = transferLog.map(t => ({ ...t, itemType: 'transfer' as const, sortDate: new Date(t.date) }));

 let combinedItems: (Transaction & { itemType: 'transaction', sortDate: Date } | TransferEvent & { itemType: 'transfer', sortDate: Date })[] = [...transactionItems, ...transferItems]
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
        }else {
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
          // Fall through to default date sort
          break;
      }
      // Default/fallback sort by date descending
      return b.sortDate.getTime() - a.sortDate.getTime();
    });

    return combinedItems;
  }, [transactions, transferLog, searchTerm, filterCategory, filterTag, sortBy, currentMonth, currentYear, getCustomBudgetName]);

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
      setTransactions([...updatedOriginals, ...newTransactions]);
      if (!isSilent) alert(`${processedCount} recurring transaction(s) have been created.`);
    } else if (!isSilent) {
      alert("No new recurring transactions are due.");
    }
  };

  const escapeCsvField = (field: any): string => {
    if (field === null || field === undefined) {
      return '';
    }
    const str = String(field);
    // If the string contains a comma, a double quote, or a newline, it needs to be quoted.
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      // Escape double quotes by doubling them
      const escapedStr = str.replace(/"/g, '""');
      return `"${escapedStr}"`;
    }
    return str;
  };

  const quickCSVExport = () => {
    try {
      const filename = `BudgetWise_Quick_Export_${new Date().toISOString().split('T')[0]}.csv`;
      const headers = 'Date,BudgetType,Category,CustomBudget,CustomCategory,Description,Amount,Type,Tags,TransactionID\n';
      const rows = transactions
        .map(t => {
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
          return rowData.map(escapeCsvField).join(',');
        }).join('\n');
      
      const content = '\uFEFF' + headers + rows;

      if (Capacitor.isNativePlatform()) {
        Filesystem.writeFile({
          path: filename,
          data: content,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
        }).then(() => {
          alert(`CSV saved to Documents: ${filename}`);
        }).catch((e: any) => {
          alert(`Error saving CSV: ${(e as Error).message}`);
        });
      } else {
        const type = 'text/csv;charset=utf-8;';
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
    } catch (error) {
      console.error('Quick CSV Export failed:', error);
      alert('Quick CSV Export failed. Please try again.');
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


  const renderRemindersTab = () => {
    return (
      <div className="p-4 space-y-6">
        {/* Add/Edit Reminder Form */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            {editingBillReminder ? 'Edit Bill Reminder' : 'Add Bill Reminder'}
          </h2>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={billForm.name}
                onChange={e => setBillForm({ ...billForm, name: e.target.value })}
                placeholder="Bill Name"
                className="sm:col-span-2 p-3 border border-gray-300 rounded-xl"
              />
              <input
                type="number"
                value={billForm.amount}
                onChange={e => setBillForm({ ...billForm, amount: e.target.value })}
                placeholder="Amount"
                className="p-3 border border-gray-300 rounded-xl"
              />
              <input
                type="date"
                value={billForm.dueDate}
                onChange={e => setBillForm({ ...billForm, dueDate: e.target.value })}
                className="p-3 border border-gray-300 rounded-xl"
              />
            </div>
            <button
              onClick={addOrUpdateBillReminder}
              className="w-full p-3 bg-yellow-500 text-white rounded-xl font-semibold hover:bg-yellow-600 flex items-center justify-center"
            >
              <Bell size={18} className="mr-2" />
              {editingBillReminder ? 'Update Reminder' : 'Add Reminder'}
            </button>
            {editingBillReminder && (
              <button
                onClick={handleCancelBillEdit}
                className="w-full p-3 bg-gray-400 text-white rounded-xl hover:bg-gray-500"
              >
                Cancel Edit
              </button>
            )}
          </div>
        </div>

        {/* List of Reminders */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Upcoming Bills</h2>
          <div className="space-y-2">
            {billReminders.length === 0 && (
              <p className="text-gray-500 text-center py-4">No reminders set.</p>
            )}
            {billReminders
              .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
              .map(reminder => (
              <div key={reminder.id} className="flex justify-between items-center gap-4 bg-gray-50 p-3 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">{reminder.name}</p>
                  <p className="text-sm text-gray-500">
                    ₹{reminder.amount.toFixed(2)} (Due: {reminder.dueDate})
                  </p>
                </div>
                <div className="flex-shrink-0 flex space-x-1">
                  <button
                    onClick={() => editBillReminder(reminder)}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
                    title="Edit Reminder"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => deleteBillReminder(reminder.id)}
                    className="p-2 text-red-500 hover:bg-red-100 rounded-lg"
                    title="Delete Reminder"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Placeholder for the settings tab rendering.
  const renderSettingsTab = () => {
    return (
      <div className="p-4 space-y-6">
        {/* Security Section */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Security</h2>
          {appPassword ? (
            <div>
              <p className="text-gray-600 mb-2">App password is set.</p>
              <button
                onClick={() => showConfirmation(
                  'Confirm Password Removal',
                  'Are you sure you want to remove the password?',
                  () => {
                    // Atomically remove password and un-encrypt data, preserving all state
                    const appState = { transactions, budgets, customBudgets, categories, budgetTemplates, budgetRelationships, billReminders, transferLog, recurringProcessingMode };
                    const jsonString = JSON.stringify(appState);

                    localStorage.removeItem('appPassword_v2');
                    localStorage.setItem('budgetWiseData_v2', jsonString);

                    setAppPassword(null);
                    alert("Password removed.");
                  }
                )}
                className="w-full p-3 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 flex items-center justify-center"
              >
                <Unlock size={18} className="mr-2" />
                Remove Password
              </button>
            </div>
          ) : (
            <div>
              <p className="text-gray-600 mb-2">Set a password to lock your app.</p>
              <div className="flex space-x-2">
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter 4-digit PIN"
                  className="flex-1 p-3 border border-gray-300 rounded-xl"
                />
                <button
                  onClick={() => {
                    if (!/^\d{4}$/.test(passwordInput)) {
                      alert("Please enter a valid 4-digit PIN.");
                      return;
                    }
                    // Atomically set password and encrypt data
                    const appState = { transactions, budgets, customBudgets, categories, budgetTemplates, budgetRelationships, billReminders, transferLog, recurringProcessingMode };
                    const jsonString = JSON.stringify(appState);
                    const encryptedData = btoa(jsonString);

                    localStorage.setItem('appPassword_v2', passwordInput);
                    localStorage.setItem('budgetWiseData_v2', encryptedData);

                    setAppPassword(passwordInput);
                    setPasswordInput('');
                    alert('Password set successfully. The app will be locked on your next visit.');
                  }}
                  className="px-4 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700"
                >
                  Set
                </button>
              </div>
            </div>
          )}
        </div>

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
          setTransactions={setTransactions} setBudgets={setBudgets} setCustomBudgets={setCustomBudgets}
          setCategories={setCategories} setBudgetTemplates={setBudgetTemplates} setBudgetRelationships={setBudgetRelationships}
          setBillReminders={setBillReminders} setTransferLog={setTransferLog} setRecurringProcessingMode={setRecurringProcessingMode}
          showConfirmation={showConfirmation}
          getCustomBudgetName={getCustomBudgetName}
          dailySpendingGoal={dailySpendingGoal}
          analyticsTimeframe={analyticsTimeframe}
          savingsGoal={savingsGoal}
        />

        {/* Recurring Transactions */}
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

      </div>
    );
  };

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
              <p className="text-red-500 text-sm">{unlockError}</p>
            )}
            <button
              onClick={handleUnlock}
              className="w-full p-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700"
            >
              Unlock
            </button>
          </div>
        </div>
      </div>
    ) : (
    <div className="max-w-md mx-auto bg-gradient-to-br from-purple-50 to-blue-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 pb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">BudgetWise</h1>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowExportModal(true)}
              className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
              title="Advanced Export"
            >
              <Download size={20} />
            </button>
            <button
              onClick={quickCSVExport}
              className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
              title="Quick CSV Export (All Transactions)"
            >
              <FileSpreadsheet size={20} />
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
              title="Settings"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
        
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="bg-white/20 rounded-xl p-3">
            <p className="text-sm opacity-90">Monthly Balance</p>
            <p className="text-xl font-bold">₹{stats.balance.toFixed(0)}</p>
          </div>
          <div className="bg-white/20 rounded-xl p-3">
            <p className="text-sm opacity-90">Monthly Spent</p>
            <p className="text-xl font-bold">₹{stats.totalExpenses.toFixed(0)}</p>
          </div>
        </div>

        {stats.customBudgetSpent > 0 && (
          <div className="mt-3 bg-white/20 rounded-xl p-3">
            <p className="text-sm opacity-90">Custom Budgets Spent</p>
            <p className="text-xl font-bold">₹{stats.customBudgetSpent.toFixed(0)}</p>
          </div>
        )}

        <div className="mt-4 flex items-center justify-center space-x-4">
          <button
            onClick={() => {
              const newMonth = currentMonth === 0 ? 11 : currentMonth - 1;
              const newYear = currentMonth === 0 ? currentYear - 1 : currentYear;
              setCurrentMonth(newMonth);
              setCurrentYear(newYear);
            }}
            className="p-2 bg-white/20 rounded-lg"
          >
            ←
          </button>
          <span className="font-semibold">
            {new Date(currentYear, currentMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button
            onClick={() => {
              const newMonth = currentMonth === 11 ? 0 : currentMonth + 1;
              const newYear = currentMonth === 11 ? currentYear + 1 : currentYear;
              setCurrentMonth(newMonth);
              setCurrentYear(newYear);
            }}
            className="p-2 bg-white/20 rounded-lg"
          >
            →
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 pb-20">
        {/* Render active tab content */}
        {/* Add Transaction Tab */}
        {activeTab === 'add' && (
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
                          <button
                            onClick={addCategory}
                            className="px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700"
                          >
                            Add
                          </button>
                          <button
                            onClick={() => setShowCategoryInput(false)}
                            className="px-4 py-3 bg-gray-400 text-white rounded-xl hover:bg-gray-500"
                          >
                            Cancel
                          </button>
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
                        onChange={(e) => setFormData({ 
                          ...formData,
                          customBudgetId: e.target.value ? parseInt(e.target.value) : null,
                          customCategory: ''
                        })}
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="">Select Custom Budget</option>
                        {customBudgets.filter(budget => budget.status === 'active').map(budget => (
                          <option key={budget.id} value={budget.id}>
                            {budget.name} (₹{budget.remainingAmount.toFixed(0)} remaining)
                          </option>
                        ))}
                      </select>
                      {customBudgets.filter(budget => budget.status === 'active').length === 0 && (
                        <p className="text-sm text-gray-500 mt-2">
                          No active custom budgets. Create one in the Budget tab first.
                        </p>
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
                            {getCustomBudgetCategories(formData.customBudgetId).map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                            <option value="add_new_custom">+ Add New Category</option>
                          </select>

                          {showCustomCategoryInput && selectedCustomBudgetForCategory === formData.customBudgetId && (
                            <div className="flex space-x-2">
                              <input
                                type="text"
                                value={newCustomCategory}
                                onChange={(e) => setNewCustomCategory(e.target.value)}
                                placeholder="Enter new category"
                                className="flex-1 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                              />
                              <button
                                onClick={addCustomCategory}
                                className="px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700"
                              >
                                Add
                              </button>
                              <button
                                onClick={() => {
                                  setShowCustomCategoryInput(false);
                                  setSelectedCustomBudgetForCategory(null);
                                  setNewCustomCategory('');
                                }}
                                className="px-4 py-3 bg-gray-400 text-white rounded-xl hover:bg-gray-500"
                              >
                                Cancel
                              </button>
                            </div>
                          )}

                          {formData.customBudgetId && getCustomBudgetCategories(formData.customBudgetId).length === 0 && (
                            <p className="text-sm text-gray-500">
                              No categories defined for this budget. Add one above.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => handleDescriptionChange(e.target.value)}
                    placeholder="Add a note..."
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  {categorySuggestion && formData.budgetType === 'monthly' && (
                    <div className="absolute right-2 top-9 flex items-center">
                      <span className="text-xs text-gray-500 mr-2">Suggested:</span>
                      <button
                        onClick={() => {
                          setFormData({ ...formData, category: categorySuggestion });
                          setCategorySuggestion(null);
                        }}
                        className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-md hover:bg-purple-200"
                      >
                        {categorySuggestion}
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="e.g., travel, business, 2024"
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
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
                    <label className="font-medium text-gray-700">Recurring Transaction</label>
                    <button
                      onClick={() => setFormData({ ...formData, isRecurring: !formData.isRecurring })}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        formData.isRecurring ? 'bg-purple-600' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform ${
                        formData.isRecurring ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                  {formData.isRecurring && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
                      <select
                        value={formData.recurringFrequency || ''}
                        onChange={(e) => setFormData({ ...formData, recurringFrequency: e.target.value as any })}
                        className="w-full p-3 border border-gray-300 rounded-xl"
                      >
                        <option value="">Select Frequency</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                  )}
                </div>

                <button
                  onClick={editingTransaction ? updateTransaction : addTransaction}
                  className="w-full p-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-all"
                >
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
        )}

        {/* Transaction History Tab */}
        {activeTab === 'history' && (
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
        )}

        {/* Budget Management Tab */}
        {activeTab === 'budget' && (
          <div className="p-4 space-y-6">
            {/* Monthly Budget Section */}
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Monthly Budget</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={budgetForm.category}
                    onChange={(e) => setBudgetForm({ ...budgetForm, category: e.target.value })}
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

                    return (
                      <div key={budget.id} className={`border border-gray-200 rounded-xl p-4 ${isLocked ? 'bg-gray-100 opacity-80' : ''}`}>
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
                          <span className={`${
                            budget.spentAmount >= budget.totalAmount ? 'text-blue-600' : 'text-green-600'
                          }`}>
                            {budget.spentAmount >= budget.totalAmount ? 'completed' : 'active'}
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
                />
              )}
        {/* Reminders Tab */}
        {activeTab === 'reminders' && renderRemindersTab()}


        {/* Settings Tab */}
        {activeTab === 'settings' && renderSettingsTab()}
      </div>

      <ConfirmationModal
        isOpen={confirmationState.isOpen}
        onClose={closeConfirmation}
        onConfirm={confirmationState.onConfirm}
        title={confirmationState.title}
        message={confirmationState.message}
      />

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-200 px-2 py-2">
        <div className="flex justify-around">
          <button
            onClick={() => setActiveTab('add')}
            className={`flex flex-col items-center py-2 px-3 rounded-xl transition-colors ${
              activeTab === 'add' ? 'bg-purple-100 text-purple-600' : 'text-gray-600'
            }`}
          >
            <Plus size={20} />
            <span className="text-xs mt-1">Add</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center py-2 px-3 rounded-xl transition-colors ${
              activeTab === 'history' ? 'bg-purple-100 text-purple-600' : 'text-gray-600'
            }`}
          >
            <List size={20} />
            <span className="text-xs mt-1">History</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex flex-col items-center py-2 px-3 rounded-xl transition-colors ${
              activeTab === 'analytics' ? 'bg-purple-100 text-purple-600' : 'text-gray-600'
            }`}
          >
            <BarChart3 size={20} />
            <span className="text-xs mt-1">Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('budget')}
            className={`flex flex-col items-center py-2 px-4 rounded-xl transition-colors ${
              activeTab === 'budget' ? 'bg-purple-100 text-purple-600' : 'text-gray-600'
            }`}
          >
            <PieChart size={24} />
            <span className="text-xs mt-1">Budget</span>
          </button>

          <button
            onClick={() => setActiveTab('reminders')}
            className={`flex flex-col items-center py-2 px-4 rounded-xl transition-colors ${
              activeTab === 'reminders' ? 'bg-purple-100 text-purple-600' : 'text-gray-600'
            }`}
          >
            <Bell size={24} />
            <span className="text-xs mt-1">Reminders</span>
          </button>
        </div>
      </div>
    </div>
    )
  );
};

export default App;