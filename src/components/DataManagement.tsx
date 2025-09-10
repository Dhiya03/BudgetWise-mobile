import React, { useRef } from 'react';
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
import type { jsPDF as jsPDFType } from 'jspdf';
import { FileJson, FileSpreadsheet, FileText, Star } from 'lucide-react';
import { useAnalytics } from '../hooks/useAnalytics';
import { useLocalization } from './LocalizationContext';
import { Capacitor } from '@capacitor/core';
import { hasAccessTo, Feature } from '../subscriptionManager';
import FileService from '../utils/FileService';

interface DataManagementProps {
  transactions: Transaction[];
  budgets: MonthlyBudgets;
  customBudgets: CustomBudget[];
  categories: string[];
  budgetTemplates: BudgetTemplate[];
  budgetRelationships: BudgetRelationship[];
  billReminders: BillReminder[];
  transferLog: TransferEvent[];
  recurringProcessingMode: 'automatic' | 'manual';
  currentYear: number;
  currentMonth: number;

  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  setBudgets: React.Dispatch<React.SetStateAction<MonthlyBudgets>>;
  setCustomBudgets: React.Dispatch<React.SetStateAction<CustomBudget[]>>;
  setCategories: React.Dispatch<React.SetStateAction<string[]>>;
  setBudgetTemplates: React.Dispatch<React.SetStateAction<BudgetTemplate[]>>;
  setBudgetRelationships: React.Dispatch<React.SetStateAction<BudgetRelationship[]>>;
  setBillReminders: React.Dispatch<React.SetStateAction<BillReminder[]>>;
  setTransferLog: React.Dispatch<React.SetStateAction<TransferEvent[]>>;
  setSpendingAlerts: React.Dispatch<React.SetStateAction<SpendingAlert[]>>;
  setSavingsGoal: React.Dispatch<React.SetStateAction<number>>;
  setDailySpendingGoal: React.Dispatch<React.SetStateAction<number>>;
  setAnalyticsTimeframe: React.Dispatch<React.SetStateAction<string>>;

  setRecurringProcessingMode: React.Dispatch<React.SetStateAction<'automatic' | 'manual'>>;

  showConfirmation: (title: string, message: string, onConfirm: () => void | Promise<void>) => void;
  getCustomBudgetName: (id: number | null) => string;
  savingsGoal: number;
  analyticsTimeframe: string;
  dailySpendingGoal: number;
  spendingAlerts: SpendingAlert[];
  getSpentAmount: (category: string, year: number, month: number) => number;
  getRemainingBudget: (category: string, year: number, month: number) => number;
  t: (key: string, fallback?: string) => string;
}

