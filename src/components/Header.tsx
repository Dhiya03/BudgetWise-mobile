import React from 'react';
import { Download, FileSpreadsheet, Settings, Star } from 'lucide-react';
import { SupportedLanguage } from '../types';
import { hasAccessTo, Feature } from '../subscriptionManager';
import { formatCurrency } from '../utils/formatting';

interface HeaderProps {
  stats: {
    balance: number;
    totalExpenses: number;
    customBudgetSpent: number;
  };
  currentYear: number;
  currentMonth: number;
  onSetShowExportModal: (show: boolean) => void;
  onQuickCSVExport: () => void;
  onSetActiveTab: (tab: string) => void;
  onSetCurrentMonth: (month: number) => void;
  onSetCurrentYear: (year: number) => void;
  t: (key: string, fallback?: string) => string;
  language: SupportedLanguage;
}

const Header: React.FC<HeaderProps> = ({
  stats,
  currentYear,
  currentMonth,
  onSetShowExportModal,
  onQuickCSVExport,
  onSetActiveTab,
  onSetCurrentMonth,
  onSetCurrentYear,
  t,
  language,
}) => {
  return (
    <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 pb-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t('header.title', 'BudgetWise')}</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => onSetShowExportModal(true)}
            disabled={!hasAccessTo(Feature.AdvancedReporting)}
            className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative group"
            title={t('header.tooltip.advancedExport')}
          >
            <Download size={20} />
            {!hasAccessTo(Feature.AdvancedReporting) && (
              <Star size={10} className="absolute -top-1 -right-1 text-yellow-300 fill-yellow-300" />
            )}
          </button>
          <button
            onClick={onQuickCSVExport}
            className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            title={t('header.tooltip.quickExport')}
          >
            <FileSpreadsheet size={20} />
          </button>
          <button
            onClick={() => onSetActiveTab('settings')}
            className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            title={t('header.tooltip.settings')}
          >
            <Settings size={20} />
          </button>
        </div>
      </div>
      
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="bg-white/20 rounded-xl p-3">
          <p className="text-sm opacity-90">{t('header.monthlyBalance', 'Monthly Balance')}</p>
          <p className="text-xl font-bold">{formatCurrency(stats.balance, language)}</p>
        </div>
        <div className="bg-white/20 rounded-xl p-3">
          <p className="text-sm opacity-90">{t('header.monthlySpent', 'Monthly Spent')}</p>
          <p className="text-xl font-bold">{formatCurrency(stats.totalExpenses, language)}</p>
        </div>
      </div>

      {stats.customBudgetSpent > 0 && (
        <div className="mt-3 bg-white/20 rounded-xl p-3">
          <p className="text-sm opacity-90">{t('header.customBudgetsSpent', 'Custom Budgets Spent')}</p>
          <p className="text-xl font-bold">{formatCurrency(stats.customBudgetSpent, language)}</p>
        </div>
      )}

      <div className="mt-4 flex items-center justify-center space-x-4">
        <button
          onClick={() => {
            const newMonth = currentMonth === 0 ? 11 : currentMonth - 1;
            const newYear = currentMonth === 0 ? currentYear - 1 : currentYear;
            onSetCurrentMonth(newMonth);
            onSetCurrentYear(newYear);
          }}
          className="p-2 bg-white/20 rounded-lg"
        >
          ←
        </button>
        <span className="font-semibold">
          {new Date(currentYear, currentMonth).toLocaleDateString(language, { month: 'long', year: 'numeric' })}
        </span>
        <button
          onClick={() => {
            const newMonth = currentMonth === 11 ? 0 : currentMonth + 1;
            const newYear = currentMonth === 11 ? currentYear + 1 : currentYear;
            onSetCurrentMonth(newMonth);
            onSetCurrentYear(newYear);
          }}
          className="p-2 bg-white/20 rounded-lg"
        >
          →
        </button>
      </div>
    </div>
  );
};

export default Header;
