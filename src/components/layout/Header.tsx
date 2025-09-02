import React from 'react';
import { Download, Upload, Settings, ArrowLeft, ArrowRight } from 'lucide-react';

interface HeaderProps {
  stats: {
    balance: number;
    totalExpenses: number;
    customBudgetSpent: number;
  };
  setShowExportModal: (show: boolean) => void;
  quickCSVExport: () => void;
  setActiveTab: (tab: string) => void;
  currentMonth: number;
  currentYear: number;
  setCurrentMonth: (month: number) => void;
  setCurrentYear: (year: number) => void;
}

const Header: React.FC<HeaderProps> = ({
  stats,
  setShowExportModal,
  quickCSVExport,
  setActiveTab,
  currentMonth,
  currentYear,
  setCurrentMonth,
  setCurrentYear,
}) => {
  return (
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
            title="Quick CSV Export (All Data)"
          >
            <Upload size={20} />
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
          <ArrowLeft size={16} />
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
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default Header;