const DataManagement: React.FC<DataManagementProps> = (props) => {
  const {
    transactions, budgets, customBudgets, categories, budgetTemplates,
    budgetRelationships, billReminders, transferLog, recurringProcessingMode,
    currentYear, currentMonth,
    setTransactions, setBudgets, setCustomBudgets, setCategories, setSpendingAlerts,
    setBudgetTemplates, setBudgetRelationships, setBillReminders,
    setSavingsGoal, setDailySpendingGoal, setAnalyticsTimeframe, getSpentAmount, getRemainingBudget,
    setTransferLog, setRecurringProcessingMode, showConfirmation, getCustomBudgetName,
    savingsGoal, dailySpendingGoal, analyticsTimeframe
  } = props;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLocalization(); // Use useLocalization hook
  const {
    healthScore,
    cashFlow,
    categoryInsights,
    personality,
    streak,
    runway,
  } = useAnalytics({ transactions, budgets, getCustomBudgetName, savingsGoal, dailySpendingGoal, analyticsTimeframe });

  const processRestoredData = (jsonString: string) => {
    try {
      const restoredState = JSON.parse(jsonString);

      if (!restoredState.transactions || !restoredState.budgets) {
          throw new Error(t('toast.invalidBackupFormat'));
      }

      setTransactions(restoredState.transactions || []);
      setBudgets(restoredState.budgets || {});
      setCustomBudgets(restoredState.customBudgets || []);
      setCategories(restoredState.categories || ['Food', 'Transport', 'Entertainment', 'Shopping', 'Bills', 'Health']);
      setBudgetTemplates(restoredState.budgetTemplates || []);
      setBudgetRelationships(restoredState.budgetRelationships || []);
      setBillReminders(restoredState.billReminders || []);
      setTransferLog(restoredState.transferLog || []);
      setRecurringProcessingMode(restoredState.recurringProcessingMode || 'automatic');
      setSpendingAlerts(restoredState.spendingAlerts || []);
      setSavingsGoal(restoredState.savingsGoal || 15000);
      setDailySpendingGoal(restoredState.dailySpendingGoal || 500);
      setAnalyticsTimeframe(restoredState.analyticsTimeframe || '30');
      alert(t('toast.restoreSuccess'));
    } catch (error) {
      console.error(t('toast.restoreFailed', 'Failed to restore data:'), error);
      alert(t('toast.restoreError', 'Error restoring data: {message}. Please ensure you are using a valid backup file.').replace('{message}', (error as Error).message));
    }
  };

  const handleFileSelectedFromWeb = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const fileInput = event.target;
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        processRestoredData(text);
      } else {
        alert(t('toast.fileReadError'));
      }
    };
    reader.readAsText(file);

    if (fileInput) {
      fileInput.value = '';
    }
  };

  const backupData = () => {
    showConfirmation(t('settings.backupJson'), t('confirmation.backup.message'), async () => {
      const stateToBackup = {
        transactions, budgets, customBudgets, categories, budgetTemplates,
        budgetRelationships, billReminders, transferLog, recurringProcessingMode,
        spendingAlerts: props.spendingAlerts, savingsGoal, dailySpendingGoal, analyticsTimeframe
      };
      const filename = `budgetwise_backup_${new Date().toISOString().split('T')[0]}.json`;
      const { readablePath } = await FileService.saveJSON(filename, stateToBackup);
      alert(t('toast.backupSaved', 'Backup saved to: {path}').replace('{path}', readablePath));
    });
  };

  const triggerRestore = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const pickedFile = await FileService.pickFile();
        if (!pickedFile) {
          console.log('File picker was cancelled.');
          return;
        }

        const format = FileService.detectFormat(pickedFile.name || '');
        if (format !== 'json') {
          alert(t('toast.invalidFileType', 'Invalid file type. Please select a .json backup file.'));
          return;
        }

        const jsonString = await FileService.readFile(pickedFile.path || '', 'json');
        processRestoredData(jsonString);

      } catch (e) {
        console.log('File picker was cancelled or failed.', e);
        if (e instanceof Error) {
          alert(t('toast.filePickerError').replace('{message}', e.message));
        }
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleRestore = (event: React.MouseEvent<HTMLLabelElement>) => {
    event.preventDefault();
    showConfirmation(
      t('confirmation.restore.title'),
      t('confirmation.restore.message'),
      triggerRestore
    );
  };

  const exportToExcel = async () => {
    // Lazy load the xlsx library
    const { utils, write } = await import('xlsx');
    try {
      const filename = `BudgetWise_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
      const transactionData = [...transactions]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .map(t => {
          return {
            Date: t.date,
            Type: t.type,
            'Budget Type': t.budgetType,
            Category: t.budgetType === 'monthly' ? t.category : `${getCustomBudgetName(t.customBudgetId) || 'N/A'} - ${t.customCategory}`,
            Amount: t.amount,
            Description: t.description,
            Tags: t.tags?.join(', ') || '',
          };
        });
      const transactionSheet = utils.json_to_sheet(transactionData);

      const monthlyBudgetsData = categories.map(cat => ({
        Category: cat,
        Budget: budgets[cat] || 0,
        Spent: getSpentAmount(cat, currentYear, currentMonth),
        Remaining: getRemainingBudget(cat, currentYear, currentMonth),
      }));
      const monthlyBudgetSheet = utils.json_to_sheet(monthlyBudgetsData);

      const customBudgetsData = customBudgets.map(b => ({
        Name: b.name,
        'Total Amount': b.totalAmount,
        'Spent Amount': b.spentAmount,
        'Remaining Amount': b.remainingAmount,
        Status: b.status,
        Deadline: b.deadline || 'N/A',
      }));
      const customBudgetSheet = utils.json_to_sheet(customBudgetsData);

      const transferLogData = transferLog.map(t => ({
        Date: new Date(t.date).toLocaleString(),
        Amount: t.amount,
        'From Budget': getCustomBudgetName(t.fromBudgetId),
        'From Category': t.fromCategory,
        'To Budget': getCustomBudgetName(t.toBudgetId),
        'To Category Allocations': JSON.stringify(t.toCategoryAllocations),
      }));
      const transferLogSheet = utils.json_to_sheet(transferLogData);

      const wb = utils.book_new();
      utils.book_append_sheet(wb, transactionSheet, 'Transactions');
      utils.book_append_sheet(wb, monthlyBudgetSheet, 'Monthly Budgets');
      utils.book_append_sheet(wb, customBudgetSheet, 'Custom Budgets');
      utils.book_append_sheet(wb, transferLogSheet, 'Fund Transfers');

      const excelData = write(wb, { bookType: 'xlsx', type: 'base64' });
      const { readablePath } = await FileService.writeFile(filename, excelData, 'xlsx');
      alert(t('toast.excelSaved', 'Excel report saved to: {path}').replace('{path}', readablePath));
    } catch (error) {
      console.error(t('toast.excelExportFailed', 'Failed to export to Excel'), error);
      alert(t('toast.excelExportError', 'An error occurred while exporting to Excel: {message}').replace('{message}', (error as Error).message));
    }
  };

  const generatePDFReport = async () => {
    // Lazy load jspdf and autotable
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    try {
      const doc = new jsPDF() as jsPDFType & { lastAutoTable: { finalY: number } };
      const filename = `BudgetWise_Report_${new Date().toISOString().split('T')[0]}.pdf`;

      const getScoreDescription = (score: number) => {
        if (score >= 75) return t('analytics.healthStatus.thriving');
        if (score >= 50) return t('analytics.healthStatus.caution');
        return t('analytics.healthStatus.actionNeeded');
      };

      const getHexColor = (tailwindColor: string) => {
        if (tailwindColor.includes('green')) return '#16a34a';
        if (tailwindColor.includes('yellow')) return '#ca8a04';
        if (tailwindColor.includes('red')) return '#dc2626';
        return '#000000';
      };

       const reportTitle = analyticsTimeframe === 'This Month' ? t('analytics.reportForThisMonth', 'Report for This Month') : t('analytics.reportForLastDays', 'Report for the last {days} days').replace('{days}', analyticsTimeframe);

      // Title
      doc.setFontSize(18);
      doc.text('BudgetWise Financial Report', 14, 22);
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`${reportTitle}, ${t('general.generatedOn', 'generated on')}: ${new Date().toLocaleDateString()}`, 14, 29);

      // Health Score
      doc.setFontSize(16);
      doc.text(t('analytics.healthScoreTitle'), 14, 45);
      doc.setFontSize(22);
      doc.setTextColor(getHexColor(healthScore.color));
      doc.text(`${healthScore.score} / 100`, 14, 55);
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text(`${t('general.status')}: ${getScoreDescription(healthScore.score)}`, 14, 62);
      doc.setTextColor(0);

      // Cash Flow Summary Table
      autoTable(doc, {
        startY: 70,
        head: [[t('analytics.cashFlowTitle'), t('general.amount', 'Amount')]],
        body: [
           [t('analytics.income'), `₹${cashFlow.totalIncome.toFixed(2)}`],
          [t('analytics.expenses'), `₹${cashFlow.totalExpenses.toFixed(2)}`],
          [t('analytics.savings'), `₹${cashFlow.savings.toFixed(2)}`],
          [t('analytics.projectedSavings'), `₹${cashFlow.projectedMonthlySavings.toFixed(2)}`],
          [t('analytics.burnRate'), isFinite(cashFlow.burnRateDays) ? `~${cashFlow.burnRateDays.toFixed(0)} ${t('general.days', 'days')}` : t('general.na', 'N/A')],
          [t('analytics.runwayTitle'), isFinite(runway.runwayMonths) ? `${runway.runwayMonths} ${t('general.months', 'months')}` : '∞'],
       ],
        theme: 'striped',
        headStyles: { fillColor: [67, 72, 188] },
      });

      // Personal Habits Table
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [[t('analytics.habitsTitle'), t('general.insight', 'Insight')]],
        body: [
          [t('analytics.personalityTitle'), personality.personality],
          [t('analytics.dailyGoalTitle'), `${streak.streak} ${t('general.days', 'days')} ${t('general.under', 'under')} ₹${dailySpendingGoal}`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [15, 118, 110] }, // Teal color
      });

      // Goal Progress Table
      const goalData = customBudgets
        .filter(b => b.status === 'active')
        .map(b => {
          const percentage = b.totalAmount > 0 ? (b.spentAmount / b.totalAmount) * 100 : 0;
          return [
            b.name,
            `₹${b.spentAmount.toFixed(0)} / ₹${b.totalAmount.toFixed(0)}`,
            `${percentage.toFixed(0)}%`,
          ];
        });

      if (goalData.length > 0) {
        const goalTableStartY = (doc as any).lastAutoTable.finalY + 15;
        doc.setFontSize(16); // Use t() here
        doc.text(t('budget.goalProgress', 'Goal Progress'), 14, goalTableStartY);
        autoTable(doc, {
          startY: goalTableStartY + 2,
          head: [[t('budget.activeGoals', 'Active Goals'), t('general.progress', 'Progress'), t('general.funded', '% Funded')]],
          body: goalData,
          headStyles: { fillColor: [190, 70, 120] }, // Pink/Purple color
        });
      }

        // Top Spending Categories
      const insightsStartY = (doc as any).lastAutoTable.finalY + 15;
      doc.setFontSize(16);
      doc.text(t('analytics.spendingInsights', 'Spending Insights'), 14, insightsStartY);
      autoTable(doc, {
        startY: insightsStartY + 2,
        head: [[t('analytics.categoryBreakdownTitle', 'Top Spending Categories'), t('general.amount', 'Amount (₹)'), t('general.trend', 'Trend (%)')]],
        body: categoryInsights.slice(0, 5).map(insight => [
            insight.category,
            insight.spending.toFixed(2),
            `${insight.trend > 0 ? '+' : ''}${insight.trend.toFixed(0)}%`
        ]),
        headStyles: { fillColor: [22, 163, 74] },
      });

      const transactionData = [...transactions]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 20)
        .map((t) => {
          return [
            t.date, t.description, t.budgetType === 'custom' && t.customBudgetId ? `${getCustomBudgetName(t.customBudgetId)} - ${t.customCategory}` : t.category, t.amount.toFixed(2)
          ];
        });

      const transactionsStartY = (doc as any).lastAutoTable.finalY + 15;
      doc.setFontSize(16);
      doc.text(t('history.recentTransactions', 'Recent Transactions'), 14, transactionsStartY);
      autoTable(doc, {
        startY: transactionsStartY + 2,
        head: [[t('general.date', 'Date'), t('general.description', 'Description'), t('general.category', 'Category'), t('general.amount', 'Amount (₹)')]],
        body: transactionData,
        headStyles: { fillColor: [217, 119, 6] },
      });
      const pdfData = doc.output("datauristring").split(",")[1];
      const { readablePath } = await FileService.writeFile(filename, pdfData, 'pdf');
      alert(t('toast.pdfSaved', 'PDF report saved to: {path}').replace('{path}', readablePath));
    } catch (error) {
      console.error(t('toast.pdfGenerationFailed', 'Failed to generate PDF report'), error);
      alert(t('toast.pdfGenerationError', 'An error occurred while generating the PDF report: {message}').replace('{message}', (error as Error).message));
    }
  };

  const generateHTMLReport = async () => {
    const getScoreDescription = (score: number) => {
      if (score >= 75) return { text: t('analytics.healthStatus.thriving'), color: "#10B981" };
      if (score >= 50) return { text: t('analytics.healthStatus.caution'), color: "#F59E0B" };
      return { text: t('analytics.healthStatus.actionNeeded'), color: "#EF4444" };
    };
    const reportTitle = analyticsTimeframe === 'This Month' ? t('analytics.reportForThisMonth') : t('analytics.reportForLastDays').replace('{days}', analyticsTimeframe);

    const scoreDescription = getScoreDescription(healthScore.score);

    const reportHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>BudgetWise Financial Report</title>
        <meta charset="UTF-8" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 20px; color: #1f2937; background-color: #f9fafb; }
          .container { max-width: 800px; margin: auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { text-align: center; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 20px; }
          .header h1 { color: #4f46e5; }
          .section { margin-bottom: 30px; }
          .section h2 { font-size: 1.25em; color: #374151; border-bottom: 2px solid #6d28d9; padding-bottom: 5px; margin-bottom: 15px; }
          .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
          .card { background: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; }
          .card-title { font-weight: 600; color: #4b5563; margin-bottom: 5px; }
          .card-value { font-size: 1.5em; font-weight: 700; color: #11182c; }
          .card-value.positive { color: #16a34a; }
          .card-value.negative { color: #dc2626; }
          .table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          .table th, .table td { padding: 10px; border: 1px solid #e5e7eb; text-align: left; font-size: 0.9em; }
          .table th { background: #f3f4f6; font-weight: 600; }
          .trend-up { color: #dc2626; }
          .trend-down { color: #16a34a; }
          .health-score { text-align: center; }
          .health-score-value { font-size: 4em; font-weight: 700; color: ${scoreDescription.color}; }
          .health-score-desc { font-size: 1.1em; font-weight: 600; color: ${scoreDescription.color}; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>{t('header.title')} {t('dataManagement.financialReport', 'Financial Report')}</h1>
            <p>${reportTitle}, generated on ${new Date().toLocaleDateString()}</p>
          </div>

          <div class="section">
            <h2>Financial Health Score</h2>
            <div class="health-score">
              <div class="health-score-value">${healthScore.score}</div>
              <div class="health-score-desc">${scoreDescription.text}</div>
            </div>
          </div>

          <div class="section">
            <h2>{t('analytics.cashFlowTitle')} & {t('general.preparedness')}</h2>
            <div class="grid">
              <div class="card">
                <div class="card-title">{t('budget.totalIncome')}</div>
                <div class="card-value positive">₹${cashFlow.totalIncome.toFixed(0)}</div>
              </div>
              <div class="card">
                <div class="card-title">{t('budget.totalBudgeted')}</div>
                <div class="card-value negative">₹${cashFlow.totalExpenses.toFixed(0)}</div>
              </div>
              <div class="card">
                <div class="card-title">{t('analytics.savings')}</div>
                <div class="card-value ${cashFlow.savings >= 0 ? 'positive' : 'negative'}">₹${cashFlow.savings.toFixed(0)}</div>
              </div>
              
              <div class="card">
                <div class="card-title">{t('analytics.runwayTitle')}</div>
                <div class="card-value">${isFinite(runway.runwayMonths) ? `${runway.runwayMonths} ${t('general.months', 'months')}` : '∞'}</div>
              </div>
            </div>
            <div class="chart-container" style="display: flex; align-items: stretch; gap: 0.5rem; height: 10rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; margin-top: 1rem;">
              <div class="chart-bar-container" style="flex: 1; display: flex; flex-direction: column; text-align: center;">
                <div class="bar-wrapper" style="flex: 1; display: flex; align-items: flex-end;">
                  <div class="bar" style="margin: 0 auto; width: 60%; border-radius: 4px 4px 0 0; background-color: #22c55e; height: ${Math.min(100, (cashFlow.totalIncome / (cashFlow.totalIncome || 1)) * 100)}%;"></div>
                </div>
                <p style="font-size: 0.75rem; margin-top: 0.25rem;">{t('analytics.income')}</p>
                <p style="font-size: 0.8rem; font-weight: bold;">₹${cashFlow.totalIncome.toFixed(0)}</p>
              </div>
              <div class="chart-bar-container" style="flex: 1; display: flex; flex-direction: column; text-align: center;">
                <div class="bar-wrapper" style="flex: 1; display: flex; align-items: flex-end;">
                  <div class="bar" style="margin: 0 auto; width: 60%; border-radius: 4px 4px 0 0; background-color: #ef4444; height: ${Math.min(100, (cashFlow.totalExpenses / (cashFlow.totalIncome || 1)) * 100)}%;"></div>
                </div>
                <p style="font-size: 0.75rem; margin-top: 0.25rem;">{t('analytics.expenses')}</p>
                <p style="font-size: 0.8rem; font-weight: bold;">₹${cashFlow.totalExpenses.toFixed(0)}</p>
              </div>
              <div class="chart-bar-container" style="flex: 1; display: flex; flex-direction: column; text-align: center;">
                <div class="bar-wrapper" style="flex: 1; display: flex; align-items: flex-end;">
                  <div class="bar" style="margin: 0 auto; width: 60%; border-radius: 4px 4px 0 0; background-color: #3b82f6; height: ${Math.min(100, (Math.max(0, cashFlow.savings) / (cashFlow.totalIncome || 1)) * 100)}%;"></div>
                </div>
                <p style="font-size: 0.75rem; margin-top: 0.25rem;">{t('analytics.savings')}</p>
                <p style="font-size: 0.8rem; font-weight: bold;">₹${cashFlow.savings.toFixed(0)}</p>
              </div>
            </div>
          </div>

          <div class="section">
            <h2>{t('analytics.habitsTitle')}</h2>
            <div class="grid">
              <div class="card">
                <div class="card-title">{t('analytics.personalityTitle')}</div>
                <div class="card-value">${personality.personality}</div>
                <p style="font-size: 0.8em; color: #6b7280;">${personality.insight}</p>
              </div>
              <div class="card">
                <div class="card-title">{t('analytics.dailyGoalTitle')}</div>
                <div class="card-value">${streak.streak} {t('general.days', 'days')}</div>
                <p style="font-size: 0.8em; color: #6b7280;">{t('analytics.underPerDay').replace('{amount}', dailySpendingGoal.toString())}</p>
              </div>
            </div>
          </div>

          <div class="section">
            <h2>{t('budget.goalProgress')}</h2>
            ${customBudgets.filter(b => b.status === 'active').map(budget => {
              const percentage = budget.totalAmount > 0 ? (budget.spentAmount / budget.totalAmount) * 100 : 0;
              return `
                <div class="card" style="margin-bottom: 15px;">
                  <div class="card-title" style="font-weight: bold;">${budget.name}</div>
                  <p style="font-size: 0.9em; color: #4b5563;">₹${budget.spentAmount.toFixed(0)} / ₹${budget.totalAmount.toFixed(0)}</p>
                  <div style="background: #e5e7eb; border-radius: 8px; height: 20px; margin-top: 5px; position: relative; overflow: hidden;">
                    <div style="width: ${Math.min(percentage, 100)}%; height: 100%; background: linear-gradient(to right, #4ade80, #3b82f6);"></div>
                    <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 0.8em;">
                      ${percentage.toFixed(0)}%
                    </div>
                  </div>
                </div>
              `;
            }).join('') || `<p>${t('budget.noActiveGoals', 'No active goals to display.')}</p>`} 
          </div>

          <div class="section">
            <h2>{t('analytics.categoryBreakdownTitle')}</h2>
            <table class="table">
              <thead>
                <tr>
                  <th>{t('general.category', 'Category')}</th>
                  <th>{t('general.totalSpending')}</th>
                  <th>{t('general.trend')}</th>
                  <th>{t('analytics.largestTx', 'Largest Tx:')}</th>
                </tr>
              </thead>
              <tbody>
                ${categoryInsights.map(insight => `
                  <tr>
                    <td>${insight.category}</td>
                    <td>₹${insight.spending.toFixed(0)}</td>
                    <td class="${insight.trend > 10 ? 'trend-up' : insight.trend < -10 ? 'trend-down' : ''}">
                      ${insight.trend > 0 ? '+' : ''}${insight.trend.toFixed(0)}%
                    </td>
                    <td>
                      ${insight.largestTransaction ? `₹${Math.abs(insight.largestTransaction.amount).toFixed(0)}${insight.largestTransaction.description ? ` - ${insight.largestTransaction.description}` : ''}` : t('general.na', 'N/A')}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </body>
      </html>
    `;

    const filename = `BudgetWise_Report_${new Date().toISOString().split('T')[0]}.html`;
    const { readablePath } = await FileService.writeFile(filename, reportHTML, 'html');
    alert(t('toast.htmlReportSaved').replace('{path}', readablePath));
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg">
      <h2 className="text-xl font-bold text-gray-800 mb-4">{t('settings.dataManagementTitle')}</h2>
      <div className="space-y-3">
        <button
          onClick={backupData}
          className="w-full p-3 bg-blue-100 text-blue-800 rounded-xl font-semibold hover:bg-blue-200 flex items-center justify-center"
        >
          <FileJson size={18} className="mr-2" />
          {t('settings.backupJson')}
        </button>
        <div>
          <label
            onClick={handleRestore}
            className="w-full text-center p-3 bg-blue-100 text-blue-800 rounded-xl font-semibold hover:bg-blue-200 flex items-center justify-center cursor-pointer"
          >
            <FileJson size={18} className="mr-2" />
            {t('settings.restoreJson')}
            <input type="file" accept=".json" ref={fileInputRef} onChange={handleFileSelectedFromWeb} className="hidden" />
          </label>
        </div>
        <button
          onClick={exportToExcel}
           disabled={!hasAccessTo(Feature.AdvancedReporting)}
          className="w-full p-3 bg-green-100 text-green-800 rounded-xl font-semibold hover:bg-green-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed relative"
      >
          <FileSpreadsheet size={18} className="mr-2" />
          {t('settings.exportExcel')}
          {!hasAccessTo(Feature.AdvancedReporting) && (
            <span className="absolute top-1 right-2 text-xs font-bold bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded-full flex items-center"><Star size={10} className="mr-1"/>Premium</span>
          )}
        </button>
        <button
          onClick={generatePDFReport}
          disabled={!hasAccessTo(Feature.AdvancedReporting)}
          className="w-full p-3 bg-red-100 text-red-800 rounded-xl font-semibold hover:bg-red-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed relative"
        >
          <FileText size={18} className="mr-2" />
          {t('settings.generatePdf')}
          {!hasAccessTo(Feature.AdvancedReporting) && (
            <span className="absolute top-1 right-2 text-xs font-bold bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded-full flex items-center"><Star size={10} className="mr-1"/>Premium</span>
          )}
        </button>
        <button
          onClick={generateHTMLReport}
         disabled={!hasAccessTo(Feature.AdvancedReporting)}
          className="w-full p-3 bg-teal-100 text-teal-800 rounded-xl font-semibold hover:bg-teal-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed relative"
         >
          <FileText size={18} className="mr-2" />
          {t('settings.generateHtml')}
           {!hasAccessTo(Feature.AdvancedReporting) && (
            <span className="absolute top-1 right-2 text-xs font-bold bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded-full flex items-center"><Star size={10} className="mr-1"/>Premium</span>
          )}
        </button>
      </div>
    </div>
  );
};

export default DataManagement;
