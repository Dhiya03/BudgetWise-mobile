// --- Type Definitions for State Management ---

// Describes a single transaction record
export interface Transaction {
  id: number;
  category: string;
  amount: number;
  description: string;
  date: string; // YYYY-MM-DD format
  type: 'expense' | 'income';
  budgetType: 'monthly' | 'custom' | 'transfer';
  customBudgetId: number | null;
  customCategory: string;
  tags: string[];
  isRecurring: boolean;
  recurringFrequency: 'daily' | 'weekly' | 'monthly' | null;
  lastProcessedDate?: string; // New field to track the last time a recurring transaction was generated
  timestamp: string; // ISO string
}

// Describes the structure for monthly budgets
export interface MonthlyBudgets {
  [category: string]: number;
}

// Describes a custom, purpose-driven budget
export interface CustomBudget {
  id: number;
  name: string;
  description: string;
  totalAmount: number;
  spentAmount: number;
  remainingAmount: number;
  deadline: string | null;
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'completed' | 'archived' | 'paused' | 'locked';
  categories: string[];
  categoryBudgets: { [category: string]: number };
  createdAt: string;
  updatedAt: string;
}

// Describes a budget template
export interface BudgetTemplate {
  id: number;
  name: string;
  description: string;
  amount: number;
  priority: 'low' | 'medium' | 'high';
  categories: string[];
  categoryBudgets: { [key: string]: number };
}

// Describes a budget relationship for automation
export interface BudgetRelationship {
  id: number;
  sourceCategory: string; // e.g., 'Food'
  destinationBudgetId: number; // custom budget id
  condition: 'end_of_month_surplus';
  createdAt: string;
}

// Describes a bill reminder
export interface BillReminder {
  id: number;
  name: string;
  amount: number;
  dueDate: string;
}

// Describes a spending alert
export interface SpendingAlert {
  id: number;
  category: string; // Can be a monthly category or a custom budget category string
  threshold: number;
  condition: 'above'; // Currently only supports 'spending goes above'
  isSilenced?: boolean; // To mute/unmute the alert
}

// Describes the data structure for the transaction form
export interface TransactionFormData {
  category: string;
  amount: string;
  description: string;
  date: string;
  type: 'expense' | 'income';
  budgetType: 'monthly' | 'custom' | 'transfer';
  customBudgetId: number | null;
  customCategory: string;
  tags: string; // Comma-separated string
  isRecurring: boolean;
  recurringFrequency: 'daily' | 'weekly' | 'monthly' | null;
}

// Describes the data structure for the custom budget form
export interface CustomBudgetFormData {
  name: string;
  amount: string;
  description: string;
  deadline: string;
  priority: 'low' | 'medium' | 'high';
  categories: string[];
  categoryBudgets: { [key: string]: string };
}

// Describes the data for the relationship form
export interface RelationshipFormData {
  sourceCategory: string;
  destinationBudgetId: string;
  condition: 'end_of_month_surplus';
}

// Describes a fund transfer event for the audit log
export interface TransferEvent {
  id: number;
  date: string; // ISO string
  amount: number;
  fromBudgetId: number;
  fromCategory: string;
  toBudgetId: number;
  toCategoryAllocations: { [key: string]: number };
}

// Describes the languages supported for financial tips
export type SupportedLanguage = 'en' | 'hi' | 'ta' | 'te';

// Defines an array of supported languages for easier validation.
export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['en', 'hi', 'ta', 'te'];

// Describes a financial tip for the notification system
export interface FinancialTip {
  id: string;
  category: 'funny' | 'fact' | 'advice' | 'myth-buster';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  emoji: string;
  tags: string[];
  translations: {
    en: { tip: string; shareText: string };
    hi: { tip: string; shareText: string };
    te: { tip: string; shareText: string };
    ta: { tip: string; shareText: string };
  };
  contextualTriggers?: string[];
}