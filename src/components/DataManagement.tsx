import React, { useRef, useMemo } from 'react';
import { FileJson, FileSpreadsheet, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { getCategoryInsights, getFinancialHealthScore, getCashFlowAnalysis, getSpendingPersonality, getDailySpendingStreak, getFinancialRunway } from '../utils/analytics';

import {
  Transaction,
  MonthlyBudgets,
  CustomBudget,
  BudgetTemplate,
  BudgetRelationship,
  BillReminder,
  TransferEvent,
} from '../types';

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
  setRecurringProcessingMode: React.Dispatch<React.SetStateAction<'automatic' | 'manual'>>;

  showConfirmation: (title: string, message: string, onConfirm: () => void | Promise<void>) => void;
  getCustomBudgetName: (id: number | null) => string;
  savingsGoal: number;
  analyticsTimeframe: string;
  dailySpendingGoal: number;
}

const DataManagement: React.FC<DataManagementProps> = (props) => {
  const {
    transactions, budgets, customBudgets, categories, budgetTemplates,
    budgetRelationships, billReminders, transferLog, recurringProcessingMode,
    currentYear, currentMonth,
    setTransactions, setBudgets, setCustomBudgets, setCategories,
    setBudgetTemplates, setBudgetRelationships, setBillReminders,
    setTransferLog, setRecurringProcessingMode, showConfirmation, getCustomBudgetName,
    savingsGoal, dailySpendingGoal, analyticsTimeframe
  } = props;

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Analytics Calculations
  const healthScore = useMemo(() => getFinancialHealthScore(transactions, analyticsTimeframe, getCustomBudgetName), [transactions, analyticsTimeframe, getCustomBudgetName]);
  const cashFlow = useMemo(() => getCashFlowAnalysis(transactions, analyticsTimeframe, budgets, savingsGoal), [transactions, analyticsTimeframe, budgets, savingsGoal]);
  const categoryInsights = useMemo(() => getCategoryInsights(transactions, analyticsTimeframe, getCustomBudgetName), [transactions, analyticsTimeframe, getCustomBudgetName]);
  const personality = useMemo(() => getSpendingPersonality(transactions), [transactions]);
  const streak = useMemo(() => getDailySpendingStreak(transactions, dailySpendingGoal), [transactions, dailySpendingGoal]);
  const runway = useMemo(() => getFinancialRunway(transactions), [transactions]);


  const getSpentAmount = (category: string, year: number, month: number) => {
    return transactions
      .filter(t => {
        const transactionDate = new Date(t.date);
        return t.category === category && t.amount < 0 && (t.budgetType === 'monthly' || !t.budgetType) &&
               transactionDate.getFullYear() === year && transactionDate.getMonth() === month;
      })
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  };

  const getRemainingBudget = (category: string, year: number, month: number) => {
    const budget = budgets[category] || 0;
    const spent = getSpentAmount(category, year, month);
    return budget - spent;
  };

  const processRestoredData = (jsonString: string) => {
    try {
      const restoredState = JSON.parse(jsonString);

      if (!restoredState.transactions || !restoredState.budgets) {
          throw new Error("Invalid backup file format.");
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
      alert('Data restored successfully!');
    } catch (error) {
      console.error("Failed to restore data:", error);
      alert(`Error restoring data: ${(error as Error).message}. Please ensure you are using a valid backup file.`);
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
        alert("Failed to read file content.");
      }
    };
    reader.readAsText(file);

    if (fileInput) {
      fileInput.value = '';
    }
  };

  const backupData = () => {
    showConfirmation('Backup Data', 'Do you want to create a backup file of all your data?', async () => {
      const stateToBackup = { transactions, budgets, customBudgets, categories, budgetTemplates, budgetRelationships, billReminders, transferLog, recurringProcessingMode };
      const dataStr = JSON.stringify(stateToBackup, null, 2);
      const filename = `budgetwise_backup_${new Date().toISOString().split('T')[0]}.json`;

      if (Capacitor.isNativePlatform()) {
        try {
          await Filesystem.writeFile({
            path: filename,
            data: dataStr,
            directory: Directory.Documents,
            encoding: Encoding.UTF8,
          });
          alert(`Backup saved to your device's Documents folder: ${filename}`);
        } catch (e) {
          console.error('Unable to write file', e);
          alert(`Error saving backup: ${(e as Error).message}`);
        }
      } else {
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      }
    });
  };

  const triggerRestore = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await FilePicker.pickFiles({ types: ['application/json'], readData: true });
        const file = result.files[0];
        if (file && file.data) {
          const jsonString = atob(file.data); // Data is base64 encoded
          processRestoredData(jsonString);
        }
      } catch (e) {
        console.log('File picker was cancelled or failed.', e);
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleRestore = (event: React.MouseEvent<HTMLLabelElement>) => {
    event.preventDefault();
    showConfirmation(
      'Confirm Restore',
      'Are you sure you want to restore? This will overwrite all current data.',
      triggerRestore
    );
  };

  const exportToExcel = () => {
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
      const transactionSheet = XLSX.utils.json_to_sheet(transactionData);

      const monthlyBudgetsData = categories.map(cat => ({
        Category: cat,
        Budget: budgets[cat] || 0,
        Spent: getSpentAmount(cat, currentYear, currentMonth),
        Remaining: getRemainingBudget(cat, currentYear, currentMonth),
      }));
      const monthlyBudgetSheet = XLSX.utils.json_to_sheet(monthlyBudgetsData);

      const customBudgetsData = customBudgets.map(b => ({
        Name: b.name,
        'Total Amount': b.totalAmount,
        'Spent Amount': b.spentAmount,
        'Remaining Amount': b.remainingAmount,
        Status: b.status,
        Deadline: b.deadline || 'N/A',
      }));
      const customBudgetSheet = XLSX.utils.json_to_sheet(customBudgetsData);

      const transferLogData = transferLog.map(t => ({
        Date: new Date(t.date).toLocaleString(),
        Amount: t.amount,
        'From Budget': getCustomBudgetName(t.fromBudgetId),
        'From Category': t.fromCategory,
        'To Budget': getCustomBudgetName(t.toBudgetId),
        'To Category Allocations': JSON.stringify(t.toCategoryAllocations),
      }));
      const transferLogSheet = XLSX.utils.json_to_sheet(transferLogData);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, transactionSheet, 'Transactions');
      XLSX.utils.book_append_sheet(wb, monthlyBudgetSheet, 'Monthly Budgets');
      XLSX.utils.book_append_sheet(wb, customBudgetSheet, 'Custom Budgets');
      XLSX.utils.book_append_sheet(wb, transferLogSheet, 'Fund Transfers');

      if (Capacitor.isNativePlatform()) {
        const data = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
        Filesystem.writeFile({
          path: filename,
          data: data,
          directory: Directory.Documents,
        }).then(() => {
          alert(`Excel report saved to Documents: ${filename}`);
        }).catch((e: any) => {
          alert(`Error saving Excel file: ${(e as Error).message}`);
        });
      } else {
        XLSX.writeFile(wb, filename);
      }
    } catch (error) {
      console.error("Failed to export to Excel", error);
      alert("An error occurred while exporting to Excel.");
    }
  };

  const generatePDFReport = () => {
    try {
      const doc = new jsPDF() as jsPDF & { lastAutoTable: { finalY: number } };
      const filename = `BudgetWise_Report_${new Date().toISOString().split('T')[0]}.pdf`;

      const healthScore = getFinancialHealthScore(transactions, analyticsTimeframe, getCustomBudgetName);
      const cashFlow = getCashFlowAnalysis(transactions, analyticsTimeframe, budgets, 15000);
      const categoryInsights = getCategoryInsights(transactions, analyticsTimeframe, getCustomBudgetName);

      const getScoreDescription = (score: number) => {
        if (score >= 75) return "Thriving";
        if (score >= 50) return "Caution";
        return "Action Needed";
      };

      const getHexColor = (tailwindColor: string) => {
        if (tailwindColor.includes('green')) return '#16a34a';
        if (tailwindColor.includes('yellow')) return '#ca8a04';
        if (tailwindColor.includes('red')) return '#dc2626';
        return '#000000';
      };

      // Title
      doc.setFontSize(18);
      doc.text('BudgetWise Financial Report', 14, 22);
      doc.setFontSize(11);
      doc.setTextColor(100);  
      doc.text(`Report for the last ${analyticsTimeframe} days, generated on: ${new Date().toLocaleDateString()}`, 14, 29);

      // Health Score
      doc.setFontSize(16);
      doc.text('Financial Health Score', 14, 45);
      doc.setFontSize(22);
      doc.setTextColor(getHexColor(healthScore.color));
      doc.text(`${healthScore.score} / 100`, 14, 55);
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text(`Status: ${getScoreDescription(healthScore.score)}`, 14, 62);
      doc.setTextColor(0);

      // Cash Flow Summary Table
      (doc as any).autoTable({
        startY: 70,
        head: [['Cash Flow & Preparedness', 'Amount']],
        body: [
           ['Total Income', `₹${cashFlow.totalIncome.toFixed(2)}`],
          ['Total Expenses', `₹${cashFlow.totalExpenses.toFixed(2)}`],
          ['Net Savings', `₹${cashFlow.savings.toFixed(2)}`],
          ['Financial Runway', isFinite(runway.runwayMonths) ? `${runway.runwayMonths} months` : '∞'],
       ],
        theme: 'striped',
        headStyles: { fillColor: [67, 72, 188] },
      });

      // Personal Habits Table
      (doc as any).autoTable({
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Personal Habits', 'Insight']],
        body: [
          ['Spending Personality', personality.personality],
          ['Daily Goal Streak', `${streak.streak} days under ₹${dailySpendingGoal}`],
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
        doc.setFontSize(16);
        doc.text('Goal Progress', 14, goalTableStartY);
        (doc as any).autoTable({
          startY: goalTableStartY + 2,
          head: [['Active Goals', 'Progress', '% Funded']],
          body: goalData,
          headStyles: { fillColor: [190, 70, 120] }, // Pink/Purple color
        });
      }

        // Top Spending Categories
      const insightsStartY = (doc as any).lastAutoTable.finalY + 15;
      doc.setFontSize(16);
      doc.text('Spending Insights', 14, insightsStartY);
      (doc as any).autoTable({
        startY: insightsStartY + 2,
        head: [['Top Spending Categories', 'Amount (₹)', 'Trend (%)']],
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
      doc.text('Recent Transactions', 14, transactionsStartY);
      (doc as any).autoTable({
        startY: transactionsStartY + 2,
        head: [['Date', 'Description', 'Category', 'Amount (₹)']],
        body: transactionData,
        headStyles: { fillColor: [217, 119, 6] },
      });

      if (Capacitor.isNativePlatform()) {
        const pdfData = doc.output("datauristring").split(",")[1];
        Filesystem.writeFile({
          path: filename,
          data: pdfData,
          directory: Directory.Documents,
        }).then(() => {
          alert(`PDF report saved to Documents: ${filename}`);
        }).catch((e: any) => {
          alert(`Error saving PDF: ${(e as Error).message}`);
        });
      } else {
        doc.save(filename);
      }
    } catch (error) {
      console.error("Failed to generate PDF report", error);
      alert("An error occurred while generating the PDF report.");
    }
  };

  const generateHTMLReport = () => {
    const getScoreDescription = (score: number) => {
      if (score >= 75) return { text: "Thriving", color: "#10B981" };
      if (score >= 50) return { text: "Caution", color: "#F59E0B" };
      return { text: "Action Needed", color: "#EF4444" };
    };

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
            <h1>BudgetWise Financial Report</h1>
            <p>For the last ${analyticsTimeframe} days, generated on ${new Date().toLocaleDateString()}</p>
          </div>

          <div class="section">
            <h2>Financial Health Score</h2>
            <div class="health-score">
              <div class="health-score-value">${healthScore.score}</div>
              <div class="health-score-desc">${scoreDescription.text}</div>
            </div>
          </div>

          <div class="section">
            <h2>Cash Flow & Preparedness</h2>
            <div class="grid">
              <div class="card">
                <div class="card-title">Total Income</div>
                <div class="card-value positive">₹${cashFlow.totalIncome.toFixed(0)}</div>
              </div>
              <div class="card">
                <div class="card-title">Total Expenses</div>
                <div class="card-value negative">₹${cashFlow.totalExpenses.toFixed(0)}</div>
              </div>
              <div class="card">
                <div class="card-title">Net Savings</div>
                <div class="card-value ${cashFlow.savings >= 0 ? 'positive' : 'negative'}">₹${cashFlow.savings.toFixed(0)}</div>
              </div>
              
<div class="card">
                <div class="card-title">Financial Runway</div>
                <div class="card-value">${isFinite(runway.runwayMonths) ? `${runway.runwayMonths} months` : '∞'}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <h2>Your Habits</h2>
            <div class="grid">
              <div class="card">
                <div class="card-title">Spending Personality</div>
                <div class="card-value">${personality.personality}</div>
                <p style="font-size: 0.8em; color: #6b7280;">${personality.insight}</p>
              </div>
              <div class="card">
                <div class="card-title">Daily Goal Streak</div>
                <div class="card-value">${streak.streak} Days</div>
                <p style="font-size: 0.8em; color: #6b7280;">Under ₹${dailySpendingGoal} / day</p>
              </div>
            </div>
          </div>

          <div class="section">
            <h2>Goal Progress</h2>
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
            }).join('') || '<p>No active goals to display.</p>'} 
          </div>

          <div class="section">
            <h2>Smart Category Breakdown</h2>
            <table class="table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Total Spending</th>
                  <th>Trend (%)</th>
                  <th>Largest Transaction</th>
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
                      ${insight.largestTransaction ? `₹${Math.abs(insight.largestTransaction.amount).toFixed(0)}${insight.largestTransaction.description ? ` - ${insight.largestTransaction.description}` : ''}` : 'N/A'}
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
    if (Capacitor.isNativePlatform()) {
      Filesystem.writeFile({
        path: filename,
        data: reportHTML,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      }).then(() => {
        alert(`HTML report saved to Documents: ${filename}`);
      }).catch((e: any) => {
        console.error('HTML report generation failed:', e);
        alert(`Report generation failed: ${(e as Error).message}`);
      });
    } else {
      const blob = new Blob([reportHTML], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Data Management</h2>
      <div className="space-y-3">
        <button
          onClick={backupData}
          className="w-full p-3 bg-blue-100 text-blue-800 rounded-xl font-semibold hover:bg-blue-200 flex items-center justify-center"
        >
          <FileJson size={18} className="mr-2" />
          Backup Data (JSON)
        </button>
        <div>
          <label
            onClick={handleRestore}
            className="w-full text-center p-3 bg-blue-100 text-blue-800 rounded-xl font-semibold hover:bg-blue-200 flex items-center justify-center cursor-pointer"
          >
            <FileJson size={18} className="mr-2" />
            Restore from Backup
            <input type="file" accept=".json" ref={fileInputRef} onChange={handleFileSelectedFromWeb} className="hidden" />
          </label>
        </div>
        <button
          onClick={exportToExcel}
          className="w-full p-3 bg-green-100 text-green-800 rounded-xl font-semibold hover:bg-green-200 flex items-center justify-center"
        >
          <FileSpreadsheet size={18} className="mr-2" />
          Export to Excel
        </button>
        <button
          onClick={generatePDFReport}
          className="w-full p-3 bg-red-100 text-red-800 rounded-xl font-semibold hover:bg-red-200 flex items-center justify-center"
        >
          <FileText size={18} className="mr-2" />
          Generate PDF Report
        </button>
        <button
          onClick={generateHTMLReport}
          className="w-full p-3 bg-teal-100 text-teal-800 rounded-xl font-semibold hover:bg-teal-200 flex items-center justify-center"
        >
          <FileText size={18} className="mr-2" />
          Generate HTML Report
        </button>
      </div>
    </div>
  );
};

export default DataManagement;
