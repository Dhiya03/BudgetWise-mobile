// // A simple subscription manager. In a real app, this would
// // be backed by a service like RevenueCat or a custom backend.

// export type Tier = 'free' | 'plus' | 'premium';

// // For this example, we'll store the tier in localStorage.
// // 'plus' tier would also need an expiry date in a real app.
// let currentTier: Tier = (localStorage.getItem('budgetwise_tier') as Tier) || 'free';

// export const getTier = (): Tier => {
//   // In a real app, you might check an expiry date for 'plus' here.
//   return currentTier;
// };

// export const setTier = (tier: Tier) => {
//   currentTier = tier;
//   localStorage.setItem('budgetwise_tier', tier);
//   // This would typically trigger a UI refresh, for this demo we'll reload.
//   window.location.reload();
// };

// export enum Feature {
//   // Core
//   Transactions = 'transactions',
//   MonthlyBudgets = 'monthly_budgets',
//   History = 'history',
//   Security = 'security',
//   QuickCsvExport = 'quick_csv_export',

//   // Plus
//   CustomBudgets = 'custom_budgets',
//   BillReminders = 'bill_reminders',
//   RecurringTransactions = 'recurring_transactions',
//   Tagging = 'tagging',
//   LimitedAnalytics = 'limited_analytics',

//   // Premium
//   FullAnalytics = 'full_analytics',
//   BudgetAutomation = 'budget_automation',
//   FundTransfers = 'fund_transfers',
//   SpendingAlerts = 'spending_alerts',
//   AdvancedReporting = 'advanced_reporting',
//   CloudSync = 'cloud_sync', // Proposed feature
// }

// export enum Limit {
//   MonthlyBudgets = 'monthly_budgets',
//   CustomBudgets = 'custom_budgets',
//   BillReminders = 'bill_reminders',
// }


// const featureAccess: Record<Feature, Tier[]> = {
//   // Free features
//   [Feature.Transactions]: ['free', 'plus', 'premium'],
//   [Feature.MonthlyBudgets]: ['free', 'plus', 'premium'], // with limits
//   [Feature.History]: ['free', 'plus', 'premium'],
//   [Feature.Security]: ['free', 'plus', 'premium'],
//   [Feature.QuickCsvExport]: ['free', 'plus', 'premium'],

//   // Plus features
//   [Feature.CustomBudgets]: ['plus', 'premium'], // with limits
//   [Feature.BillReminders]: ['plus', 'premium'], // with limits
//   [Feature.RecurringTransactions]: ['plus', 'premium'],
//   [Feature.Tagging]: ['plus', 'premium'],
//   [Feature.LimitedAnalytics]: ['plus', 'premium'],

//   // Premium features
//   [Feature.FullAnalytics]: ['premium'],
//   [Feature.BudgetAutomation]: ['premium'],
//   [Feature.FundTransfers]: ['premium'],
//   [Feature.SpendingAlerts]: ['premium'],
//   [Feature.AdvancedReporting]: ['premium'],
//   [Feature.CloudSync]: ['premium'],
// };

// const tierLimits: Record<Tier, Record<Limit, number>> = {
//   free: {
//     [Limit.MonthlyBudgets]: 5,
//     [Limit.CustomBudgets]: 0,
//     [Limit.BillReminders]: 0,
//   },
//   plus: {
//     [Limit.MonthlyBudgets]: Infinity,
//     [Limit.CustomBudgets]: 3,
//     [Limit.BillReminders]: 5,
//   },
//   premium: {
//     [Limit.MonthlyBudgets]: Infinity,
//     [Limit.CustomBudgets]: Infinity,
//     [Limit.BillReminders]: Infinity,
//   },
// };

// export const hasAccessTo = (feature: Feature): boolean => {
//   const tier = getTier();
//   return featureAccess[feature].includes(tier);
// };

// export const isLimitReached = (limit: Limit, currentCount: number): boolean => {
//   const tier = getTier();
//   const limitForTier = tierLimits[tier][limit];
//   return currentCount >= limitForTier;
// };